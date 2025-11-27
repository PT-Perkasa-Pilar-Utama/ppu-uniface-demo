"use client";

import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface WebcamCaptureProps {
    onCapture: (file: File) => void;
    buttonText?: string;
}

export function WebcamCapture({ onCapture, buttonText = "Capture from Webcam" }: WebcamCaptureProps) {
    const [isOpen, setIsOpen] = useState(false);
    const webcamRef = useRef<Webcam>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const capture = () => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
                onCapture(file);
                setIsOpen(false);
            });
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
                <Camera className="mr-2 h-4 w-4" />
                {buttonText}
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-background rounded-lg p-6 max-w-2xl w-full space-y-4 relative" style={{ zIndex: 10000 }}>
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Capture Photo</h3>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="relative rounded-lg overflow-hidden bg-black">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-auto"
                        videoConstraints={{ facingMode: "user" }}
                    />
                </div>

                <div className="flex gap-2">
                    <Button onClick={capture} className="flex-1 cursor-pointer bg-primary hover:bg-primary/90">
                        <Camera className="mr-2 h-4 w-4" />
                        Capture
                    </Button>
                    <Button variant="destructive" onClick={() => setIsOpen(false)} className="cursor-pointer">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
