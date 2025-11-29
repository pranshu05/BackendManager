"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/lib/auth-helpers";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { showToast } from "nextjs-toast-notify";
import Link from "next/link";

export default function SignupForm() {
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState("");
    const [error, setError] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        // TC_REG_07: Validate Name (Cannot be empty or just spaces)
        if (!form.name.trim()) {
            showToast.error("Name cannot be empty.", {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            setLoading(false);
            return;
        }
        // Validate Email Format (Must have text, @, text, dot, text)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            showToast.error("Invalid email format.", {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            setLoading(false);
            return;
        }
        // Validate Email Case (Must be lowercase to prevent duplicates)
        if (/[A-Z]/.test(form.email)) {
            showToast.error("Email must be in lowercase.", {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            setLoading(false);
            return;
        }

        // 1. Validate: Check if password contains at least one number
        // If NO number -> Red Error Toast
        if (!/\d/.test(form.password)) {
            showToast.error("Password must contain at least one number.", {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            setLoading(false);
            return;
        }

        // 2. Validate: Check if passwords match
        if (form.password !== form.confirmPassword) {
            showToast.error("Passwords do not match", {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            setLoading(false);
            return;
        }

         try {
            await registerUser(form);
            setEmailSent(true);
            
            // 3. Success: Account created -> Green Success Toast (Like your screenshot)
            showToast.success("Account created successfully! Verification email sent.", {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            
            // Start cooldown for resend (60 seconds)
            setCanResend(false);
            setResendCooldown(60);
            
            const countdown = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdown);
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
           
        } catch (err) {
            // Handle Rate Limit or other errors with Red Toast
            if (err.statusCode === 429) {
                setEmailSent(true);
                setError(""); 
                
                showToast.error(err.message, {
                    duration: 4000,
                    progress: true,
                    position: "top-center",
                    transition: "bounceIn",
                });

                const initialCooldown = err.remainingTime ? Math.ceil(err.remainingTime * 60) : 120;
                setCanResend(false);
                setResendCooldown(initialCooldown);
                
                const countdown = setInterval(() => {
                    setResendCooldown((prev) => {
                        if (prev <= 1) {
                            clearInterval(countdown);
                            setCanResend(true);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setError(err.message);
                showToast.error(err.message || "Registration failed", {
                    duration: 3000,
                    progress: true,
                    position: "top-center",
                    transition: "bounceIn",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {emailSent && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                        <p className="font-semibold">✓ Verification email sent!</p>
                        <p className="mt-1">Please check your inbox at <strong>{form.email}</strong> and click the verification link.</p>
                    </div>
                )}
                <div className="space-y-2">
                    <label className="text-sm">Full Name</label>
                    <Input
                        type="text"
                        placeholder="Enter your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        disabled={emailSent}
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm">Email</label>
                    <Input
                        type="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        disabled={emailSent}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm">Password</label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            disabled={emailSent}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                            disabled={emailSent}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm">Confirm Password</label>
                    <div className="relative">
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            disabled={emailSent}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                            disabled={emailSent}
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {emailSent ? (
                    <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loading || !canResend}
                        variant="outline"
                    >
                        {loading && "Resending..."}
                        {!loading && canResend && "Resend Verification Email"}
                        {!loading && !canResend && `Resend in ${resendCooldown}s`}
                    </Button>
                ) : (
                    <Button 
    type="submit" 
    className="w-full cursor-pointer" 
    disabled={loading || oauthLoading || !form.name || !form.email || !form.password || !form.confirmPassword}
>
    {loading ? "Creating account..." : "Create Account"}
</Button>
                )}
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
                    className="w-full cursor-pointer"
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
                    className="w-full cursor-pointer"
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