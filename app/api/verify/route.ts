import { NextRequest, NextResponse } from "next/server";
import { uniface } from "@/lib/uniface";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file1 = formData.get("file1") as File;
    const file2 = formData.get("file2") as File;

    if (!file1 || !file2) {
        return NextResponse.json({ error: "Both files are required" }, { status: 400 });
    }

    const buffer1 = await file1.arrayBuffer();
    const buffer2 = await file2.arrayBuffer();

    try {
        await uniface.initialize();
        const result = await uniface.verify(buffer1, buffer2, { compact: false });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
