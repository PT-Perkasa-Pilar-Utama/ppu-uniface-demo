"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, ScanFace, UserRoundSearch, UserCheck, Users, Search, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/detect", label: "Detection", icon: ScanFace },
    { href: "/recognize", label: "Recognition", icon: UserRoundSearch },
    { href: "/verify", label: "Verification", icon: UserCheck },
    { href: "/attendance", label: "Attendance", icon: Users },
    { href: "/spoofing", label: "Spoofing", icon: ShieldCheck },
    { href: "/search", label: "Search", icon: Search },
];

export function Navigation() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                        <ScanFace className="h-6 w-6" />
                        <span className="hidden sm:inline">PPU Uniface</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Mobile Navigation */}
                {isOpen && (
                    <div className="md:hidden py-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </nav>
    );
}
