import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { pool } from "./db";

const JWT_SECRET = process.env.JWT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Hash password
export async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
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

// verify user with NextAuth session
async function verifyNextAuthSession(request) {
    try {
        const { getToken } = await import('next-auth/jwt');
        
        const token = await getToken({
            req: request,
            secret: NEXTAUTH_SECRET || JWT_SECRET
        });

        if (!token?.id) {
            return { error: 'No NextAuth session', status: 401 };
        }

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

// Unified authentication middleware
export async function requireAuth(request = null) {
    if (!request) {
        return { error: 'No request provided', status: 401 };
    }

    // First try Bearer token (for API access)
    const bearerToken = getBearerToken(request);
    if (bearerToken) {
        return await verifyBearerAuth(bearerToken);
    }
    
    // Try NextAuth session
    const nextAuthResult = await verifyNextAuthSession(request);
    if (nextAuthResult.user) {
        return nextAuthResult;
    }

    return { error: 'No authentication provided', status: 401 };
}

// NextAuth configuration options
export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null;
                    }

                    // Find user
                    const result = await pool.query(
                        'SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = $1 AND is_active = true',
                        [credentials.email]
                    );

                    if (result.rows.length === 0) {
                        return null;
                    }

                    const user = result.rows[0];

                    // Check if user has a password set
                    if (!user.password_hash) {
                        return null;
                    }

                    // Verify password
                    const isValid = await verifyPassword(credentials.password, user.password_hash);

                    if (!isValid) {
                        return null;
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.avatar_url
                    };
                } catch (error) {
                    console.error("Authorize error:", error);
                    return null;
                }
            }
        })
    ],

    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google" || account?.provider === "github") {
                try {
                    // Check if user exists with this OAuth provider
                    const existingUser = await pool.query(
                        'SELECT id, email, name FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2',
                        [account.provider, account.providerAccountId]
                    );

                    if (existingUser.rows.length > 0) {
                        // User exists with this OAuth provider, update last login
                        await pool.query(
                            'UPDATE users SET updated_at = NOW() WHERE id = $1',
                            [existingUser.rows[0].id]
                        );
                        user.id = existingUser.rows[0].id;
                        return true;
                    }

                    // Check if user exists with same email (for account linking)
                    const emailUser = await pool.query(
                        'SELECT id, oauth_provider, password_hash FROM users WHERE email = $1',
                        [user.email]
                    );

                    if (emailUser.rows.length > 0) {
                        // User exists with same email
                        const existingUserData = emailUser.rows[0];

                        // If user already has an OAuth provider set but it's different
                        if (existingUserData.oauth_provider && existingUserData.oauth_provider !== account.provider) {
                            console.error(`Email already linked to ${existingUserData.oauth_provider}`);
                            return false;
                        }

                        // Link OAuth to existing email/password account
                        await pool.query(
                            `UPDATE users 
                            SET oauth_provider = $1, 
                                oauth_provider_id = $2, 
                                avatar_url = COALESCE(avatar_url, $3),
                                email_verified = true,
                                updated_at = NOW()
                            WHERE id = $4`,
                            [account.provider, account.providerAccountId, user.image || profile?.avatar_url || profile?.picture, existingUserData.id]
                        );

                        user.id = existingUserData.id;
                        return true;
                    }

                    // Create new user with OAuth (no password required for OAuth-only users)
                    const newUser = await pool.query(
                        `INSERT INTO users (email, name, oauth_provider, oauth_provider_id, avatar_url, email_verified, is_active, password_hash)
                        VALUES ($1, $2, $3, $4, $5, true, true, NULL)
                        RETURNING id`,
                        [user.email, user.name || profile?.name, account.provider, account.providerAccountId, user.image || profile?.avatar_url || profile?.picture]
                    );

                    user.id = newUser.rows[0].id;
                    return true;
                } catch (error) {
                    console.error("OAuth sign-in error:", error);
                    return false;
                }
            }
            return true;
        },

        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.picture = user.image;
            }
            if (account) {
                token.provider = account.provider;
            }
            return token;
        },

        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.image = token.picture;
                session.user.provider = token.provider;
            }
            return session;
        }
    },

    pages: {
        signIn: '/',
        error: '/',
    },

    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },

    secret: NEXTAUTH_SECRET,
};