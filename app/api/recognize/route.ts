import { NextRequest, NextResponse } from "next/server";
import { uniface } from "@/lib/uniface";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    try {
        await uniface.initialize();
        const result = await uniface.recognize(arrayBuffer);

        // Convert Float32Array to regular array for JSON serialization
        const embedding = Array.from(result.embedding);

        return NextResponse.json({ embedding });
    } catch (error) {
        console.error("Recognition error:", error);
        return NextResponse.json({ error: "Recognition failed" }, { status: 500 });
    }
}
