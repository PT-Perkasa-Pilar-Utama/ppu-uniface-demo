"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/file-drop-zone";
import { SampleSelector } from "@/components/sample-selector";
import { CopyButton } from "@/components/copy-button";
import { WebcamCapture } from "@/components/webcam-capture";
import { Loader2, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

export default function VerifyPage() {
    const [image1, setImage1] = useState<string | null>(null);
    const [image2, setImage2] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);

    const handleFileSelect1 = (file: File) => {
        const url = URL.createObjectURL(file);
        setImage1(url);
        setResult(null);
        setResponseTime(null);
    };

    const handleFileSelect2 = (file: File) => {
        const url = URL.createObjectURL(file);
        setImage2(url);
        setResult(null);
        setResponseTime(null);
    };

    const verifyFaces = async () => {
        if (!image1 || !image2) return;

        setLoading(true);
        const startTime = performance.now();

        try {
            const blob1 = await fetch(image1).then((r) => r.blob());
            const blob2 = await fetch(image2).then((r) => r.blob());
            const formData = new FormData();
            formData.append("file1", blob1);
            formData.append("file2", blob2);

            const res = await fetch("/api/verify", {
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

    const renderImageCard = (
        title: string,
        image: string | null,
        onSelect: (file: File) => void,
        onClear: () => void,
        detection: any
    ) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!image ? (
                    <>
                        <FileDropZone onFileSelect={onSelect} />
                        <SampleSelector onSelect={onSelect} />
                        <WebcamCapture onCapture={onSelect} buttonText="Capture from Webcam" />
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="relative border rounded-lg overflow-hidden bg-muted h-[300px] flex items-center justify-center">
                            <img src={image} alt={title} className="max-w-full max-h-full object-contain" />
                        </div>
                        <Button variant="outline" onClick={onClear} className="w-full cursor-pointer">
                            Change Image
                        </Button>
                    </div>
                )}

                {detection && (
                    <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                            <p className="text-sm font-bold">{(detection.confidence * 100).toFixed(2)}%</p>
                        </div>
                        {detection.multipleFaces && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                                        Multiple faces detected
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6 text-center">Face Verification</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {renderImageCard(
                    "Image 1",
                    image1,
                    handleFileSelect1,
                    () => setImage1(null),
                    result?.detection?.face1
                )}
                {renderImageCard(
                    "Image 2",
                    image2,
                    handleFileSelect2,
                    () => setImage2(null),
                    result?.detection?.face2
                )}
            </div>

            <div className="flex justify-center mb-6">
                <Button
                    onClick={verifyFaces}
                    disabled={!image1 || !image2 || loading}
                    size="lg"
                    className="cursor-pointer bg-primary hover:bg-primary/90"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify Faces
                </Button>
            </div>

            {responseTime !== null && (
                <div className="flex items-center justify-center gap-2 text-sm mb-6">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Response Time:</span>
                    <span className="text-muted-foreground">{responseTime.toFixed(0)}ms</span>
                </div>
            )}

            {result && (
                <Card className={result.verification?.verified ? "border-green-500" : "border-red-500"}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Result:
                            {result.verification?.verified ? (
                                <span className="text-green-500 flex items-center gap-1">
                                    <CheckCircle className="h-5 w-5" /> Match
                                </span>
                            ) : (
                                <span className="text-red-500 flex items-center gap-1">
                                    <XCircle className="h-5 w-5" /> No Match
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Similarity Score</p>
                                <p className="text-3xl font-bold">{(result.verification?.similarity * 100).toFixed(2)}%</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Threshold</p>
                                <p className="text-3xl font-bold">{(result.verification?.threshold * 100).toFixed(0)}%</p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">Full Details</p>
                                <CopyButton text={JSON.stringify(result, null, 2)} />
                            </div>
                            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-60">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
