import { createHash } from "crypto";
import { DEFAULT_SHADOW_NAMES } from "./shadow-names";

export type ShadowEntry = {
  login: string;
  salt: string;
  hash: string;
};

export type CrackedEntry = ShadowEntry & {
  password: string;
  category: "names" | "custom" | "login" | "lower-6-7" | "mixed-4-5";
  attempts: number;
};

export type CrackOptions = {
  includeDefaultNames?: boolean;
  customNames?: string[];
  extraWords?: string[];
  deriveFromLogins?: boolean;
  enableLowerBruteforce?: boolean;
  enableMixedBruteforce?: boolean;
  maxLowerCandidates?: number;
  maxMixedCandidates?: number;
  timeLimitMs?: number;
};

export type CrackStats = {
  hashed: number;
  triedNames: number;
  triedCustom: number;
  triedLogin: number;
  triedLower: number;
  triedMixed: number;
  durationMs: number;
  timedOut: boolean;
  limitHitLower: boolean;
  limitHitMixed: boolean;
};

export type CrackResult = {
  cracked: CrackedEntry[];
  remaining: ShadowEntry[];
  stats: CrackStats;
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function parseShadowFile(text: string): ShadowEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(":"))
    .filter((parts) => parts.length === 3)
    .map(([login, salt, hash]) => ({ login, salt, hash }));
}

export function hashMd5Base64(password: string, salt: string): string {
  return createHash("md5").update(password, "utf8").update(salt, "utf8").digest("base64");
}

export function variantsWithOneUpper(word: string): string[] {
  const lower = word.toLowerCase();
  const out = new Set<string>([lower]);
  for (let i = 0; i < lower.length; i++) {
    const variant = lower.slice(0, i) + lower[i].toUpperCase() + lower.slice(i + 1);
    out.add(variant);
  }
  return Array.from(out);
}

function buildNameCandidates(custom: string[], includeDefault: boolean, derived: string[]): string[] {
  const base = new Set<string>();
  if (includeDefault) {
    for (const n of DEFAULT_SHADOW_NAMES) base.add(n);
  }
  for (const n of custom) {
    const trimmed = n.trim();
    if (trimmed) base.add(trimmed);
  }
  for (const n of derived) {
    const trimmed = n.trim();
    if (trimmed) base.add(trimmed);
  }

  const variants = new Set<string>();
  for (const name of base) {
    for (const v of variantsWithOneUpper(name)) variants.add(v);
  }
  return Array.from(variants);
}

function bruteForce(
  charset: string,
  lengths: number[],
  limit: number,
  onCandidate: (candidate: string) => boolean,
  deadline: number
): { generated: number; timedOut: boolean; limitHit: boolean } {
  const chars = charset.split("");
  let generated = 0;
  let timedOut = false;
  let limitHit = false;

  const dfs = (targetLength: number, prefix: string): boolean => {
    if (Date.now() > deadline) {
      timedOut = true;
      return true;
    }
    if (generated >= limit) {
      limitHit = true;
      return true;
    }
    if (prefix.length === targetLength) {
      generated++;
      const shouldStop = onCandidate(prefix);
      return shouldStop;
    }
    for (const ch of chars) {
      const stop = dfs(targetLength, prefix + ch);
      if (stop) return true;
    }
    return false;
  };

  for (const len of lengths) {
    const stop = dfs(len, "");
    if (stop) break;
  }

  return { generated, timedOut, limitHit };
}

type CrackContext = {
  remaining: ShadowEntry[];
  cracked: CrackedEntry[];
  attempts: Map<string, number>;
  stats: CrackStats;
  deadline: number;
};

function testCandidate(candidate: string, category: CrackedEntry["category"], ctx: CrackContext): boolean {
  if (Date.now() > ctx.deadline) {
    ctx.stats.timedOut = true;
    return true;
  }

  for (let i = ctx.remaining.length - 1; i >= 0; i--) {
    const entry = ctx.remaining[i];
    ctx.attempts.set(entry.login, (ctx.attempts.get(entry.login) ?? 0) + 1);
    ctx.stats.hashed++;

    const digest = hashMd5Base64(candidate, entry.salt);
    if (digest === entry.hash) {
      const attempts = ctx.attempts.get(entry.login) ?? 0;
      ctx.cracked.push({ ...entry, password: candidate, category, attempts });
      ctx.remaining.splice(i, 1);
    }
  }

  if (ctx.remaining.length === 0) return true;
  if (Date.now() > ctx.deadline) {
    ctx.stats.timedOut = true;
    return true;
  }
  return false;
}

export function crackShadow(shadowText: string, opts: CrackOptions = {}): CrackResult {
  const entries = parseShadowFile(shadowText);
  const remaining = [...entries];
  const cracked: CrackedEntry[] = [];
  const attempts = new Map<string, number>();

  const now = Date.now();
  const deadline = now + (opts.timeLimitMs ?? 60_000);

  const stats: CrackStats = {
    hashed: 0,
    triedNames: 0,
    triedCustom: 0,
    triedLogin: 0,
    triedLower: 0,
    triedMixed: 0,
    durationMs: 0,
    timedOut: false,
    limitHitLower: false,
    limitHitMixed: false,
  };

  const ctx: CrackContext = { remaining, cracked, attempts, stats, deadline };

  const loginDerived = opts.deriveFromLogins !== false
    ? Array.from(new Set(entries.flatMap((e) => [e.login, e.login.replace(/\d+/g, "")])))
    : [];

  const customNames = opts.customNames ?? [];
  const extraWords = opts.extraWords ?? [];

  const nameCandidates = buildNameCandidates(customNames, opts.includeDefaultNames !== false, loginDerived);
  for (const candidate of nameCandidates) {
    stats.triedNames++;
    if (testCandidate(candidate, "names", ctx)) break;
  }

  if (ctx.remaining.length > 0 && extraWords.length > 0) {
    const deduped = Array.from(new Set(extraWords.map((w) => w.trim()).filter(Boolean)));
    for (const candidate of deduped) {
      stats.triedCustom++;
      if (testCandidate(candidate, "custom", ctx)) break;
    }
  }

  if (ctx.remaining.length > 0 && loginDerived.length > 0) {
    const loginVariants = buildNameCandidates([], false, loginDerived);
    for (const candidate of loginVariants) {
      stats.triedLogin++;
      if (testCandidate(candidate, "login", ctx)) break;
    }
  }

  if (ctx.remaining.length > 0 && opts.enableLowerBruteforce !== false) {
    const maxLower = Math.max(1, Math.min(opts.maxLowerCandidates ?? 300_000, 10_000_000));
    const res = bruteForce(LOWER, [6, 7], maxLower, (candidate) => testCandidate(candidate, "lower-6-7", ctx), deadline);
    stats.triedLower = res.generated;
    if (res.timedOut) stats.timedOut = true;
    if (res.limitHit) stats.limitHitLower = true;
  }

  if (ctx.remaining.length > 0 && opts.enableMixedBruteforce !== false) {
    const maxMixed = Math.max(1, Math.min(opts.maxMixedCandidates ?? 200_000, 10_000_000));
    const res = bruteForce(ALNUM, [4, 5], maxMixed, (candidate) => testCandidate(candidate, "mixed-4-5", ctx), deadline);
    stats.triedMixed = res.generated;
    if (res.timedOut) stats.timedOut = true;
    if (res.limitHit) stats.limitHitMixed = true;
  }

  stats.durationMs = Date.now() - now;

  return { cracked, remaining, stats };
}
