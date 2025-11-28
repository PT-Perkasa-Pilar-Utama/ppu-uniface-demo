import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanFace, UserRoundSearch, Users, UserCheck, Search, ShieldCheck } from "lucide-react";

const features = [
    {
        title: "Face Detection",
        description: "Detect faces and landmarks in images.",
        href: "/detect",
        icon: ScanFace,
    },
    {
        title: "Face Recognition",
        description: "Generate and view face embeddings.",
        href: "/recognize",
        icon: UserRoundSearch,
    },
    {
        title: "Spoofing Detection",
        description: "Detect if a face image is real or spoofed.",
        href: "/spoofing",
        icon: ShieldCheck,
    },
    {
        title: "Face Verification",
        description: "Verify if two faces belong to the same person.",
        href: "/verify",
        icon: UserCheck,
    },
    {
        title: "Attendance Simulation",
        description: "Simulate attendance system with live camera.",
        href: "/attendance",
        icon: Users,
    },
    {
        title: "Face Search",
        description: "Search for a face in the database.",
        href: "/search",
        icon: Search,
    },
];

export default function Home() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-4xl font-bold mb-2 text-center">PPU Uniface Demo</h1>
            <p className="text-muted-foreground text-center mb-10">
                Explore the capabilities of the ppu-uniface library.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature) => (
                    <Card key={feature.href} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <feature.icon className="h-6 w-6 text-primary" />
                                <CardTitle>{feature.title}</CardTitle>
                            </div>
                            <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={feature.href} passHref>
                                <Button className="w-full bg-primary hover:bg-primary/90">Try it</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
