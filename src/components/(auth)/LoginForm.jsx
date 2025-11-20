"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

export default function LoginForm() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email: form.email,
                password: form.password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                window.location.href = "/dashboard";
            }
        } catch (err) {
            setError(err.message || "An error occurred during login");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSignIn = async (provider) => {
        setOauthLoading(provider);
        setError("");
        
        try {
            await signIn(provider, { callbackUrl: "/dashboard" });
        } catch (err) {
            setError(`Failed to sign in with ${provider}`);
            setOauthLoading("");
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="space-y-2">
                    <label className="text-sm">Email</label>
                    <Input
                        type="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm">Password</label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <a href="/reset" className="text-sm flex justify-end">Forgot Password?</a>
                </div>
                <Button type="submit" className="w-full" disabled={loading || oauthLoading}>
                    {loading ? "Signing in..." : "Sign In"}
                </Button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthSignIn("google")}
                    disabled={loading || oauthLoading}
                    className="w-full"
                >
                    {oauthLoading === "google" ? (
                        "Loading..."
                    ) : (
                        <>
                            <FcGoogle className="mr-2 h-4 w-4" />
                            Google
                        </>
                    )}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthSignIn("github")}
                    disabled={loading || oauthLoading}
                    className="w-full"
                >
                    {oauthLoading === "github" ? (
                        "Loading..."
                    ) : (
                        <>
                            <FaGithub className="mr-2 h-4 w-4" />
                            GitHub
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}