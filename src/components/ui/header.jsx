"use client";

import React from 'react'
import { Button } from "@/components/ui/button";
import { CircleUserRound, HelpCircle } from 'lucide-react';
import {
    Database,
    LogOut,
} from "lucide-react";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

const handleLogout = async () => {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
    } catch (error) {
        console.error("Logout error:", error);
        window.location.href = "/";
    }
};

const header = () => {
  return (
    <div>
         <header className="bg-[var(--panel-bg)] backdrop-blur-sm border-b border-[var(--border)] px-6 py-4" style={{ boxShadow: "var(--shadow)" }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl" style={{ background: "var(--primary)" }}>
                            <Database className="w-6 h-6" style={{ color: "var(--primary-contrast)" }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>DBuddy</h1>
                            <p className="text-sm" style={{ color: "var(--primary)" }}>Your Database Companion</p>
                        </div>
                    </div>
                    <div className="side flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/profile")}
                            className="cursor-pointer"
                            style={{
                                background: "transparent",
                                borderColor: "var(--border)",
                                color: "var(--text)"
                            }}
                        >
                            <CircleUserRound className='hover:cursor-pointer' />
                        </Button>
                        <ThemeSwitcher />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleLogout}
                            className='hover:cursor-pointer'
                            style={{
                                background: "transparent",
                                borderColor: "var(--border)",
                                color: "var(--text)"
                            }}
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                    
                </div>
            </header>
    </div>
  )
}

export default header
