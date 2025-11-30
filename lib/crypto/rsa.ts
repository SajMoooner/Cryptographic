// ===============================================================
// RSA –  manuálny režim + knižničný režim
// ===============================================================
//
// 0) Na vstupe mám (n, e, y). Cieľ: z y získať m = y^d mod n.
//    -> solveRSA(nStr, eStr, yStr, timeLimitMs, useAdvanced)
//
// 1) Rozložím n = p * q (semiprvočíslo).
//    - BASIC: rýchle delenie malými číslami + obmedzená trial division + Pollard Rho.
//    - LIBRARY: rozšírená trial division + Fermat + Pollard Rho s randBetween/isProbablyPrime
//      z knižnice bigint-crypto-utils (npm).
//
// 2) φ(n) = (p-1)(q-1)
// 3) d = e^{-1} mod φ(n)
// 4) m = y^d mod n
//
// Návrat: ok/false + p, q, φ, d, m, čas a použitá metóda ("basic" | "library").

import * as bcu from "bigint-crypto-utils";

export type Factorization = { p: bigint; q: bigint };
export type RSASolve = {
    ok: boolean;
    reason?: string;
    n: bigint; e: bigint; y: bigint;
    p?: bigint; q?: bigint; phi?: bigint; d?: bigint; m?: bigint;
    timeMs: number;
    method?: string;
};

const ZERO = 0n, ONE = 1n, TWO = 2n;
const BASIC_TRIAL_LIMIT = 5_000_000n;     // manuálna trial division – dosť na prvé 3 úlohy
const LIBRARY_TRIAL_LIMIT = 50_000_000n;  // rozšírená trial division pre väčšie n

const absBigInt = (v: bigint) => (v < ZERO ? -v : v);

// ---------- basic math ----------

/** gcd(a,b): Najväčší spoločný deliteľ (Euklidov algoritmus). */
export function gcd(a: bigint, b: bigint): bigint {
    while (b !== ZERO) { const t = b; b = a % b; a = t; }
    return a < ZERO ? -a : a;
}

/** egcd(a,b): Rozšírený Euklid – vráti [x, y, g] tak, že ax + by = g = gcd(a,b). */
export function egcd(a: bigint, b: bigint): [bigint,bigint,bigint] {
    if (b === ZERO) return [ONE, ZERO, a];
    const [x,y,g] = egcd(b, a % b);
    return [y, x - (a / b) * y, g];
}

/** modInv(a,m): Modulárna inverzia a^{-1} mod m; vyhodí chybu, ak neexistuje. */
export function modInv(a: bigint, m: bigint): bigint {
    const [x, , g] = egcd((a % m + m) % m, m);
    if (g !== ONE) throw new Error("No modular inverse");
    return (x % m + m) % m;
}

/** modPow(base, exp, mod): Rýchla modulárna exponenciácia (square-and-multiply). */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let b = (base % mod + mod) % mod, e = exp, r = ONE;
    while (e > ZERO) {
        if (e & ONE) r = (r * b) % mod;
        b = (b * b) % mod;
        e >>= 1n;
    }
    return r;
}

// ---------- Miller–Rabin ----------

/** mrDecompose(n-1): Rozklad n-1 = d * 2^s pre Miller–Rabin test. */
function mrDecompose(n: bigint): {d: bigint, s: number} {
    let d = n - ONE, s = 0;
    while ((d & ONE) === ZERO) { d >>= 1n; s++; }
    return { d, s };
}

/** mrCheck(a,...): Jeden Miller–Rabin „witness“ test pre základ a. */
function mrCheck(a: bigint, n: bigint, d: bigint, s: number): boolean {
    let x = modPow(a, d, n);
    if (x === ONE || x === n - ONE) return true;
    for (let r = 1; r < s; r++) {
        x = (x * x) % n;
        if (x === n - ONE) return true;
    }
    return false;
}

/** isProbablePrime(n): Rýchly pravdepodobnostný test (Miller–Rabin + malé p). */
export function isProbablePrime(n: bigint): boolean {
    if (n < 2n) return false;
    const smallPrimes = [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n];
    for (const p of smallPrimes) {
        if (n === p) return true;
        if (n % p === 0n) return false;
    }
    const { d, s } = mrDecompose(n);
    const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 23n, 29n, 31n, 37n];
    for (const a of bases) {
        if (a % n === 0n) return true;
        if (!mrCheck(a, n, d, s)) return false;
    }
    return true;
}

// ---------- Trial division helpers ----------

/** trialDivision(n): Rýchly test na malé delitele (malá sada prvočísel). */
function trialDivision(n: bigint): bigint | null {
    for (const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n,41n,43n,47n,53n,59n,61n,67n,71n,73n,79n,83n,89n,97n]) {
        if (n % p === 0n) return p;
    }
    return null;
}

/** trialDivisionBounded: skúša delitele do limitu alebo sqrt(n), čo je menšie. */
function trialDivisionBounded(n: bigint, limit: bigint, deadline: number): bigint | null {
    if ((n & ONE) === ZERO) return TWO;
    const maxDivisor = (() => {
        const root = sqrt(n);
        return root < limit ? root : limit;
    })();

    for (let d = 3n; d <= maxDivisor; d += 2n) {
        if (Date.now() > deadline) return null;
        if (n % d === 0n) return d;
    }

    return null;
}

// ---------- Fermat + Pollard Rho ----------

/** fPoly(x,c): Kvadratické zobrazenie (x^2 + c) mod n pre Pollard Rho. */
function fPoly(x: bigint, c: bigint, mod: bigint): bigint {
    return (x * x + c) % mod;
}

/** pollardRhoRandomized: Pollard Rho s náhodným seedovaním a limitom. */
function pollardRhoRandomized(n: bigint, deadline: number, maxIters = 1_000_000): bigint | null {
    if ((n & ONE) === ZERO) return TWO;
    const rnd = (min: bigint, max: bigint) => bcu.randBetween(max, min);

    let x = rnd(2n, n - 2n);
    let y = x;
    let c = rnd(1n, n - 1n) || ONE;
    let d = ONE;
    let iter = 0;

    while (d === ONE) {
        if (Date.now() > deadline) return null;
        x = fPoly(x, c, n);
        y = fPoly(fPoly(y, c, n), c, n);
        d = gcd(absBigInt(x - y), n);
        iter++;
        if (iter > maxIters || d === n) {
            // reštart s novými seedmi
            x = rnd(2n, n - 2n);
            y = x;
            c = (c + ONE) % n || ONE;
            d = ONE;
            iter = 0;
        }
    }

    if (d === n) return null;
    return d;
}

/**
 * fermatFactorization(n, maxIterations, deadline):
 * - Fermatova faktorizácia - funguje dobre keď sú p a q blízko seba
 * - Hľadá a, b také že n = a^2 - b^2 = (a-b)(a+b)
 */
function fermatFactorization(n: bigint, maxIterations = 10_000_000, deadline?: number): Factorization | null {
    if (n % TWO === 0n) return { p: TWO, q: n / TWO };

    let a = sqrt(n) + ONE;
    let b2 = a * a - n;

    for (let i = 0; i < maxIterations; i++) {
        if (deadline && Date.now() > deadline) return null;
        const b = sqrt(b2);
        if (b * b === b2) {
            const p = a - b;
            const q = a + b;
            if (p * q === n && p > ONE && q > ONE) {
                return { p, q };
            }
        }
        a += ONE;
        b2 = a * a - n;
    }

    return null;
}

// Integer square root pomocou Newton's method
function sqrt(n: bigint): bigint {
    if (n < ZERO) return ZERO;
    if (n < TWO) return n;

    let x0 = n;
    let x1 = (x0 + ONE) / TWO;

    while (x1 < x0) {
        x0 = x1;
        x1 = (x0 + n / x0) / TWO;
    }

    return x0;
}

// ---------- Prime check via library (async) ----------

async function isProbablePrimeFast(n: bigint): Promise<boolean> {
    try {
        return await bcu.isProbablyPrime(n, 16);
    } catch {
        return isProbablePrime(n);
    }
}

// ---------- Faktorizácia ----------

/** BASIC: malé n, manuálne delenie + Pollard Rho. */
export async function factorSemiprimeBasic(n: bigint, timeLimitMs = 4000): Promise<Factorization | null> {
    if (n <= ONE) return null;
    const deadline = Date.now() + timeLimitMs;

    const td = trialDivision(n);
    if (td) return { p: td, q: n / td };

    const bounded = trialDivisionBounded(n, BASIC_TRIAL_LIMIT, deadline);
    if (bounded) return { p: bounded, q: n / bounded };

    while (Date.now() <= deadline) {
        const d = pollardRhoRandomized(n, deadline, 400_000);
        if (!d || d === n) continue;
        const p = isProbablePrime(d) ? d : null;
        const qCandidate = n / d;
        const q = p && isProbablePrime(qCandidate) ? qCandidate : null;
        if (p && q) return { p, q };
    }

    return null;
}

/** LIBRARY: väčšie n, viac trial division + Fermat + Pollard Rho s bigint-crypto-utils. */
export async function factorSemiprimeLibrary(n: bigint, timeLimitMs = 30000): Promise<Factorization | null> {
    if (n <= ONE) return null;
    const deadline = Date.now() + timeLimitMs;

    const td = trialDivision(n) ?? trialDivisionBounded(n, LIBRARY_TRIAL_LIMIT, deadline);
    if (td) return { p: td, q: n / td };

    const fermat = fermatFactorization(n, 2_000_000, deadline);
    if (fermat && await isProbablePrimeFast(fermat.p) && await isProbablePrimeFast(fermat.q)) {
        return fermat;
    }

    while (Date.now() <= deadline) {
        const d = pollardRhoRandomized(n, deadline, 900_000);
        if (!d || d === n) continue;
        const p = await isProbablePrimeFast(d) ? d : null;
        const qCandidate = n / d;
        const q = p && await isProbablePrimeFast(qCandidate) ? qCandidate : null;
        if (p && q) return { p, q };
    }

    return null;
}

// ---------- Solve full RSA instance ----------

/**
 * solveRSA(nStr, eStr, yStr, timeLimitMs, useAdvanced):
 * - useAdvanced => library režim (bigint-crypto-utils)
 * - otherwise základný rýchly režim
 */
export async function solveRSA(
    nStr: string,
    eStr: string,
    yStr: string,
    timeLimitMs = 5000,
    useAdvanced = false
): Promise<RSASolve> {
    const n = BigInt(nStr), e = BigInt(eStr), y = BigInt(yStr);
    const t0 = Date.now();
    try {
        const fac = useAdvanced
            ? await factorSemiprimeLibrary(n, timeLimitMs)
            : await factorSemiprimeBasic(n, timeLimitMs);

        if (!fac) return {
            ok: false,
            reason: "Faktorizácia prekročila časový limit.",
            n, e, y,
            timeMs: Date.now() - t0,
            method: useAdvanced ? 'library' : 'basic'
        };

        const { p, q } = fac;
        const P = p < q ? p : q, Q = p < q ? q : p;
        const phi = (P - ONE) * (Q - ONE);
        const d = modInv(e, phi);
        const m = modPow(y, d, n);
        return {
            ok: true,
            n, e, y,
            p: P, q: Q, phi, d, m,
            timeMs: Date.now() - t0,
            method: useAdvanced ? 'library' : 'basic'
        };
    } catch (err: any) {
        return {
            ok: false,
            reason: err?.message || "Neznáma chyba",
            n, e, y,
            timeMs: Date.now() - t0,
            method: useAdvanced ? 'library' : 'basic'
        };
    }
}
