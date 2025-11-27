"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/file-drop-zone";
import { SampleSelector } from "@/components/sample-selector";
import { WebcamCapture } from "@/components/webcam-capture";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, User, Settings } from "lucide-react";

export default function AttendancePage() {
    const [targetImage, setTargetImage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState<"idle" | "scanning" | "success">("idle");
    const [similarity, setSimilarity] = useState<number | null>(null);
    const [threshold, setThreshold] = useState(0.7);
    const [fps, setFps] = useState(0.5); // checks per second
    const webcamRef = useRef<Webcam>(null);
    const intervalRef = useRef<NodeJS.Timeout | number | null>(null);

    const handleFileSelect = (file: File) => {
        const url = URL.createObjectURL(file);
        setTargetImage(url);
        setStatus("idle");
        setSimilarity(null);
        stopScanning();
    };

    const verifyFrame = async () => {
        if (!webcamRef.current || !targetImage) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        try {
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const targetBlob = await fetch(targetImage).then((r) => r.blob());

            const formData = new FormData();
            formData.append("file1", targetBlob);
            formData.append("file2", blob);

            const verifyRes = await fetch("/api/verify", {
                method: "POST",
                body: formData,
            });
            const data = await verifyRes.json();

            if (data.verification?.similarity >= threshold) {
                setStatus("success");
                setSimilarity(data.verification.similarity);
                stopScanning();
            } else {
                setSimilarity(data.verification?.similarity || 0);
            }
        } catch (error) {
            console.error("Verification error:", error);
        }
    };

    const startScanning = () => {
        if (!targetImage) return;
        setIsScanning(true);
        setStatus("scanning");
        const interval = 1000 / fps; // convert FPS to milliseconds
        intervalRef.current = setInterval(verifyFrame, interval);
    };

    const stopScanning = useCallback(() => {
        setIsScanning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => stopScanning();
    }, [stopScanning]);

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6 text-center">Attendance Simulation</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Target Person</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!targetImage ? (
                            <>
                                <FileDropZone onFileSelect={handleFileSelect} />
                                <SampleSelector onSelect={handleFileSelect} />
                                <WebcamCapture onCapture={handleFileSelect} buttonText="Capture from Webcam" />
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative border rounded-lg overflow-hidden bg-muted h-[300px] flex items-center justify-center">
                                    <img src={targetImage} alt="Target" className="max-w-full max-h-full object-contain" />
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setTargetImage(null)}
                                    className="w-full cursor-pointer"
                                >
                                    Change Target
                                </Button>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium text-sm">Settings</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="threshold" className="text-sm">
                                        Threshold
                                    </Label>
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {(threshold * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <Slider
                                    id="threshold"
                                    min={0.5}
                                    max={0.95}
                                    step={0.05}
                                    value={[threshold]}
                                    onValueChange={(value) => setThreshold(value[0])}
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="fps" className="text-sm">
                                        Checks per Second
                                    </Label>
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {fps.toFixed(1)} /s
                                    </span>
                                </div>
                                <Slider
                                    id="fps"
                                    min={0.2}
                                    max={2}
                                    step={0.1}
                                    value={[fps]}
                                    onValueChange={(value) => setFps(value[0])}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Live Camera</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative border rounded-lg overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full h-auto"
                                videoConstraints={{ facingMode: "user" }}
                            />
                            {status === "success" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
                                    <div className="bg-white p-4 rounded-full shadow-lg">
                                        <CheckCircle className="h-16 w-16 text-green-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            {status === "success" ? (
                                <div className="text-center w-full">
                                    <h3 className="text-2xl font-bold text-green-600">Attendance Success!</h3>
                                    <p className="text-muted-foreground">Similarity: {(similarity! * 100).toFixed(2)}%</p>
                                    <Button
                                        onClick={() => setStatus("idle")}
                                        className="mt-4 cursor-pointer"
                                        variant="outline"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full space-y-2">
                                    <Button
                                        onClick={isScanning ? stopScanning : startScanning}
                                        disabled={!targetImage}
                                        className="w-full cursor-pointer"
                                        variant={isScanning ? "destructive" : "default"}
                                    >
                                        {isScanning ? "Stop Scanning" : "Start Attendance Check"}
                                    </Button>
                                    {isScanning && (
                                        <div className="text-center space-y-1">
                                            <p className="text-sm text-muted-foreground animate-pulse">
                                                Scanning...
                                            </p>
                                            {similarity !== null && (
                                                <p className="text-xs text-muted-foreground">
                                                    Last: {(similarity * 100).toFixed(2)}%
                                                    {similarity >= threshold ? " ✓" : ` (Need ${(threshold * 100).toFixed(0)}%)`}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
