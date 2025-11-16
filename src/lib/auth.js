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
    const cookieStore = await cookies();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
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
    // Delete with options to ensure it's properly cleared
    cookieStore.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0, // Expire immediately
        expires: new Date(0) // Set to past date
    });
}

// Get Bearer token from Authorization header
export function getBearerToken(request) {
    const authHeader = request?.headers?.get('Authorization');
    if (!authHeader) return null;
    
    // Format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
}

// verify user with Bearer token (JWT)
async function verifyBearerAuth(bearerToken) {
    const decoded = verifyJWTToken(bearerToken);
    
    if (!decoded?.userId) {
        return { error: 'Invalid or expired token', status: 401 };
    }

    // verify user exists and is active
    const { pool } = await import('./db');
    
    try {
        const result = await pool.query(`
            SELECT id, email, name
            FROM users
            WHERE id = $1 AND is_active = true
        `, [decoded.userId]);

        if (result.rows.length === 0) {
            return { error: 'User not found or inactive', status: 401 };
        }

        return {
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                name: result.rows[0].name
            }
        };
    } catch (error) {
        console.error('Bearer auth verification error:', error);
        return { error: 'Authentication failed', status: 500 };
    }
}

// verify with session cookie
async function verifySessionAuth(sessionToken) {
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
        console.error('Session auth verification error:', error);
        return { error: 'Authentication failed', status: 500 };
    }
}

// Middleware function to check authentication (for Bearer token, NextAuth, and legacy sessions)
export async function requireAuth(request = null) {
    // First try Bearer token (for API access)
    if (request) {
        const bearerToken = getBearerToken(request);
        if (bearerToken) {
            return await verifyBearerAuth(bearerToken);
        }
        
        // Try NextAuth session token
        const nextAuthResult = await verifyNextAuthSession(request);
        if (nextAuthResult.user) {
            return nextAuthResult;
        }
    }

    // Then try legacy session cookie (for backwards compatibility)
    const sessionToken = await getSessionCookie();
    
    if (!sessionToken) {
        return { error: 'No authentication provided', status: 401 };
    }

    return await verifySessionAuth(sessionToken);
}

// Verify NextAuth JWT session
async function verifyNextAuthSession(request) {
    try {
        const { getToken } = await import('next-auth/jwt');
        
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
        });

        if (!token?.id) {
            return { error: 'No NextAuth session', status: 401 };
        }

        // Token exists, return user data
        return {
            user: {
                id: token.id,
                email: token.email,
                name: token.name
            }
        };
    } catch (error) {
        console.error('NextAuth verification error:', error);
        return { error: 'NextAuth verification failed', status: 401 };
    }
}