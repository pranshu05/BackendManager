import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { pool } from "./db";
import { verifyPassword } from "./auth";

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

    secret: process.env.NEXTAUTH_SECRET,
};