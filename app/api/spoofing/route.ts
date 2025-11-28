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
        // Use spoofingAnalysisWithDetection to handle detection automatically
        const result = await uniface.spoofingAnalysisWithDetection(arrayBuffer);

        if (!result) {
            return NextResponse.json({ error: "No face detected for spoofing analysis" }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Spoofing analysis error:", error);
        return NextResponse.json({ error: "Spoofing analysis failed" }, { status: 500 });
    }
}
