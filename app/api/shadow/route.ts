import { NextResponse } from "next/server";
import { crackShadow, parseShadowFile } from "@/lib/crypto/shadow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const result = crackShadow(shadowText, {
      includeDefaultNames: body?.includeDefaultNames !== false,
      customNames,
      extraWords,
      deriveFromLogins: body?.deriveFromLogins !== false,
      enableLowerBruteforce: body?.enableLowerBruteforce !== false,
      enableMixedBruteforce: body?.enableMixedBruteforce !== false,
      maxLowerCandidates: maxLower,
      maxMixedCandidates: maxMixed,
      timeLimitMs,
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
