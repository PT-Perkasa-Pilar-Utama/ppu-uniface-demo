import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { faces } from "@/lib/db/schema";
import { uniface } from "@/lib/uniface";
import { desc } from "drizzle-orm";

export async function GET() {
    try {
        const allFaces = await db.select().from(faces).orderBy(desc(faces.createdAt));
        return NextResponse.json(allFaces);
    } catch (error) {
        console.error("Error fetching faces:", error);
        return NextResponse.json({ error: "Failed to fetch faces" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
        return NextResponse.json({ error: "File and name are required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    try {
        await uniface.initialize();
        const result = await uniface.recognize(arrayBuffer);

        // Store embedding as JSON string
        const embeddingJson = JSON.stringify(Array.from(result.embedding));

        const newFace = await db.insert(faces).values({
            name,
            embedding: embeddingJson,
        }).returning();

        return NextResponse.json(newFace[0]);
    } catch (error) {
        console.error("Error adding face:", error);
        return NextResponse.json({ error: "Failed to add face" }, { status: 500 });
    }
}
