import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const { email, password, name } = await request.json();
        const emailid = email

        // Validate input
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return NextResponse.json(
                { error: 'User already exists with this email' },
                { status: 409 }
            );
        }

        // Check if there's already a pending verification for this email
        const pendingUser = await pool.query(
            'SELECT id, email, token_expires_at, verify_token FROM pending_users WHERE email = $1',
            [email]
        );

        let verification_token;
        let verification_link;
        const tokenExpiryMinutes = 30; // Token valid for 30 minutes
        const rateLimitMinutes = 2; // Minimum time between resends

        if (pendingUser.rows.length > 0) {
            const tokenExpiresAt = new Date(pendingUser.rows[0].token_expires_at);
            const now = new Date();
            const minutesUntilExpiry = (tokenExpiresAt - now) / (1000 * 60);

            // Check if token is still valid and was created recently
            // If token expires in more than 28 minutes (meaning it was created less than 2 minutes ago)
            if (minutesUntilExpiry > (tokenExpiryMinutes - rateLimitMinutes) && minutesUntilExpiry > 0) {
                const minutesSinceCreation = tokenExpiryMinutes - minutesUntilExpiry;
                const remainingTime = rateLimitMinutes - minutesSinceCreation;
                
                // Only rate limit if there's actually remaining time
                if (remainingTime > 0) {
                    return NextResponse.json({
                        error: 'A verification email was already sent recently. Please check your inbox or wait a few minutes before requesting another one.',
                        remainingTime: remainingTime
                    }, { status: 429 }); // 429 Too Many Requests
                }
            }

            // If more than 2 minutes have passed, allow resending with a new token
            verification_token = crypto.randomBytes(32).toString('hex');
            verification_link = `${process.env.web_url}/api/auth/verify?token=${verification_token}`;

            const newExpiryDate = new Date();
            newExpiryDate.setMinutes(newExpiryDate.getMinutes() + tokenExpiryMinutes);

            // Update with new token and expiry
            const hashedPassword = await hashPassword(password);
            const updateResult = await pool.query(
                'UPDATE pending_users SET verify_token = $1, token_expires_at = $2, password_hash = $3, name = $4 WHERE email = $5 RETURNING id',
                [verification_token, newExpiryDate, hashedPassword, name, email]
            );

            // Verify the update was successful
            if (updateResult.rows.length === 0) {
                return NextResponse.json(
                    { error: 'Failed to update pending user' },
                    { status: 500 }
                );
            }
        } else {
            // Hash password and create new pending user
            const hashedPassword = await hashPassword(password);
            verification_token = crypto.randomBytes(32).toString('hex');

            const expiryDate = new Date();
            expiryDate.setMinutes(expiryDate.getMinutes() + tokenExpiryMinutes);

            const insertResult = await pool.query(`
                INSERT INTO pending_users (email, name, password_hash, verify_token, token_expires_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
                `,
                [email, name, hashedPassword, verification_token, expiryDate]
            );

            // Verify the insert was successful
            if (insertResult.rows.length === 0) {
                return NextResponse.json(
                    { error: 'Failed to create pending user' },
                    { status: 500 }
                );
            }

            verification_link = `${process.env.web_url}/api/auth/verify?token=${verification_token}`;
        }

        //Send email for verification purpose
        try {
            await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: { email: process.env.EMAIL },
                    to: [{ email: emailid }],
                    subject: "Please verify your email for DBuddy!!",
                    htmlContent: `<div style="font-family:sans-serif;">
                    <h2>Welcome to Dbuddy, ${name}!</h2>
                    <p>Click below to verify your email and activate your account:</p>
                    <a href="${verification_link}" 
                    style="background:#133E87;color:white;padding:10px 15px;
                            border-radius:6px;text-decoration:none;">Verify My Email</a>
                    <p>This link will expire in 30 minutes.</p>
                </div>`
                })
            });
        } catch {
            return NextResponse.json({ error: "Error sending verification email" }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Email verfication link sent on your entered email address. Please check your inbox!!'
        })

    } catch {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}