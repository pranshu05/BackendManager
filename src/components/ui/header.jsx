import React from 'react'
import { Button } from "@/components/ui/button";
import { CircleUserRound } from 'lucide-react';
import {
    Database,
    LogOut,
} from "lucide-react";

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
                    <div className="side flex items-center">
                        <CircleUserRound  className='hover:cursor-pointer' />
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
