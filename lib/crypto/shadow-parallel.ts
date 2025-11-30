import os from "os";
import path from "path";
import workerpool, { type Pool as WorkerPool } from "workerpool";
import { hashMd5Base64, parseShadowFile, variantsWithOneUpper } from "./shadow";
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

export type ParallelCrackOptions = {
  // Kategória 1: Slovenské mená
  enableNames?: boolean;
  includeDefaultNames?: boolean;
  customNames?: string[];
  extraWords?: string[];
  deriveFromLogins?: boolean;

  // Kategória 2: 6-7 malých písmen
  enableLower6?: boolean;
  enableLower7?: boolean;
  maxLowerCandidates?: number;

  // Kategória 3: 4-5 mixed znakov
  enableMixed4?: boolean;
  enableMixed5?: boolean;
  maxMixedCandidates?: number;

  // Všeobecné
  timeLimitMs?: number;
  numWorkers?: number;
};

export type CrackStats = {
  hashed: number;
  triedNames: number;
  triedCustom: number;
  triedLogin: number;
  triedLower6: number;
  triedLower7: number;
  triedMixed4: number;
  triedMixed5: number;
  durationMs: number;
  timedOut: boolean;
  workersUsed: number;
};

export type ParallelCrackResult = {
  cracked: CrackedEntry[];
  remaining: ShadowEntry[];
  stats: CrackStats;
};

type WorkerTask = {
  entries: ShadowEntry[];
  charset: string;
  length: number;
  start: number;
  count: number;
  deadline: number;
  category: CrackedEntry["category"];
};

type WorkerAttemptMap = Record<string, number>;

type WorkerResult = {
  cracked: CrackedEntry[];
  attemptsPerLogin: WorkerAttemptMap;
  hashed: number;
  attempted: number;
  timedOut: boolean;
};

type CrackContext = {
  remaining: ShadowEntry[];
  cracked: CrackedEntry[];
  attempts: Map<string, number>;
  stats: CrackStats;
  deadline: number;
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_TIME_LIMIT = 60_000;
const MIN_CHUNK = 25_000;
const WORKERPOOL_SCRIPT = path.resolve(process.cwd(), "node_modules", "workerpool", "dist", "worker.js");

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

function getPoolSize(requested?: number): number {
  const fallback = typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length;

  const desired = Number.isFinite(requested) ? Number(requested) : Math.max(fallback - 1, 1);
  return Math.max(1, Math.min(desired, 16));
}

function testCandidate(
  candidate: string,
  category: CrackedEntry["category"],
  ctx: CrackContext
): boolean {
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

function mergeWorkerResult(result: WorkerResult, ctx: CrackContext, category: CrackedEntry["category"]) {
  for (const [login, count] of Object.entries(result.attemptsPerLogin)) {
    ctx.attempts.set(login, (ctx.attempts.get(login) ?? 0) + count);
  }

  for (const found of result.cracked) {
    const idx = ctx.remaining.findIndex(
      (entry) => entry.login === found.login && entry.salt === found.salt && entry.hash === found.hash
    );
    if (idx !== -1) {
      const attempts = ctx.attempts.get(found.login) ?? found.attempts;
      ctx.cracked.push({ ...found, category, attempts });
      ctx.remaining.splice(idx, 1);
    }
  }
}

async function runBruteForceLength(
  charset: string,
  length: number,
  maxCandidates: number,
  category: CrackedEntry["category"],
  pool: WorkerPool,
  poolSize: number,
  ctx: CrackContext
): Promise<{ attempted: number; hashed: number; timedOut: boolean }> {
  if (ctx.remaining.length === 0 || Date.now() > ctx.deadline) {
    if (Date.now() > ctx.deadline) ctx.stats.timedOut = true;
    return { attempted: 0, hashed: 0, timedOut: ctx.stats.timedOut };
  }

  const totalSpace = Math.pow(charset.length, length);
  const effectiveLimit = Math.min(Math.max(0, maxCandidates), totalSpace);

  if (effectiveLimit === 0) {
    return { attempted: 0, hashed: 0, timedOut: ctx.stats.timedOut };
  }

  const chunkSize = Math.max(MIN_CHUNK, Math.ceil(effectiveLimit / poolSize));
  const tasks: Promise<WorkerResult>[] = [];

  for (let start = 0; start < effectiveLimit; start += chunkSize) {
    const count = Math.min(chunkSize, effectiveLimit - start);
    tasks.push(
      pool.exec<WorkerResult>(workerBruteForce, [
        { entries: ctx.remaining, charset, length, start, count, deadline: ctx.deadline, category },
      ])
    );
  }

  const results = await Promise.all(tasks);

  let attempted = 0;
  let hashed = 0;

  for (const res of results) {
    attempted += res.attempted;
    hashed += res.hashed;
    mergeWorkerResult(res, ctx, category);
    if (res.timedOut) ctx.stats.timedOut = true;
  }

  ctx.stats.hashed += hashed;

  return { attempted, hashed, timedOut: ctx.stats.timedOut };
}

export async function crackShadowParallel(
  shadowText: string,
  opts: ParallelCrackOptions = {}
): Promise<ParallelCrackResult> {
  const entries = parseShadowFile(shadowText);
  const remaining = [...entries];
  const cracked: CrackedEntry[] = [];
  const attempts = new Map<string, number>();

  const now = Date.now();
  const deadline = now + (opts.timeLimitMs ?? DEFAULT_TIME_LIMIT);

  const stats: CrackStats = {
    hashed: 0,
    triedNames: 0,
    triedCustom: 0,
    triedLogin: 0,
    triedLower6: 0,
    triedLower7: 0,
    triedMixed4: 0,
    triedMixed5: 0,
    durationMs: 0,
    timedOut: false,
    workersUsed: 0,
  };

  const ctx: CrackContext = { remaining, cracked, attempts, stats, deadline };

  const poolSize = getPoolSize(opts.numWorkers);
  let pool: WorkerPool | null = null;
  const getPool = () => {
    if (!pool) {
      pool = workerpool.pool(WORKERPOOL_SCRIPT, { maxWorkers: poolSize, workerType: "thread" });
      stats.workersUsed = poolSize;
    }
    return pool;
  };

  try {
    // ===== KATEGÓRIA 1: SLOVENSKÉ MENÁ =====
    if (opts.enableNames !== false) {
      const loginDerived =
        opts.deriveFromLogins !== false
          ? Array.from(new Set(entries.flatMap((e) => [e.login, e.login.replace(/\d+/g, "")])))
          : [];

      const customNames = opts.customNames ?? [];
      const extraWords = opts.extraWords ?? [];

      const nameCandidates = buildNameCandidates(customNames, opts.includeDefaultNames !== false, loginDerived);

      for (const candidate of nameCandidates) {
        if (Date.now() > deadline) {
          stats.timedOut = true;
          break;
        }
        stats.triedNames++;
        if (testCandidate(candidate, "names", ctx)) break;
      }

      if (!stats.timedOut && ctx.remaining.length > 0 && extraWords.length > 0) {
        const deduped = Array.from(new Set(extraWords.map((w) => w.trim()).filter(Boolean)));
        for (const candidate of deduped) {
          if (Date.now() > deadline) {
            stats.timedOut = true;
            break;
          }
          stats.triedCustom++;
          if (testCandidate(candidate, "custom", ctx)) break;
        }
      }

      if (!stats.timedOut && ctx.remaining.length > 0 && loginDerived.length > 0) {
        const loginVariants = buildNameCandidates([], false, loginDerived);
        for (const candidate of loginVariants) {
          if (Date.now() > deadline) {
            stats.timedOut = true;
            break;
          }
          stats.triedLogin++;
          if (testCandidate(candidate, "login", ctx)) break;
        }
      }
    }

    // ===== KATEGÓRIA 2: 6-7 MALÝCH PÍSMEN =====
    if (!stats.timedOut && ctx.remaining.length > 0) {
      const maxLower = opts.maxLowerCandidates ?? 1_000_000;

      if (opts.enableLower6 !== false) {
        const res = await runBruteForceLength(
          LOWER,
          6,
          maxLower,
          "lower-6-7",
          getPool(),
          poolSize,
          ctx
        );
        stats.triedLower6 = res.attempted;
      }

      if (!stats.timedOut && ctx.remaining.length > 0 && opts.enableLower7 !== false) {
        const res = await runBruteForceLength(
          LOWER,
          7,
          maxLower,
          "lower-6-7",
          getPool(),
          poolSize,
          ctx
        );
        stats.triedLower7 = res.attempted;
      }
    }

    // ===== KATEGÓRIA 3: 4-5 MIXED ZNAKOV =====
    if (!stats.timedOut && ctx.remaining.length > 0) {
      const maxMixed = opts.maxMixedCandidates ?? 500_000;

      if (opts.enableMixed4 !== false) {
        const res = await runBruteForceLength(
          ALNUM,
          4,
          maxMixed,
          "mixed-4-5",
          getPool(),
          poolSize,
          ctx
        );
        stats.triedMixed4 = res.attempted;
      }

      if (!stats.timedOut && ctx.remaining.length > 0 && opts.enableMixed5 !== false) {
        const res = await runBruteForceLength(
          ALNUM,
          5,
          maxMixed,
          "mixed-4-5",
          getPool(),
          poolSize,
          ctx
        );
        stats.triedMixed5 = res.attempted;
      }
    }
  } finally {
    stats.durationMs = Date.now() - now;
    if (pool) {
      await pool.terminate(true);
    }
  }

  return { cracked, remaining, stats };
}

// Tento worker sa serializuje cez workerpool.exec, preto musí byť self-contained
// a nesmie závisieť na okolí modulu.
function workerBruteForce(task: WorkerTask): WorkerResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require("crypto");
  const { entries, charset, length, start, count, deadline, category } = task;

  const localRemaining = [...entries];
  const attempts: WorkerAttemptMap = {};
  const cracked: CrackedEntry[] = [];
  let hashed = 0;
  let attempted = 0;
  let timedOut = false;

  const end = start + count;
  const base = charset.length;

  const indexToPassword = (index: number): string => {
    let result = "";
    let num = index;
    for (let i = 0; i < length; i++) {
      result = charset[num % base] + result;
      num = Math.floor(num / base);
    }
    return result.padStart(length, charset[0]);
  };

  const hashMd5 = (password: string, salt: string): string =>
    createHash("md5").update(password, "utf8").update(salt, "utf8").digest("base64");

  for (let idx = start; idx < end; idx++) {
    if (Date.now() > deadline) {
      timedOut = true;
      break;
    }

    if (localRemaining.length === 0) break;

    const candidate = indexToPassword(idx);
    attempted++;

    for (let i = localRemaining.length - 1; i >= 0; i--) {
      const entry = localRemaining[i];
      attempts[entry.login] = (attempts[entry.login] ?? 0) + 1;
      hashed++;

      if (hashMd5(candidate, entry.salt) === entry.hash) {
        cracked.push({ ...entry, password: candidate, category, attempts: attempts[entry.login] });
        localRemaining.splice(i, 1);
      }
    }
  }

  return { cracked, attemptsPerLogin: attempts, hashed, attempted, timedOut };
}
