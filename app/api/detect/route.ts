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
        const result = await uniface.detect(arrayBuffer);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Detection error:", error);
        return NextResponse.json({ error: "Detection failed" }, { status: 500 });
    }
}
