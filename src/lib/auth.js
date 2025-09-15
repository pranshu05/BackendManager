import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_COOKIE_NAME = 'dbuddy-session';

// Hash password
export async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

// Generate session token
export function generateSessionToken() {
    return randomBytes(32).toString('hex');
}

// Create JWT token
export function createJWTToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
        issuer: 'dbuddy-app'
    });
}

// Verify JWT token
export function verifyJWTToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// Set session cookie
export async function setSessionCookie(sessionToken) {
    const cookieStore = cookies();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days

    await cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiryDate,
        path: '/'
    });
}

// Get session cookie
export async function getSessionCookie() {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

// Clear session cookie
export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

// Middleware function to check authentication
export async function requireAuth() {
    const sessionToken = await getSessionCookie();

    if (!sessionToken) {
        return { error: 'No session token', status: 401 };
    }

    // Verify session in database
    const { pool } = await import('./db');

    try {
        const result = await pool.query(`
            SELECT u.id, u.email, u.name, s.expires_at
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = true
        `, [sessionToken]);

        if (result.rows.length === 0) {
            return { error: 'Invalid or expired session', status: 401 };
        }

        return {
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                name: result.rows[0].name
            }
        };
    } catch (error) {
        console.error('Auth verification error:', error);
        return { error: 'Authentication failed', status: 500 };
    }
}