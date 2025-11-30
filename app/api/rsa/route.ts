import { NextResponse } from "next/server";
import { solveRSA } from "@/lib/crypto/rsa";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const n: string = body?.n ?? "";
        const e: string = body?.e ?? "65537";
        const y: string = body?.y ?? "";
        const timeLimitMs = Number(body?.timeLimitMs ?? 300000);
        const useAdvanced = Boolean(body?.useAdvanced ?? false);

        if (!n.trim() || !y.trim()) {
            return NextResponse.json({ error: "Chýba n alebo y." }, { status: 400 });
        }

        // Automaticky urči, či použiť pokročilé metódy podľa veľkosti čísla
        const nLength = n.length;
        const shouldUseAdvanced = useAdvanced || nLength >= 25; // veľké čísla -> knižničný režim

        const result = await solveRSA(n, e, y, timeLimitMs, shouldUseAdvanced);

        if (!result.ok) {
            return NextResponse.json({
                error: result.reason || "Nepodarilo sa vyriešiť RSA úlohu.",
                timeMs: result.timeMs,
                method: result.method
            }, { status: 400 });
        }

        return NextResponse.json({
            ok: true,
            n: result.n.toString(),
            e: result.e.toString(),
            y: result.y.toString(),
            p: result.p?.toString(),
            q: result.q?.toString(),
            phi: result.phi?.toString(),
            d: result.d?.toString(),
            m: result.m?.toString(),
            timeMs: result.timeMs,
            method: result.method
        });
    } catch (err: any) {
        return NextResponse.json({
            error: err?.message || "Neplatná požiadavka."
        }, { status: 400 });
    }
}
