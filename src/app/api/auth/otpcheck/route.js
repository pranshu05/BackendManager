import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
export async function POST(request) {
    try {
        const { email, otp } = await request.json();
        // Fetch user id based on email
        const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            console.log("No account found with that email during OTP check:", email);
            return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
        }
        const userId = userResult.rows[0].id;


        // Check OTP
        const otpResult = await pool.query(
            "SELECT id, otp, expires_at FROM password_resets WHERE user_id = $1 AND used = false ORDER BY created_at DESC LIMIT 1",
            [userId]
        );

        console.log("OTP record fetched for user:", otpResult);
        console.log("The rows got: ", otpResult.rows);
        if (otpResult.rows.length === 0) {
            console.log("No OTP record found for user during OTP check:", email);
            return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
        }

        const { id: resetId, otp: storedOtp, expires_at } = otpResult.rows[0];

        if (storedOtp !== otp) {

            console.log("Otp does not match; ", storedOtp, otp);
            return NextResponse.json({ error: "OTP does not match" }, { status: 400 });
        }
        const now = new Date();
        const expiresAtDate = new Date(expires_at);

        if (now > expiresAtDate) {
            console.log("OTP expired");
            return NextResponse.json({ error: "Expired" }, { status: 400 });
        }
        //OTP is for one time, so to avoid reuse, we set used as True
        await pool.query("UPDATE password_resets SET used = true WHERE id = $1", [resetId]);
        return NextResponse.json({ messge: "OTP verified Successfully!!" }, { status: 200 });

    } catch (err) {
        console.log("Error in OTP check:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}