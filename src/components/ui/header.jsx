"use client";

import React from 'react'
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { CircleUserRound } from 'lucide-react';
import {
    Database,
    LogOut,
} from "lucide-react";

const handleLogout = async () => {
    try {
        // Call logout endpoint to clear NextAuth session cookies
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include" // Ensure cookies are sent and received
        });

        // Also explicitly sign out from NextAuth to trigger its cleanup
        try {
            await signOut({
                redirect: false,
                callbackUrl: "/"
            });
        } catch (e) {
            console.error('NextAuth signOut error:', e);
        }

        // Force redirect to home page after a small delay to ensure cookies are cleared
        setTimeout(() => {
            window.location.href = "/";
        }, 100);
    } catch (error) {
        console.error("Logout error:", error);
        // Force redirect even on error to clear client state
        window.location.href = "/";
    }
};

const header = () => {
    const router = useRouter();

    return (
        <div>
            <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-primary rounded-xl">
                            <Database className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">DBuddy</h1>
                            <p className="text-sm text-primary">Your Database Companion</p>
                        </div>
                    </div>
                    <div className="side flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/profile")}
                            className="cursor-pointer">
                            <CircleUserRound className='hover:cursor-pointer' />
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <a onClick={handleLogout} className='hover:cursor-pointer'>
                                <LogOut className="w-4 h-4" />
                            </a>
                        </Button>
                    </div>

                </div>
            </header>
        </div>
    )
}

export default header