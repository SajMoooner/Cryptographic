import { NextResponse } from "next/server";
import { vigenereDecryptAuto } from "@/lib/crypto/vigenere";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const ciphertext: string = body?.ciphertext ?? "";
        const minKey = Number(body?.minKey ?? 15);
        const maxKey = Number(body?.maxKey ?? 25);
        const lang = (body?.lang ?? "auto") as "en" | "sk" | "auto";

        if (!ciphertext.trim()) {
            return NextResponse.json({ error: "Chýba ciphertext." }, { status: 400 });
        }

        const result = vigenereDecryptAuto(ciphertext, { minKey, maxKey, lang, preview: 300 });
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: "Neplatná požiadavka." }, { status: 400 });
    }
}
