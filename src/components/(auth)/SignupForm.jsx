"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/lib/api";

export default function SignupForm() {
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

         try {
            await registerUser(form);
            setEmailSent(true);
            
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
            // If it's a rate limit error (429), show the email sent state
            if (err.statusCode === 429) {
                setEmailSent(true);
                setError(""); // Clear error since email was already sent
                
                // Set cooldown based on remaining time from server
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
            }
        } finally {
            setLoading(false);
        }
    };

    return (
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
                <Input
                    type="password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    disabled={emailSent}
                />
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
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                </Button>
            )}
        </form>
    );
}