"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/(auth)/LoginForm";
import SignupForm from "@/components/(auth)/SignupForm";
import { Database, Sparkles, Zap, Brain } from "lucide-react";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

export default function Page() {
    // Render landing/auth page if no session
    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: "var(--background)" }}
        >
            <div className="absolute top-4 right-4">
                <ThemeSwitcher />
            </div>
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                {/* Left side - Showcase */}
                <div className="space-y-6" style={{ color: "var(--text)" }}>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-xl" style={{ background: "var(--primary)" }}>
                            <Database className="w-8 h-8" style={{ color: "var(--primary-contrast)" }} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>DBuddy</h1>
                            <p style={{ color: "var(--primary)" }}>Your Database Companion</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-bold leading-tight" style={{ color: "var(--text)" }}>
                            Create databases with natural language
                        </h2>
                        <p className="text-xl" style={{ color: "var(--muted-text)" }}>
                            No more complex SQL queries. Just tell us what you want, and we'll build it for you.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Sparkles className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: "var(--primary)" }} />
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>AI-Powered Creation</h3>
                                <p style={{ color: "var(--muted-text)" }}>Automatically generate databases and schemas from your descriptions</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Zap className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: "var(--primary)" }} />
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>One-Click Deployment</h3>
                                <p style={{ color: "var(--muted-text)" }}>Deploy your databases instantly with just a button click</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Brain className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: "var(--primary)" }} />
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Smart Queries</h3>
                                <p style={{ color: "var(--muted-text)" }}>Write queries in plain English and get results instantly</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Auth form */}
                <div className="w-full max-w-md mx-auto">
                    <Card 
                        className="backdrop-blur-sm"
                        style={{
                            background: "var(--panel-bg)",
                            borderColor: "var(--border)",
                            boxShadow: "var(--shadow)",
                            borderWidth: "2px"
                        }}
                    >
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl" style={{ color: "var(--text)" }}>Welcome</CardTitle>
                            <CardDescription style={{ color: "var(--muted-text)" }}>
                                Sign in to your account or create a new one
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="login" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="login" className="cursor-pointer">Sign In</TabsTrigger>
                                    <TabsTrigger value="signup" className="cursor-pointer">Sign Up</TabsTrigger>
                                </TabsList>

                                <TabsContent value="login">
                                    <LoginForm />
                                </TabsContent>
                                <TabsContent value="signup">
                                    <SignupForm />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}