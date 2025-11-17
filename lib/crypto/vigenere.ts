// ===============================================================
// LOGICKÉ KROKY A PORADIE VOLANÍ (čo sa deje pri /api/vigenere)
// ===============================================================
//
// 0) UI zavolá API s ciphertextom, min/max dĺžkou kľúča a jazykom.
// 1) API zavolá vigenereDecryptAuto(rawText, {minKey,maxKey,lang,preview})
// 2) onlyAZ(rawText) -> vyčistí text len na A–Z (analytická verzia).
// 3) kasiskiKeyLenCandidates(textAZ, minKey, maxKey) -> (vigenereDecryptAuto)
//      3.1) kasiskiDistances(textAZ) nájde vzdialenosti opakovaných trigramov, (kasiskiKeyLenCandidates)
//      3.2) gcd(...) spočíta GCD všetkých vzdialeností, (kasiskiKeyLenCandidates)
//      3.3) divisors(n) rozdelí vzdialenosti na delitele a zahlasuje za L, (kasiskiKeyLenCandidates)
//      3.4) vráti kandidátov na dĺžku kľúča (alebo fallback na celé <min,max>).
// 4) Pre každý kandidát L a pre každý jazykový model (EN/SK pri lang="auto"):
//      4.1) guessKeyForLengthAZ(textAZ, L, FREQ) -> (guessKeyForLengthAZ)
//            - rozreže text do L stĺpcov,
//            - pre každý stĺpec: bestShift(column, FREQ):
//                * vyskúša všetky posuny 0..25,
//                * chiSquareForShift(column, shift, FREQ) spočíta chi²,
//                * vyberie shift s najnižším chi²,
//            - poskladá kľúč a vráti sumárnu chi² hodnotu.
// 5) Vyberie sa kandidát s najnižšou celkovou chi² (best.key, best.L, best.lang).
// 6) Dešifrovanie:
//      - decryptAZOnly(textAZ, best.key) -> čisté A–Z,
//      - decryptPreserveLayout(rawText, best.key) -> zachová medzery a interpunkciu.
// 7) Vráti sa JSON s kľúčom, plaintextami, náhľadmi a diagnostikou Kasiski/chi².
//
// Pozn.: EN_FREQ/SK_FREQ sú normalizované tabuľky frekvencií písmen pre chi².
// ===============================================================


// Vigenère – Kasiski + chi-square podľa tvojho Python skriptu
// - hľadáme dĺžku kľúča cez trigramy (vzdialenosti, delitele, GCD)
// - pre kandidátne dĺžky urobíme stĺpcovú χ² analýzu (EN/SK/auto)
// - A–Z only na analýzu, ale vieme vrátiť plaintext aj so zachovaným layoutom

/**
 * Typ jazyka pre hodnotenie chi² (angličtina, slovenčina alebo automaticky oboje).
 */
type Lang = "en" | "sk" | "auto";

const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const A = "A".charCodeAt(0);

/**
 * Pomocná funkcia: vráti pole [0, 1, ..., n-1].
 */
const range = (n: number) => [...Array(n).keys()];

const ALPHABET = AZ.split("");

/**
 * Tabuľka percentuálnych frekvencií písmen pre angličtinu (A–Z).
 * Používa sa pri chi² hodnotení kvality dešifrovania.
 */
const EN_PCT: Record<string, number> = {
  A:8.167,B:1.492,C:2.782,D:4.253,E:12.702,F:2.228,G:2.015,H:6.094,I:6.966,
  J:0.153,K:0.772,L:4.025,M:2.406,N:6.749,O:7.507,P:1.929,Q:0.095,R:5.987,
  S:6.327,T:9.056,U:2.758,V:0.978,W:2.360,X:0.150,Y:1.974,Z:0.074
};

/**
 * Tabuľka percentuálnych frekvencií písmen pre slovenčinu (A–Z, bez diakritiky).
 * Používa sa pri chi² hodnotení kvality dešifrovania.
 */
const SK_PCT: Record<string, number> = {
  A:10.0,B:1.6,C:3.0,D:4.0,E:10.0,F:0.8,G:1.0,H:2.1,I:8.0,J:2.0,K:3.4,L:4.9,
  M:3.5,N:6.7,O:9.5,P:3.0,Q:0.1,R:5.1,S:5.2,T:5.5,U:3.5,V:4.1,W:0.1,X:0.1,
  Y:1.6,Z:2.0
};

/**
 * Normalizuje percentuálne frekvencie na pravdepodobnosti (súčet = 1.0).
 */
function normFreq(pct: Record<string, number>) {
  const total = Object.values(pct).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  for (const a of ALPHABET) out[a] = (pct[a] || 0) / total;
  return out;
}

/**
 * Normalizované frekvencie písmen pre angličtinu (A–Z).
 */
const EN_FREQ = normFreq(EN_PCT);

/**
 * Normalizované frekvencie písmen pre slovenčinu (A–Z).
 */
const SK_FREQ = normFreq(SK_PCT);

/**
 * Vyčistí vstupný reťazec a ponechá iba veľké písmená A–Z.
 * (Používa sa na štatistickú analýzu šifry.)
 */
export function onlyAZ(text: string) {
  let out = "";
  for (const ch of text) if (ch >= "A" && ch <= "Z") out += ch;
  return out;
}

/**
 * Dešifruje „čistý“ A–Z text daným kľúčom (A=0, B=1, ...).
 * Posun vykonáva modulo 26, kľúč sa cyklicky opakuje.
 */
export function decryptAZOnly(textAZ: string, keyAZ: string) {
  if (!keyAZ) return textAZ;
  let out = "";
  for (let i = 0; i < textAZ.length; i++) {
    const x = textAZ.charCodeAt(i) - A; // C (cipher)
    const s = keyAZ.charCodeAt(i % keyAZ.length) - A; // K (key)
    const p = (x - s + 26) % 26;  // P (plain)
    out += String.fromCharCode(A + p);
  }
  return out;
}

/**
 * Dešifruje pôvodný text tak, že posúva iba písmená A–Z.
 * Ostatné znaky (medzery, interpunkcia) zachová na pôvodných miestach.
 */
export function decryptPreserveLayout(raw: string, keyAZ: string) {
  if (!keyAZ) return raw;
  let out = "";
  let k = 0;
  for (const ch of raw) {
    if (ch >= "A" && ch <= "Z") {
      const x = ch.charCodeAt(0) - A;
      const s = keyAZ.charCodeAt(k % keyAZ.length) - A;
      const p = (x - s + 26) % 26;
      out += String.fromCharCode(A + p);
      k++;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Spočíta chi-kvadrát (χ²) pre jeden stĺpec pri konkrétnom posune.
 * Čím menšia hodnota, tým lepšie sa stĺpec „podobá“ na zvolený jazyk (freq).
 */
function chiSquareForShift(column: string, shift: number, freq: Record<string, number>) {
  const n = column.length;
  if (!n) return Number.POSITIVE_INFINITY;
  const counts = new Array(26).fill(0);
  for (let i = 0; i < n; i++) {
    const c = column.charCodeAt(i) - A;
    const p = (c - shift + 26) % 26; // inverse shift (dešifrovanie)
    counts[p]++;
  }
  let chi2 = 0;
  for (let i = 0; i < 26; i++) {
    const expected = (freq[AZ[i]] || 0) * n;
    const obs = counts[i];
    if (expected > 0) chi2 += (obs - expected) ** 2 / expected;
  }
  return chi2;
}

/**
 * Nájde najlepší posun 0..25 pre daný stĺpec podľa najnižšieho χ².
 */
function bestShift(column: string, freq: Record<string, number>) {
  let bestS = 0, best = Number.POSITIVE_INFINITY;
  for (let s = 0; s < 26; s++) {
    const sc = chiSquareForShift(column, s, freq);
    if (sc < best) { best = sc; bestS = s; }
  }
  return { shift: bestS, chi2: best };
}

/**
 * Pre danú dĺžku kľúča L rozdelí text do L stĺpcov,
 * pre každý stĺpec nájde najlepší posun (bestShift) a vráti kľúč + súčet χ².
 */
function guessKeyForLengthAZ(textAZ: string, L: number, freq: Record<string, number>) {
  const cols = Array.from({ length: L }, () => "");
  for (let i = 0; i < textAZ.length; i++) cols[i % L] += textAZ[i];

  const shifts: number[] = [];
  let chi2Sum = 0;
  for (const col of cols) {
    const { shift, chi2 } = bestShift(col, freq);
    shifts.push(shift);
    chi2Sum += chi2;
  }
  const key = shifts.map(s => String.fromCharCode(A + s)).join("");
  return { key, shifts, chi2Sum };
}

// --- KASISKI (podľa tvojho Pythonu) ---

/**
 * Vráti všetkých deliteľov čísla n (>= 2) a pridá aj samotné n.
 * Používa sa pri „hlasovaní“ pre dĺžky kľúča z pozorovaných vzdialeností.
 */
function divisors(n: number) {
  const ds = new Set<number>();
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) {
      ds.add(d);
      const q = Math.floor(n / d);
      if (q !== d) ds.add(q);
    }
  }
  ds.add(n);
  return ds;
}

/**
 * Euklidov algoritmus: najväčší spoločný deliteľ (GCD) dvoch čísel.
 */
function gcd(a: number, b: number): number {
  while (b !== 0) { const t = b; b = a % b; a = t; }
  return Math.abs(a);
}

/**
 * Nájde vzdialenosti medzi opakovanými trigramami v texte (A–Z).
 * Tieto vzdialenosti sa potom používajú na odhad dĺžky kľúča.
 */
function kasiskiDistances(textAZ: string) {
  const dist: number[] = [];
  const L = textAZ.length;
  for (let i = 0; i < L - 2; i++) {
    const tri = textAZ[i] + textAZ[i + 1] + textAZ[i + 2];
    for (let j = i + 1; j < L - 2; j++) {
      if (textAZ[j] === tri[0] && textAZ[j + 1] === tri[1] && textAZ[j + 2] === tri[2]) {
        dist.push(j - i);
      }
    }
  }
  return dist;
}

/**
 * Skombinuje GCD všetkých vzdialeností a hlasovanie deliteľov
 * do zoznamu kandidátov na dĺžku kľúča v rozsahu <minK, maxK>.
 * Ak žiadne vzdialenosti nie sú, vráti prázdny zoznam kandidátov.
 */
function kasiskiKeyLenCandidates(textAZ: string, minK: number, maxK: number) {
  const distances = kasiskiDistances(textAZ);
  const info: any = { distances, gcdAll: null as number | null, votes: [] as Array<{k: number, v: number}> };

  if (!distances.length) return { candidates: [], info };

  const gcdAll = distances.reduce((a, b) => gcd(a, b));
  info.gcdAll = gcdAll;

  const votesMap = new Map<number, number>();
  for (const d of distances) {
    for (const dv of divisors(d)) {
      if (dv >= 2) votesMap.set(dv, (votesMap.get(dv) || 0) + 1);
    }
  }

  const votes = [...votesMap.entries()]
    .filter(([k]) => k >= minK && k <= maxK)
    .sort((a, b) => b[1] - a[1]);

  info.votes = votes.map(([k, v]) => ({ k, v }));

  const topScore = votes.length ? votes[0][1] : 0;
  const tops = votes.filter(([_, v]) => v === topScore).map(([k]) => k);

  // Heuristika: preferuj top-hlasovaných + rozumné delitele GCD v rozsahu
  const gcdDivs = [...divisors(gcdAll)].filter(k => k >= minK && k <= maxK);
  const merged = [...new Set<number>([...tops, ...gcdDivs, ...votes.map(v => v[0])])];

  return { candidates: merged, info };
}

// --- Hlavný solver ---

/**
 * End-to-end riešenie:
 * - vyčistí text na A–Z,
 * - cez Kasiski odhadne dĺžku kľúča (alebo prejde celý rozsah),
 * - pre kandidátske dĺžky a vybraný jazyk (EN/SK/auto) nájde kľúč cez chi²,
 * - dešifruje a vráti výsledky + diagnostické detaily.
 */
export function vigenereDecryptAuto(
  rawText: string,
  opts?: { minKey?: number; maxKey?: number; lang?: Lang; preview?: number }
) {
  const minKey = Math.max(2, Math.min(40, opts?.minKey ?? 15));
  const maxKey = Math.max(minKey, Math.min(60, opts?.maxKey ?? 25));
  const lang: Lang = opts?.lang ?? "auto";
  const preview = Math.max(50, Math.min(1000, opts?.preview ?? 250));

  // 0) Vyčistíme text na A–Z
  const textAZ = onlyAZ(rawText);
  if (!textAZ) {
    return { key: "", keyLength: 0, plaintextAZ: "", plaintextLayout: rawText, details: { cleanLen: 0 } };
  }

  // 1) Kandidáti dĺžky cez Kasiski
  const kas = kasiskiKeyLenCandidates(textAZ, minKey, maxKey);
  let candidates = kas.candidates;

  // Fallback: ak Kasiski nič nedá, skúšame všetky v rozsahu
  if (!candidates.length) {
    candidates = range(maxKey - minKey + 1).map(i => i + minKey);
  }

  // 2) Vyhodnotíme každý kandidát pre EN a/alebo SK (podľa 'lang')
  type EvalRes = { lang: "en" | "sk"; key: string; L: number; chi2: number };
  const evals: EvalRes[] = [];

  const langs: Array<"en" | "sk"> =
    lang === "auto" ? ["en", "sk"] : (lang === "en" ? ["en"] : ["sk"]);

  // Pre každý kandidát dĺžky kľúča L 
  // Pre každú dlžku kľúča urobíme frekvenčnú analýzu pre každý jazyk
  for (const L of candidates) {
    for (const l of langs) {
      const freq = l === "en" ? EN_FREQ : SK_FREQ;
      const { key, chi2Sum } = guessKeyForLengthAZ(textAZ, L, freq);
      evals.push({ lang: l, key, L, chi2: chi2Sum });
    }
  }

  // 3) Vyberieme najnižšie chi²
  evals.sort((a, b) => a.chi2 - b.chi2);
  const best = evals[0];

  // 4) Dešifrovanie najlepším kľúčom (čisté A–Z aj so zachovaným layoutom)
  const plaintextAZ = decryptAZOnly(textAZ, best.key);
  const plaintextLayout = decryptPreserveLayout(rawText, best.key);

  return {
    key: best.key,
    keyLength: best.L,
    languageModel: best.lang,
    plaintextAZ,
    plaintextLayout,
    previewAZ: plaintextAZ.slice(0, preview),
    previewLayout: plaintextLayout.slice(0, preview),
    details: {
      cleanLen: textAZ.length,
      kasiski: kas.info,          // distances, gcd, votes
      evaluated: evals.slice(0, 10) // top 10 kandidátov pre prehľad
    }
  };
}


// ===============================================================
/**
1.Text sa vyčistí len na A–Z (onlyAZ).

2.Kasiskiho test nájde opakované trigramy → vzdialenosti → GCD → kandidátne dĺžky kľúča v rozsahu 15–25.

3.Pre každý kandidát L a jazyk (EN/SK alebo oboje pri auto):

    rozdelí text na L stĺpcov,

    pre každý stĺpec skúsi 26 možných posunov,

    spočíta χ² podľa rozloženia písmen,

    vyberie posun s najnižším χ² → jedno písmeno kľúča.

4.Porovná všetky nájdené kľúče podľa celkového χ², vyberie ten najlepší.

5.Týmto kľúčom dešifruje text:

    raz na čisté A–Z (decryptAZOnly),

    raz so zachovaním layoutu (decryptPreserveLayout).
 */
