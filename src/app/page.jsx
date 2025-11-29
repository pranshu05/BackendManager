import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/(auth)/LoginForm";
import SignupForm from "@/components/(auth)/SignupForm";
import { Database, Sparkles, Zap, Brain } from "lucide-react";

export default function Page() {
    // Render landing/auth page if no session
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/30 to-secondary/40">
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                {/* Left side - Showcase */}
                <div className="text-foreground space-y-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-primary rounded-xl">
                            <Database className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">DBuddy</h1>
                            <p className="text-primary">Your Database Companion</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-bold leading-tight">
                            Create databases with natural language
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            No more complex SQL queries. Just tell us what you want, and we'll build it for you.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Sparkles className="w-6 h-6 text-accent-foreground mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold">AI-Powered Creation</h3>
                                <p className="text-muted-foreground">Automatically generate databases and schemas from your descriptions</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Zap className="w-6 h-6 text-accent-foreground mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold">One-Click Deployment</h3>
                                <p className="text-muted-foreground">Deploy your databases instantly with just a button click</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Brain className="w-6 h-6 text-accent-foreground mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold">Smart Queries</h3>
                                <p className="text-muted-foreground">Write queries in plain English and get results instantly</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Auth form */}
                <div className="w-full max-w-md mx-auto">
                    <Card className="shadow-2xl border-2 border-accent/30 bg-card/95 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Welcome</CardTitle>
                            <CardDescription>
                                Sign in to your account or create a new one
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="login" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="login" className="cursor-pointer data-[state=active]:!bg-white data-[state=active]:text-black data-[state=active]:shadow-sm border-0 ring-0 outline-none">Sign In</TabsTrigger>
                                    <TabsTrigger value="signup" className="cursor-pointer data-[state=active]:!bg-white data-[state=active]:text-black data-[state=active]:shadow-sm border-0 ring-0 outline-none">Sign Up</TabsTrigger>
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