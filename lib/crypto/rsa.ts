// ===============================================================
// LOGICKÉ KROKY – RSA „full solve“ (faktorizácia + dešifrovanie)
// ===============================================================
//
// 0) Na vstupe mám (n, e, y). Cieľ: z y získať m = y^d mod n.
//    -> KDE V KÓDE: solveRSA(nStr, eStr, yStr, timeLimitMs)
//
// 1) Rozložím n na p * q (semiprvočíslo).
//    - najprv skúsim malé delitele (trial division),
//    - potom Pollard Rho s reštartmi a Miller–Rabin testom prvočíselnosti.
//    -> KDE V KÓDE: factorSemiprime(n, timeLimitMs)
//         ↳ trialDivision(n)
//         ↳ pollardRho(n, maxIters)
//         ↳ isProbablePrime(n)  (Miller–Rabin)
//
// 2) Z usporiadaných p ≤ q spočítam φ(n) = (p-1)(q-1).
//    -> KDE V KÓDE: solveRSA(...)
//       const phi = (P - 1n) * (Q - 1n);
//
// 3) Spočítam privátny exponent d = e^{-1} mod φ(n).
//    -> KDE V KÓDE: modInv(e, phi)  (rozšírený Euklid egcd)
//
// 4) Dešifrujem m = y^d mod n (modulárna exponenciácia).
//    -> KDE V KÓDE: modPow(y, d, n)
//
// 5) Vráti sa výsledok (ok/false, dôvod, p, q, φ, d, m, meraný čas).
//    -> KDE V KÓDE: návratová hodnota solveRSA(...)
//
// POZNÁMKY:
// - isProbablePrime() používa pevné bázy Miller–Rabin (dostatočné pre malé/ stredné n).
// - pollardRho() mení konštantu c a reštartuje po maxIters; pri limite vráti null vyššie.
// - modInv() zlyhá, ak gcd(e, φ) ≠ 1 (nesprávny e alebo zdegenerované n).
// ===============================================================

// BigInt RSA utils: Miller–Rabin, Pollard Rho, inv mod, pow mod, full solve
// n = p*q (semiprime). Works well up to ~128–160 bit n in practice (depends).

import { primeSync } from 'bigint-crypto-utils';

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

/** isProbablePrime(n): Pravdepodobnostný test prvočíselnosti (Miller–Rabin + malé p). */
export function isProbablePrime(n: bigint): boolean {
    if (n < 2n) return false;
    const smallPrimes = [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n];
    for (const p of smallPrimes) {
        if (n === p) return true;
        if (n % p === 0n) return false;
    }
    const { d, s } = mrDecompose(n);
    // Deterministické bázy pre 64-bit; pre väčšie n pár silných báz postačí v praxi:
    const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 23n, 29n, 31n, 37n];
    for (const a of bases) {
        if (a % n === 0n) return true;
        if (!mrCheck(a, n, d, s)) return false;
    }
    return true;
}

// ---------- Pollard Rho ----------

/** fPoly(x,c): Kvadratické zobrazenie (x^2 + c) mod n pre Pollard Rho. */
function fPoly(x: bigint, c: bigint, mod: bigint): bigint {
    return (x * x + c) % mod;
}

/** pollardRho(n): Hľadá netriviálny deliteľ n; vracia d|n, alebo -1 pri kolapse. */
export function pollardRho(n: bigint, maxIters = 1_000_000): bigint {
    if ((n & 1n) === 0n) return 2n;
    let x = 2n, y = 2n, d = 1n, c = 1n;
    let iter = 0;
    while (d === 1n) {
        x = fPoly(x, c, n);
        y = fPoly(fPoly(y, c, n), c, n);
        d = gcd((x > y ? x - y : y - x), n);
        iter++;
        if (iter > maxIters) {
            // zmeň konštantu a reštartuj
            c = (c + 1n) % n;
            x = 2n; y = 2n; d = 1n; iter = 0;
        }
    }
    if (d === n) return -1n;
    return d;
}

/** trialDivision(n): Rýchly test na malé delitele (malá sada prvočísel). */
function trialDivision(n: bigint): bigint | null {
    for (const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n,41n,43n,47n,53n,59n,61n,67n,71n,73n,79n,83n,89n,97n]) {
        if (n % p === 0n) return p;
    }
    return null;
}

/**
 * fermatFactorization(n, maxIterations):
 * - Fermatova faktorizácia - funguje dobre keď sú p a q blízko seba
 * - Hľadá a, b také že n = a^2 - b^2 = (a-b)(a+b)
 */
function fermatFactorization(n: bigint, maxIterations = 10_000_000): Factorization | null {
    if (n % 2n === 0n) return { p: 2n, q: n / 2n };

    let a = sqrt(n) + 1n;
    let b2 = a * a - n;

    for (let i = 0; i < maxIterations; i++) {
        const b = sqrt(b2);
        if (b * b === b2) {
            const p = a - b;
            const q = a + b;
            if (p * q === n && p > 1n && q > 1n) {
                return { p, q };
            }
        }
        a += 1n;
        b2 = a * a - n;
    }

    return null;
}

// Integer square root pomocou Newton's method
function sqrt(n: bigint): bigint {
    if (n < 0n) return 0n;
    if (n < 2n) return n;

    let x0 = n;
    let x1 = (x0 + 1n) / 2n;

    while (x1 < x0) {
        x0 = x1;
        x1 = (x0 + n / x0) / 2n;
    }

    return x0;
}

/**
 * factorSemiprime(n, timeLimitMs):
 * - Pokúsi sa rozložiť n = p*q:
 *   1) small trial division,
 *   2) Pollard Rho + Miller–Rabin, s reštartmi (zmena c) do časového limitu.
 * - Vracia {p,q} alebo null pri vypršaní limitu.
 */
export function factorSemiprime(n: bigint, timeLimitMs = 4000): Factorization | null {
    if (n <= 1n) return null;
    const t0 = Date.now();

    // small trial
    const td = trialDivision(n);
    if (td) return { p: td, q: n / td };

    // rho loop (with restarts)
    for (;;) {
        if (Date.now() - t0 > timeLimitMs) return null;
        const d = pollardRho(n, 500_000);
        if (d === -1n || d === 1n) continue;
        const p = isProbablePrime(d) ? d : null;
        const q = isProbablePrime(n / d) ? n / d : null;
        if (p && q) return { p, q };
        // ak je jedna strana zložená, skús ju rozdeliť znovu
        const left = p ? p : d;
        const right = p ? n / p : n / d;
        const a = isProbablePrime(left) ? left : (factorSemiprime(left, timeLimitMs) as any)?.p;
        const bWhole = right;
        if (!a) continue;
        const b = bWhole / a;
        if (a && b && a * b === n) return { p: a, q: b };
    }
}

/**
 * factorSemiprimeAdvanced(n, timeLimitMs):
 * - Pre väčšie čísla používa kombináciu metód:
 *   1) Trial division s väčším počtom prvočísel
 *   2) Fermatova faktorizácia (ak sú p, q blízko)
 *   3) Pollard Rho
 */
export function factorSemiprimeAdvanced(n: bigint, timeLimitMs = 30000): Factorization | null {
    if (n <= 1n) return null;
    const t0 = Date.now();

    // 1) Extended trial division
    const td = trialDivision(n);
    if (td) return { p: td, q: n / td };

    // 2) Skús Fermatovu faktorizáciu (funguje dobre ak sú p a q blízko)
    if (Date.now() - t0 < timeLimitMs) {
        const fermat = fermatFactorization(n, 1_000_000);
        if (fermat) {
            const { p, q } = fermat;
            if (isProbablePrime(p) && isProbablePrime(q)) {
                return { p, q };
            }
        }
    }

    // 3) Pollard Rho s dlhším limitom
    for (;;) {
        if (Date.now() - t0 > timeLimitMs) return null;
        const d = pollardRho(n, 1_000_000);
        if (d === -1n || d === 1n) continue;
        const p = isProbablePrime(d) ? d : null;
        const q = isProbablePrime(n / d) ? n / d : null;
        if (p && q) return { p, q };
    }
}

// ---------- Solve full RSA instance ----------

/**
 * solveRSA(nStr, eStr, yStr, timeLimitMs, useAdvanced):
 * - Orchestrácia: faktorizácia n -> p,q; výpočet φ, d; dešifrovanie y^d mod n.
 * - useAdvanced: ak true, použije pokročilé metódy pre väčšie čísla
 * - Vracia štruktúru s p, q, φ(n), d, m a meraným časom, alebo dôvod neúspechu.
 */
export function solveRSA(
    nStr: string,
    eStr: string,
    yStr: string,
    timeLimitMs = 5000,
    useAdvanced = false
): RSASolve {
    const n = BigInt(nStr), e = BigInt(eStr), y = BigInt(yStr);
    const t0 = Date.now();
    try {
        // Pre malé čísla použij základný algoritmus, pre veľké pokročilý
        const fac = useAdvanced
            ? factorSemiprimeAdvanced(n, timeLimitMs)
            : factorSemiprime(n, timeLimitMs);

        if (!fac) return {
            ok: false,
            reason: "Faktorizácia prekročila časový limit.",
            n, e, y,
            timeMs: Date.now() - t0,
            method: useAdvanced ? 'advanced' : 'basic'
        };

        const { p, q } = fac;
        // ensure p<q
        const P = p < q ? p : q, Q = p < q ? q : p;
        const phi = (P - ONE) * (Q - ONE);
        const d = modInv(e, phi);
        const m = modPow(y, d, n);
        return {
            ok: true,
            n, e, y,
            p: P, q: Q, phi, d, m,
            timeMs: Date.now() - t0,
            method: useAdvanced ? 'advanced' : 'basic'
        };
    } catch (err: any) {
        return {
            ok: false,
            reason: err?.message || "Neznáma chyba",
            n, e, y,
            timeMs: Date.now() - t0,
            method: useAdvanced ? 'advanced' : 'basic'
        };
    }
}
