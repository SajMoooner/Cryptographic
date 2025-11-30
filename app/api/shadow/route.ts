import { NextResponse } from "next/server";
import { parseShadowFile } from "@/lib/crypto/shadow";
import { crackShadowParallel } from "@/lib/crypto/shadow-parallel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const shadowText = String(body?.shadow ?? body?.text ?? "").trim();
    if (!shadowText) {
      return NextResponse.json({ error: "Chýba obsah shadow súboru." }, { status: 400 });
    }

    const parsed = parseShadowFile(shadowText);
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Shadow súbor sa nepodarilo parsovať." }, { status: 400 });
    }

    const customNames = toList(body?.customNames);
    const extraWords = toList(body?.extraWords);

    const maxLower = Number.isFinite(Number(body?.maxLowerCandidates))
      ? Number(body?.maxLowerCandidates)
      : undefined;
    const maxMixed = Number.isFinite(Number(body?.maxMixedCandidates))
      ? Number(body?.maxMixedCandidates)
      : undefined;

    const timeLimitMs = Number.isFinite(Number(body?.timeLimitMs))
      ? Number(body?.timeLimitMs)
      : 60_000;

    const result = await crackShadowParallel(shadowText, {
      enableNames: body?.enableNames !== false,
      includeDefaultNames: body?.includeDefaultNames !== false,
      customNames,
      extraWords,
      deriveFromLogins: body?.deriveFromLogins !== false,
      enableLower6: body?.enableLower6 !== false,
      enableLower7: body?.enableLower7 !== false,
      enableMixed4: body?.enableMixed4 !== false,
      enableMixed5: body?.enableMixed5 !== false,
      maxLowerCandidates: maxLower,
      maxMixedCandidates: maxMixed,
      timeLimitMs,
      numWorkers: body?.numWorkers,
    });

    return NextResponse.json({
      ok: true,
      cracked: result.cracked,
      remaining: result.remaining,
      stats: result.stats,
      total: parsed.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Neplatná požiadavka." }, { status: 400 });
  }
}
