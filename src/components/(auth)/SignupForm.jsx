"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/lib/api";

export default function SignupForm() {
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

         try {
            await registerUser(form);
            alert("Email verification link has been sent to your email addres");
           
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="space-y-2">
                <label className="text-sm">Full Name</label>
                <Input
                    type="text"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
            </div>
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
                <Input
                    type="password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
            </Button>
        </form>
    );
}