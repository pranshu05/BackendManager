"use client";

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { CircleUserRound, HelpCircle, Shield, Database, LogOut } from 'lucide-react';

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

const Header = () => {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Check if user is admin
        const checkAdmin = async () => {
            try {
                const res = await fetch('/api/admin/check');
                if (res.ok) {
                    const data = await res.json();
                    setIsAdmin(data.isAdmin);
                }
            } catch (error) {
                // Silently fail - user is not admin
            }
        };
        checkAdmin();
    }, []);

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
                        {isAdmin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => (window.location.href = "/admin")}
                                className="cursor-pointer"
                                title="Admin Panel">
                                <Shield className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/help")}
                            className="cursor-pointer"
                            title="Help & Support">
                            <HelpCircle className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/profile")}
                            className="cursor-pointer"
                            title="Profile">
                            <CircleUserRound className="hover:cursor-pointer" />
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <a onClick={handleLogout} className="hover:cursor-pointer" title="Logout">
                                <LogOut className="w-4 h-4" />
                            </a>
                        </Button>
                    </div>
                </div>
            </header>
        </div>
    );
};

export default Header;