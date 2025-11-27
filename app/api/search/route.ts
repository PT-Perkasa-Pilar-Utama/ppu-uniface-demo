import { db } from "@/lib/db";
import { faces } from "@/lib/db/schema";
import { uniface } from "@/lib/uniface";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    try {
        await uniface.initialize();
        const result = await uniface.recognize(arrayBuffer);
        const inputEmbedding = result.embedding;

        const allFaces = await db.select().from(faces);

        const matches = [];

        for (const face of allFaces) {
            const dbEmbedding = new Float32Array(JSON.parse(face.embedding));
            const verification = await uniface.verifyEmbedding(inputEmbedding, dbEmbedding);

            matches.push({
                face,
                similarity: verification.similarity,
                verified: verification.verified,
            });
        }

        // Sort by similarity (higher is better for cosine similarity usually, but uniface might use distance or similarity)
        // Uniface verifyEmbedding returns similarity (0-1, higher is better for cosine).
        // Let's assume higher is better.
        matches.sort((a, b) => b.similarity - a.similarity);

        return NextResponse.json(matches.slice(0, 10));
    } catch (error) {
        console.error("Error searching faces:", error);
        return NextResponse.json({ error: "Failed to search faces" }, { status: 500 });
    }
}
