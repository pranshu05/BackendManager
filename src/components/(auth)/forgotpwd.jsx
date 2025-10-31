"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { checkemail, otpcheck, resetPassword } from "@/lib/api";

export default function forgotpwd() {
    const [form, setForm] = useState({ email: "" });
    const [form2, setForm2] = useState({ email: "", otp: "" });
    const [updatedpwd, setupdatedpwd] = useState({ email: "", newpwd: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verify, setverify] = useState(false);
    const [afterverify, setafterverify] = useState(false);
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
                    <Button type="submit" className="w-full" disabled={loading}>
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
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Verifying..." : "Verify"}
                    </Button>
                </form> :
                    <form onSubmit={handlenewpwd} className="space-y-4">
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="space-y-2">
                            <label className="text-sm">Password</label>
                            <Input
                                type="text"
                                placeholder="Enter New Password"
                                value={updatedpwd.newpwd}
                                onChange={(e) => setupdatedpwd({ ...updatedpwd, newpwd: e.target.value })}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </form>
            }
        </>

    );
}



