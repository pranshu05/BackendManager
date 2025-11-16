import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";

export function generateOTP() {
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
}

export async function POST(request) {
    try {
        const { email } = await request.json();

        // Check if user exists
        const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
        }

        // Email exists
        const userId = userResult.rows[0].id;
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // valid for 5 minutes

        // Insert or update OTP record
        await pool.query(`
            INSERT INTO password_resets (user_id, otp, expires_at)
            VALUES ($1, $2, $3)
        `,
            [userId, otp, expiresAt]
        );

        // Send the OTP email via Brevo
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                accept: "application/json",
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sender: { name: "DBuddy Support", email: process.env.EMAIL },
                to: [{ email }],
                subject: "Your DBuddy Password Reset Code",
                htmlContent: `
                    <p>Hello,</p>
                    <p>Your password reset code is:</p>
                    <h2 style="font-size:24px; letter-spacing:3px;">${otp}</h2>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn’t request this, you can ignore this email.</p>
                `,
            }),
        });

        if (!brevoResponse.ok) {
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({ message: "OTP sent successfully" }, { status: 200 });

    } catch (error) {
        console.error('Email check error:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}