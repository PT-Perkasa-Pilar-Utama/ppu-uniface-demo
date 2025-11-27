"use client";

import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";

interface SampleSelectorProps {
    onSelect: (file: File) => void;
    samples?: string[];
}

const DEFAULT_SAMPLES = [
    "/sample/image-haaland1.jpeg",
    "/sample/image-haaland2.png",
    "/sample/image-kevin1.png",
    "/sample/image-kevin2.jpg",
    "/sample/image-magnus1.png",
    "/sample/image-magnus2.png",
];

export function SampleSelector({ onSelect, samples = DEFAULT_SAMPLES }: SampleSelectorProps) {
    const handleSampleClick = async (path: string) => {
        try {
            const response = await fetch(path);
            const blob = await response.blob();
            const filename = path.split("/").pop() || "sample.jpg";
            const file = new File([blob], filename, { type: blob.type });
            onSelect(file);
        } catch (error) {
            console.error("Failed to load sample:", error);
        }
    };

    const getSampleName = (path: string) => {
        if (path.includes("haaland")) return "Haaland";
        if (path.includes("kevin")) return "Kevin";
        if (path.includes("magnus")) return "Magnus";
        if (path.includes("tdf")) return "Multiple";
        return "Sample";
    };

    return (
        <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Or use sample images:</p>
            <div className="flex flex-wrap gap-2">
                {samples.map((sample) => (
                    <Button
                        key={sample}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSampleClick(sample)}
                        className="cursor-pointer"
                    >
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {getSampleName(sample)}
                    </Button>
                ))}
            </div>
        </div>
    );
}
