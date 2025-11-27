"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/file-drop-zone";
import { SampleSelector } from "@/components/sample-selector";
import { CopyButton } from "@/components/copy-button";
import { Loader2, Clock } from "lucide-react";

export default function RecognizePage() {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);

    const handleFileSelect = (file: File) => {
        const url = URL.createObjectURL(file);
        setImage(url);
        setResult(null);
        setResponseTime(null);
    };

    const recognizeFace = async () => {
        if (!image) return;

        setLoading(true);
        const startTime = performance.now();

        try {
            const blob = await fetch(image).then((r) => r.blob());
            const formData = new FormData();
            formData.append("file", blob);

            const res = await fetch("/api/recognize", {
                method: "POST",
                body: formData,
            });

            const endTime = performance.now();
            setResponseTime(endTime - startTime);

            const data = await res.json();
            setResult(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6 text-center">Face Recognition</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Input</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!image ? (
                            <>
                                <FileDropZone onFileSelect={handleFileSelect} />
                                <SampleSelector onSelect={handleFileSelect} />
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative border rounded-lg overflow-hidden bg-muted h-[300px] flex items-center justify-center">
                                    <img src={image} alt="Input" className="max-w-full max-h-full object-contain" />
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setImage(null)}
                                    className="w-full cursor-pointer"
                                >
                                    Change Image
                                </Button>
                            </div>
                        )}

                        <Button
                            onClick={recognizeFace}
                            disabled={!image || loading}
                            className="w-full cursor-pointer bg-primary hover:bg-primary/90"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Embedding
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative border rounded-lg overflow-hidden bg-muted min-h-[300px] flex items-center justify-center">
                            {image ? (
                                <img src={image} alt="Input" className="max-w-full h-auto max-h-[300px]" />
                            ) : (
                                <p className="text-muted-foreground">Upload an image to start</p>
                            )}
                        </div>

                        {responseTime !== null && (
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">Response Time:</span>
                                <span className="text-muted-foreground">{responseTime.toFixed(0)}ms</span>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-3">
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Embedding Dimensions</p>
                                    <p className="text-lg font-bold">{result.embedding.length}</p>
                                </div>

                                <div className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium">Embedding Vector (Preview)</p>
                                        <CopyButton text={JSON.stringify(result.embedding)} />
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="break-all text-xs text-muted-foreground font-mono">
                                            [{result.embedding.slice(0, 10).map((v: number) => v.toFixed(6)).join(", ")}, ...
                                            {result.embedding.length - 10} more values]
                                        </p>
                                    </div>
                                </div>

                                <details className="border rounded-lg">
                                    <summary className="cursor-pointer p-3 hover:bg-muted font-medium text-sm">
                                        View Full Embedding Vector
                                    </summary>
                                    <div className="p-3 border-t">
                                        <div className="flex justify-end mb-2">
                                            <CopyButton text={JSON.stringify(result.embedding)} />
                                        </div>
                                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60 font-mono">
                                            {JSON.stringify(result.embedding, null, 2)}
                                        </pre>
                                    </div>
                                </details>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
