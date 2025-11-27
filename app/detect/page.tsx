"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/file-drop-zone";
import { SampleSelector } from "@/components/sample-selector";
import { CopyButton } from "@/components/copy-button";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";

export default function DetectPage() {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileSelect = (file: File) => {
        const url = URL.createObjectURL(file);
        setImage(url);
        setResult(null);
        setError(null);
        setResponseTime(null);
    };

    const detectFace = async () => {
        if (!image) return;

        setLoading(true);
        setError(null);
        const startTime = performance.now();

        try {
            const blob = await fetch(image).then((r) => r.blob());
            const formData = new FormData();
            formData.append("file", blob);

            const res = await fetch("/api/detect", {
                method: "POST",
                body: formData,
            });

            const endTime = performance.now();
            setResponseTime(endTime - startTime);

            const data = await res.json();

            if (data.error || !data.box) {
                setError(data.error || "No face detected in the image");
                setResult(null);
            } else {
                setResult(data);
            }
        } catch (err) {
            setError("Detection failed. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.src = image;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            if (result && result.box) {
                const { x, y, width, height } = result.box;
                ctx.strokeStyle = "#00FF00";
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, width, height);

                if (result.landmarks) {
                    ctx.fillStyle = "#FF0000";
                    result.landmarks.forEach((point: number[]) => {
                        ctx.beginPath();
                        ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
            }
        };
    }, [image, result]);

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6 text-center">Face Detection</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Input</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!image ? (
                            <FileDropZone onFileSelect={handleFileSelect} />
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

                        <SampleSelector onSelect={handleFileSelect} />

                        <Button
                            onClick={detectFace}
                            disabled={!image || loading}
                            className="w-full cursor-pointer bg-primary hover:bg-primary/90"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Detect Face
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative border rounded-lg overflow-hidden bg-muted min-h-[300px] flex items-center justify-center">
                            {image && !error ? (
                                <canvas ref={canvasRef} className="max-w-full h-auto" />
                            ) : error ? (
                                <div className="text-center p-6">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
                                    <p className="text-destructive font-medium">{error}</p>
                                </div>
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
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                                        <p className="text-lg font-bold">{(result.confidence * 100).toFixed(2)}%</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Multiple Faces</p>
                                        <div className="flex items-center gap-1">
                                            {result.multipleFaces ? (
                                                <>
                                                    <XCircle className="h-5 w-5 text-orange-500" />
                                                    <span className="text-lg font-bold">Yes</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                    <span className="text-lg font-bold">No</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg col-span-2">
                                        <p className="text-xs text-muted-foreground mb-1">Spoofing Detection</p>
                                        <div className="flex items-center gap-1">
                                            {result.spoofing ? (
                                                <>
                                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                                    <span className="text-lg font-bold text-red-500">Detected</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                    <span className="text-lg font-bold text-green-500">Not Detected</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium">Full Response</p>
                                        <CopyButton text={JSON.stringify(result, null, 2)} />
                                    </div>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-60">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
