import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request) {
    try {
        const { email, otp } = await request.json();

        // Fetch user id based on email
        const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
        }

        const userId = userResult.rows[0].id;

        // Check OTP
        const otpResult = await pool.query(
            "SELECT id, otp, expires_at FROM password_resets WHERE user_id = $1 AND used = false ORDER BY created_at DESC LIMIT 1",
            [userId]
        );

        if (otpResult.rows.length === 0) {
            return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
        }

        const { id: resetId, otp: storedOtp, expires_at } = otpResult.rows[0];

        if (storedOtp !== otp) {
            return NextResponse.json({ error: "OTP does not match" }, { status: 400 });
        }

        const now = new Date();
        const expiresAtDate = new Date(expires_at);

        if (now > expiresAtDate) {
            return NextResponse.json({ error: "Expired" }, { status: 400 });
        }

        // Delete the used OTP entry
        await pool.query("DELETE FROM password_resets WHERE id = $1", [resetId]);
        return NextResponse.json({ message: "OTP verified Successfully!!" }, { status: 200 });

    } catch (error) {
        console.error('OTP check error:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}