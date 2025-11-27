"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/file-drop-zone";
import { SampleSelector } from "@/components/sample-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Plus, User } from "lucide-react";

export default function SearchPage() {
    const [image, setImage] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [faces, setFaces] = useState<any[]>([]);
    const [mode, setMode] = useState<"search" | "add">("search");

    const fetchFaces = async () => {
        const res = await fetch("/api/faces");
        const data = await res.json();
        setFaces(data);
    };

    useEffect(() => {
        fetchFaces();
    }, []);

    const handleFileSelect = (file: File) => {
        const url = URL.createObjectURL(file);
        setImage(url);
        setResults([]);
    };

    const handleSearch = async () => {
        if (!image) return;
        setLoading(true);
        try {
            const blob = await fetch(image).then((r) => r.blob());
            const formData = new FormData();
            formData.append("file", blob);

            const res = await fetch("/api/search", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!image || !name) return;
        setLoading(true);
        try {
            const blob = await fetch(image).then((r) => r.blob());
            const formData = new FormData();
            formData.append("file", blob);
            formData.append("name", name);

            await fetch("/api/faces", {
                method: "POST",
                body: formData,
            });

            setName("");
            setImage(null);
            fetchFaces();
            alert("Face added successfully!");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6 text-center">Face Search & Database</h1>

            <div className="flex justify-center gap-4 mb-8">
                <Button
                    variant={mode === "search" ? "default" : "outline"}
                    onClick={() => setMode("search")}
                    className="cursor-pointer"
                >
                    <Search className="mr-2 h-4 w-4" /> Search Face
                </Button>
                <Button
                    variant={mode === "add" ? "default" : "outline"}
                    onClick={() => setMode("add")}
                    className="cursor-pointer"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add to Database
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>{mode === "search" ? "Search Input" : "Add New Face"}</CardTitle>
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

                            {mode === "add" && (
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter person's name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            )}

                            <Button
                                onClick={mode === "search" ? handleSearch : handleAdd}
                                disabled={!image || loading || (mode === "add" && !name)}
                                className="w-full cursor-pointer bg-primary hover:bg-primary/90"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === "search" ? "Search Database" : "Save to Database"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>{mode === "search" ? "Search Results" : "Database Faces"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {mode === "search" ? (
                                <div className="space-y-4">
                                    {results.length > 0 ? (
                                        results.map((match, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-primary/10 p-3 rounded-full">
                                                        <User className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-lg">{match.face.name}</p>
                                                        <p className="text-xs text-muted-foreground">ID: {match.face.id}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono text-green-600 font-bold text-xl">
                                                        {(match.similarity * 100).toFixed(2)}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Match</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-center py-10">
                                            {loading ? "Searching..." : "No matches found or search not started."}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-auto">
                                    {faces.map((face) => (
                                        <div key={face.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <User className="h-5 w-5 text-muted-foreground" />
                                                <span className="font-medium">{face.name}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(face.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                    {faces.length === 0 && (
                                        <p className="text-muted-foreground text-center py-10">Database is empty.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
