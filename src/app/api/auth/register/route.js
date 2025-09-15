import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword, generateSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, password, name } = await request.json();

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

        // Hash password and create user
        const hashedPassword = await hashPassword(password);

        const result = await pool.query(`
            INSERT INTO users (email, password_hash, name)
            VALUES ($1, $2, $3)
            RETURNING id, email, name, created_at
        `, [email, hashedPassword, name]);

        const user = result.rows[0];

        // Create session
        const sessionToken = generateSessionToken();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        await pool.query(`
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, sessionToken, expiryDate]);

        // Set cookie
        // User will be logged in immediately after registration
        setSessionCookie(sessionToken);

        return NextResponse.json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}