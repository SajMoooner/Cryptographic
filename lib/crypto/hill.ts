// ===============================================================
// LOGICKÉ KROKY – čo sa deje pri prefixe“(Hill 3×3)
// ===============================================================
// 0) Vstupy očistíme na A–Z (bez medzier a interpunkcie).
// 1) Zoberieme prvých 9 písmen prefixu (plaintext) a prvých 9 písmen šifry. (recoverKey3x3FromPrefix)
// 2) Z týchto 9+9 písmen zostavíme dve 3×3 matice po STĹPcoch: P a C. (text9toMatCols)
//    - 1. trigram (znaky 0..2) = 1. stĺpec, 2. trigram = 2. stĺpec, 3. trigram = 3. stĺpec.
// 3) Spočítame inverziu P modulo 26 → P^{-1}. (recoverKey3x3FromPrefix)
// 4) Vyrátame kľúčovú maticu K = C * P^{-1} (mod 26). (recoverKey3x3FromPrefix)
// 5) Vypočítame inverziu K modulo 26 → K^{-1}. (decryptHill3x3)
// 6) Celý ciphertext rozdelíme na trigramy a dešifrujeme: P = K^{-1} * C (mod 26). (decryptHill3x3)
// 7) Vrátime kľúč K (3×3 čísla 0..25) a dešifrovaný plaintext (A–Z).
// ===============================================================

const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const Acode = "A".charCodeAt(0);

/**
 * mod(n, m): Bezpečný modulo pre záporné aj kladné n.
 * - Použitie: všetky aritmetiky nad abecedou a maticami robíme mod 26.
 */
const mod = (n: number, m = 26) => ((n % m) + m) % m;

/**
 * mapAZtoNums(s): Prevod písmen A..Z na čísla 0..25.
 * - Načo: Hill pracuje s číselnou reprezentáciou.
 */
export function mapAZtoNums(s: string) {
    return Array.from(s).map(ch => ch.charCodeAt(0) - Acode);
}

/**
 * mapNumstoAZ(arr): Prevod 0..25 späť na písmená A..Z (mod 26).
 * - Načo: Výsledné vektory z dešifrovania chceme ako text.
 */
export function mapNumstoAZ(arr: number[]) {
    return arr.map(v => String.fromCharCode(Acode + mod(v, 26)));
}

/**
 * onlyAZ(s): Vyhodí všetko okrem veľkých písmen A..Z.
 * - Načo: Hill predpokladá abecedu 0..25 bez iných znakov.
 */
export function onlyAZ(s: string) {
    let out = "";
    for (const ch of s) if (ch >= "A" && ch <= "Z") out += ch;
    return out;
}

// --- 3x3 matice (int, mod 26) ---
type Mat = number[][]; // 3x3

/**
 * mat3(m): Vytvorí „pevne“ 3×3 maticu z dodaného 3×3 poľa.
 * - Načo: Drobná poistka, že držíme 3×3 tvar.
 */
function mat3(m: number[][]): Mat {
    return [
        [m[0][0], m[0][1], m[0][2]],
        [m[1][0], m[1][1], m[1][2]],
        [m[2][0], m[2][1], m[2][2]],
    ];
}

/**
 * egcd(a,b): Rozšírený Euklidov algoritmus.
 * - Načo: Nájdeme x,y tak, že ax + by = gcd(a,b). Potrebné pre modInv.
 * - Výstup: [x, y, gcd(a,b)].
 */
function egcd(a: number, b: number): [number, number, number] {
    if (b === 0) return [1, 0, a];
    const [x, y, g] = egcd(b, a % b);
    return [y, x - Math.floor(a / b) * y, g];
}

/**
 * modInv(a, 26): Modulárna inverzia čísla a modulo 26.
 * - Načo: Potrebná pri inverzii determinantu a matice.
 * - Padá chybou, ak gcd(a,26) ≠ 1 (t.j. inverzia neexistuje).
 */
function modInv(a: number, m = 26) {
    a = mod(a, m);
    const [x, , g] = egcd(a, m);
    if (g !== 1) throw new Error("Determinant nemá inverziu mod 26.");
    return mod(x, m);
}

/**
 * det3(M): Determinant 3×3 matice nad celými číslami (pred redukciou mod 26).
 * - Načo: Potrebný pre inverziu matice.
 */
function det3(M: Mat) {
    const [a,b,c] = M[0];
    const [d,e,f] = M[1];
    const [g,h,i] = M[2];
    return a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g);
}

/**
 * adjugate3(M): Adjungovaná matica (transponovaná matica kofaktorov).
 * - Načo: mat^{-1} = det^{-1} * adj(M) (mod 26).
 */
function adjugate3(M: Mat): Mat {
    const [a,b,c] = M[0];
    const [d,e,f] = M[1];
    const [g,h,i] = M[2];
    // kofaktory (bez transpozície):
    const C00 =  (e*i - f*h);
    const C01 = -(d*i - f*g);
    const C02 =  (d*h - e*g);

    const C10 = -(b*i - c*h);
    const C11 =  (a*i - c*g);
    const C12 = -(a*h - b*g);

    const C20 =  (b*f - c*e);
    const C21 = -(a*f - c*d);
    const C22 =  (a*e - b*d);

    // adj(M) = cof(M)^T
    return [
        [C00, C10, C20],
        [C01, C11, C21],
        [C02, C12, C22],
    ];
}

/**
 * matMul3(A,B): Násobenie dvoch 3×3 matíc modulo 26.
 * - Načo: Pre výpočet K = C * P^{-1} aj pri inverzii.
 */
function matMul3(A: Mat, B: Mat): Mat {
    const R: Mat = [[0,0,0],[0,0,0],[0,0,0]];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            let s = 0;
            for (let k = 0; k < 3; k++) s += A[r][k] * B[k][c];
            R[r][c] = mod(s, 26);
        }
    }
    return R;
}

/**
 * matVec3(A,v): Násobenie 3×3 matice s vektorom dĺžky 3 modulo 26.
 * - Načo: Dešifrovanie bloku (trigramu) – aplikácia K^{-1} na vektor C.
 */
function matVec3(A: Mat, v: number[]) {
    const out = new Array(3).fill(0);
    for (let r = 0; r < 3; r++) {
        out[r] = mod(A[r][0]*v[0] + A[r][1]*v[1] + A[r][2]*v[2], 26);
    }
    return out;
}

/**
 * matInv3(M): Inverzia 3×3 matice modulo 26.
 * - Postup: det := det3(M) mod 26, detInv := modInv(det),
 *           adj := adjugate3(M), R := (detInv * adj) mod 26.
 * - Padá chybou, ak determinant nemá modulárnu inverziu (gcd(det,26) ≠ 1).
 */
function matInv3(M: Mat): Mat {
    const det = mod(det3(M), 26);
    const detInv = modInv(det, 26);
    const adj = adjugate3(M);
    // (det^{-1} * adj) mod 26
    const R: Mat = [[0,0,0],[0,0,0],[0,0,0]];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R[r][c] = mod(detInv * adj[r][c], 26);
    return R;
}

/**
 * text9toMatCols(s9): Zo 9 písmen A–Z zostaví 3×3 maticu po STĹPcoch.
 * - Načo: Presne podľa Hillovho modelu (3 trigramy = 3 stĺpce).
 */
function text9toMatCols(s9: string): Mat {
    const v = mapAZtoNums(s9);
    const cols = [v.slice(0,3), v.slice(3,6), v.slice(6,9)];
    // stĺpce → matica 3x3
    return mat3([
        [cols[0][0], cols[1][0], cols[2][0]],
        [cols[0][1], cols[1][1], cols[2][1]],
        [cols[0][2], cols[1][2], cols[2][2]],
    ]);
}

/**
 * chunk3(s): Rozseká reťazec na bloky po 3 znakoch (trigramy).
 * - Načo: Hill (3×3) pracuje s dĺžkou bloku 3.
 */
function chunk3(s: string) {
    const out: string[] = [];
    for (let i = 0; i < s.length; i += 3) out.push(s.slice(i, i+3));
    return out;
}

// --- Verejné API ---

/**
 * recoverKey3x3FromPrefix(ciphertextAZ, prefix9):
 * - Vypočíta kľúčovú maticu K z prvých 9 písmen prefixu (P) a šifry (C):
 *   K = C * P^{-1} (mod 26).
 * - OČAKÁVA: ciphertextAZ = A–Z, prefix9 = presne 9 písmen A–Z.
 */
export function recoverKey3x3FromPrefix(ciphertextAZ: string, prefix9 = "DRAHYJURA") {
    if (prefix9.length !== 9) throw new Error("Prefix musí mať presne 9 písmen (3 trigramy).");
    if (ciphertextAZ.length < 9) throw new Error("Ciphertext je kratší než 9 znakov.");
    const P = text9toMatCols(prefix9);                      // Matica P 
    const C = text9toMatCols(ciphertextAZ.slice(0, 9));    // Matica C
    const Pinv = matInv3(P);                                 // P^{-1}         
    const K = matMul3(C, Pinv);                            // K = C * P^{-1} (mod 26)
    return K;
}

/**
 * decryptHill3x3(ciphertextAZ, K):
 * - Dešifruje celý A–Z ciphertext daným kľúčom K:
 *   P = K^{-1} * C (mod 26) po trigramoch.
 * - Bezpečnostná poistka: ak dĺžka nie je násobkom 3, doplní sa 'X' padding
 *   len na účely výpočtu (Hill potrebuje bloky po 3).
 */
export function decryptHill3x3(ciphertextAZ: string, K: Mat): string {
    const Kinv = matInv3(K);

    // padding na násobok 3 (iba pre výpočet)
    let cAZ = ciphertextAZ;
    const rem = cAZ.length % 3;
    if (rem !== 0) cAZ += "X".repeat(3 - rem);

    const blocks = chunk3(cAZ);
    const out: string[] = [];
    for (const b of blocks) {
        const v = mapAZtoNums(b);
        const p = matVec3(Kinv, v);
        out.push(...mapNumstoAZ(p));
    }
    return out.join("");
}

/**
 * solveAndDecryptWithKnownPrefix(ciphertext, prefixFull):
 * - Orchestruje celý postup:
 *   1) onlyAZ na ciphertext a prefix, z prefixu zoberie prvých 9 písmen,
 *   2) recoverKey3x3FromPrefix → K,
 *   3) decryptHill3x3 → plaintext A–Z,
 *   4) vráti K a plaintextAZ.
 */
export function solveAndDecryptWithKnownPrefix(ciphertext: string, prefixFull = "DRAHYJURAJ") {
    const cAZ = onlyAZ(ciphertext);
    const prefix9 = onlyAZ(prefixFull).slice(0, 9);     // prvých 9 písmen z prefixu 
    const K = recoverKey3x3FromPrefix(cAZ, prefix9);    // kľúčová matica 3x3
    const plaintextAZ = decryptHill3x3(cAZ, K);         // dešifrovaný plaintext A–Z
    return {
        key: K,
        plaintextAZ,
    };
}

// ===============================================================
/**

1.Očistí ciphertext a prefix na A–Z.

2.Zoberie prvých 9 písmen prefixu a prvých 9 písmen ciphertextu.

3.Z nich postaví dve 3×3 matice (P – plaintext, C – cipher) po trigramových stĺpcoch.

4.Spočíta P⁻¹ mod 26.

5.Vypočíta K = C · P⁻¹ (mod 26) → toto je kľúčová matica.

6.Spočíta K⁻¹ mod 26.

7.Rozseká celý ciphertext na trigramy.

8.Každý trigram prepočíta: P = K⁻¹ · C (mod 26).

9.Čísla 0–25 prevedie späť na písmená A–Z → zobrazí plaintext a kľúč.
 */