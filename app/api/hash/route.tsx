import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs"; // aby bol k dispozícii Node crypto

/**
 * POST /api/hash
 * - Prijme súbor vo forme multipart/form-data (pole "file"),
 * - spočíta jeho MD5 hash pomocou Node.js crypto,
 * - vráti JSON { md5 }.
 *
 * Používaš to na:
 * - overenie, že nahraté textX_enc.txt majú presne tie MD5,
 *   ktoré sú uvedené v zadaní (kontrola správneho downloadu).
 */
export async function POST(req: NextRequest) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Chýba súbor." }, { status: 400 });

    // načítanie celého súboru do Buffer-u
    const buf = Buffer.from(await file.arrayBuffer());
    // MD5 hash v hex tvare (napr. "4622c7bcb17d81c0...")
    const md5 = createHash("md5").update(buf).digest("hex");
    return NextResponse.json({ md5 });
}
