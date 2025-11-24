"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { checkemail, otpcheck, resetPassword } from "@/lib/auth-helpers";
import { Eye, EyeOff } from "lucide-react";

export default function forgotpwd() {
    const [form, setForm] = useState({ email: "" });
    const [form2, setForm2] = useState({ email: "", otp: "" });
    const [updatedpwd, setupdatedpwd] = useState({ email: "", newpwd: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verify, setverify] = useState(false);
    const [afterverify, setafterverify] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const handleemailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            //Resetpwd fxn is for verifying that email exists and thhen send otp
            const user = await checkemail(form);
            console.log("Called resetpwd and got user as:", user);
            setForm2({ ...form2, email: form.email });
            setverify(true);
        } catch (err) {
            console.log("Inside CATCH");
            setError(err.message);
        } finally {
            console.log("Inside FINALLY");
            setLoading(false);
        }
    };


    const handleotpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const otpcheckresponse = await otpcheck(form2);
            console.log("Called OTPCHECK and got user as:", otpcheckresponse);
            alert("OTP verified Successfully!!");

            setafterverify(true);
            setupdatedpwd({ ...updatedpwd, email: form.email });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    const handlenewpwd = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validate password confirmation
        if (updatedpwd.newpwd !== updatedpwd.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const resetpwdresponse = await resetPassword(updatedpwd);
            console.log("Called RESETPWD and got user as:", resetpwdresponse);
            alert("Password updated Successfully!!");
            window.location.href = "/"; // redirect after login
        } catch (err) {

            setError(err.message);
        }
    }

    return (
        <>
            {
                verify == false ? <form onSubmit={handleemailSubmit} className="space-y-4">
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
                    <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                        {loading ? "Verifying..." : "Verify"}
                    </Button>
                </form> : afterverify == false ? <form onSubmit={handleotpSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="space-y-2">
                        <label className="text-sm">OTP</label>
                        <Input
                            type="otp"
                            placeholder="Enter the OTP sent to your email"
                            value={form2.otp}
                            onChange={(e) => setForm2({ ...form2, otp: e.target.value })}
                        />
                    </div>
                    <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                        {loading ? "Verifying..." : "Verify"}
                    </Button>
                </form> :
                    <form onSubmit={handlenewpwd} className="space-y-4">
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="space-y-2">
                            <label className="text-sm">New Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter New Password"
                                    value={updatedpwd.newpwd}
                                    onChange={(e) => setupdatedpwd({ ...updatedpwd, newpwd: e.target.value })}
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
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm">Confirm New Password</label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm New Password"
                                    value={updatedpwd.confirmPassword}
                                    onChange={(e) => setupdatedpwd({ ...updatedpwd, confirmPassword: e.target.value })}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </form>
            }
        </>

    );
}