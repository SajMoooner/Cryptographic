// ===============================================================
// RC4 prúdová šifra
// ===============================================================
// - Šifrovanie/dešifrovanie je rovnaká operácia: XOR s keystreamom.
// - RC4 má dva hlavné kroky:
//    1) KSA (Key Scheduling Algorithm):
//       - z 256-bajtového kľúča vytvorí poprehadzované pole S[0..255].
//    2) PRGA (Pseudo-Random Generation Algorithm):
//       - z poľa S generuje pseudonáhodný prúd bajtov (keystream).
// ===============================================================

export type Byte = number;
const MOD256 = 256;

/**
 * toKey256FromPass(pass):
 * - Prevedie 6-ciferné heslo (ako string) na 256-bajtový kľúč.
 * - Výsledkom je pole key[0..255], ktoré sa použije v RC4 KSA.
 * Heslo : "123456" → bytes = [49, 50, 51, 52, 53, 54]
 */

function toKey256FromPass(pass: string): Uint8Array {
    const key = new Uint8Array(256);
    const bytes = new TextEncoder().encode(pass); // heslo ako bajty bez NUL na konci
    let j = 0;

    for (let i = 0; i < 256; i++) {
        // simulácia passwd[j] v C, kde za reťazcom je NUL
        // j < bytes.length → reálny znak hesla
        // j >= bytes.length → správa sa ako '\0'
        const c = j < bytes.length ? bytes[j] : 0; 
        key[i] = c;

        if (c !== 0) {
            // ešte sme vo vnútri hesla → posuň sa na ďalší znak
            j++;
            // keď by sme sa dostali "za koniec" (teoretická poistka), vráť sa na začiatok
            if (j > bytes.length) j = 0;
        } else {
            // narazili sme na NUL → reset ukazovateľa na začiatok hesla
            j = 0;
        }
    }

    return key;
}

/**
 * Trieda RC4:
 * - udržiava vnútorný stav S[0..255] a indexy i, j,
 * - pri konštrukcii spustí KSA s dodaným 256-bajtovým kľúčom,
 * - randByte() generuje ďalší bajt keystreamu,
 * - xor(data) XOR-uje keystream s danými dátami (encrypt == decrypt).
 */
export class RC4 {
    private S: Uint8Array = new Uint8Array(256);
    private i = 0;
    private j = 0;

    constructor(key256: Uint8Array) {
        this.ksa(key256);
    }

    /**
     * KSA (Key Scheduling Algorithm):
     * - Inicializuje S[i] = i,
     * - potom 256-krát premiešava pole S podľa kľúča key[i] (mod 256).
     */
    private ksa(key: Uint8Array) {
        for (let i = 0; i < 256; i++) this.S[i] = i;
        let j = 0;
        for (let i = 0; i < 256; i++) {
            // j = (j + S[i] + key[i]) mod 256
            j = (j + this.S[i] + key[i]) % MOD256;
            const tmp = this.S[i]; this.S[i] = this.S[j]; this.S[j] = tmp;
        }
        this.i = 0; this.j = 0;
    }

    /**
     * randByte():
     * - PRGA krok RC4:
     *   1) i = (i + 1) mod 256
     *   2) j = (j + S[i]) mod 256
     *   3) vymení S[i] a S[j]
     *   4) vráti S[(S[i] + S[j]) mod 256] ako ďalší bajt keystreamu
     */
    randByte(): number {
        this.i = (this.i + 1) % MOD256;
        this.j = (this.j + this.S[this.i]) % MOD256;
        const tmp = this.S[this.i]; this.S[this.i] = this.S[this.j]; this.S[this.j] = tmp;
        const t = (this.S[this.i] + this.S[this.j]) % MOD256;
        return this.S[t];
    }

    /**
     * xor(data):
     * - aplikuje RC4 keystream na vstupné dáta pomocou XOR,
     * - keďže RC4 je prúdová šifra, tá istá operácia slúži
     *   na šifrovanie aj dešifrovanie.
     */
    xor(data: Uint8Array): Uint8Array {
        const out = new Uint8Array(data.length);
        for (let k = 0; k < data.length; k++) out[k] = data[k] ^ this.randByte();
        return out;
    }
}

/**
 * rc4DecryptWithPassword:
 * - Verejné API pre tvoju stránku:
 *   1) skontroluje, že heslo je presne 6 číslic,
 *   2) vytvorí 256-bajtový kľúč cez toKey256FromPass,
 *   3) inicializuje RC4 a XOR-uje celý ciphertext.
 * - Použitie:
 *   rc4DecryptWithPassword(cipherBytes, "123456") → plaintextBytes
 */
export function rc4DecryptWithPassword(cipher: Uint8Array, pass6digits: string): Uint8Array {
    // očakávame "100000"…"999999"
    if (!/^\d{6}$/.test(pass6digits)) throw new Error("Heslo musí byť 6-ciferné.");
    const key = toKey256FromPass(pass6digits);
    const rc4 = new RC4(key);
    return rc4.xor(cipher); // RC4: encrypt == decrypt
}

/**
 * scoreReadable:
 * - Jednoduché skóre "čitateľnosti" dešifrovaného textu.
 * - Myšlienka:
 *    * printable znaky (medzera, písmená, čísla, interpunkcia, \n, \t) = OK,
 *    * ostatné bajty = "zlé" (pravdepodobne binárny bordel),
 *    * výsledné skóre = ok - 2*bad (čím vyššie, tým lepšie).
 * - Využitie:
 *    * Brute-force prechádza heslá a vyberie tie, kde plaintext vyzerá
 *      ako reálny text (skóre nad prahom).
 */
export function scoreReadable(bytes: Uint8Array): number {
    let ok = 0, bad = 0;
    for (const b of bytes) {
        // povolené: tab, LF, CR, medzera..~DEL-1
        if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126)) ok++;
        else bad++;
    }
    // viac bodov = lepšie; "bad" penalizované dvojnásobne
    return ok - bad * 2;
}
