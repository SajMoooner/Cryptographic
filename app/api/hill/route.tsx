import { NextResponse } from "next/server";
import { solveAndDecryptWithKnownPrefix } from "@/lib/crypto/hill";

export const dynamic = "force-dynamic";

/**
 * POST /api/hill
 * - Vstup: { cipher: string, prefix?: string = "DRAHYJURAJ" }
 * - Orchestrácia: solveAndDecryptWithKnownPrefix(cipher, prefix)
 * - Výstup: prefix (ako použitý), key (3×3 matica 0..25), plaintextAZ (A–Z)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cipher: string = body?.cipher ?? "";
    const prefix: string = body?.prefix ?? "DRAHYJURAJ";

    if (!cipher.trim()) {
      return NextResponse.json({ error: "Chýba ciphertext." }, { status: 400 });
    }

    const r = solveAndDecryptWithKnownPrefix(cipher, prefix);
    return NextResponse.json({
      prefix,
      key: r.key,              // 3x3 matica (0..25)
      plaintextAZ: r.plaintextAZ,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Neznáma chyba." }, { status: 400 });
  }
}
