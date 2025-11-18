import { signOut as nextAuthSignOut, useSession } from "next-auth/react";

// Login Function
export async function registerUser({ name, email, password, confirmPassword }) {
    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    if (!res.ok) {
        const error = await res.json();
        // Create error object with additional data for rate limiting
        const err = new Error(error.error || error.message || "Registration failed");
        err.statusCode = res.status;
        err.remainingTime = error.remainingTime;
        throw err;
    }

    return res.json();
}

// Email Check Function
export async function checkemail({ email }) {
    const res = await fetch("/api/auth/emailcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Password reset failed. Account may not exist.");
    }
    return res.json();
}

// OTP Verification Function
export async function otpcheck({ email, otp }) {
    const res = await fetch("/api/auth/otpcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    });

    if (!res.ok) {
        await res.json();
        throw new Error("OTP verification failed.");
    }
    return res.json();
}

// Reset Password Function
export async function resetPassword({ email, newpwd, confirmPassword }) {
    const res = await fetch("/api/auth/updatepwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newpwd, confirmPassword }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Password reset failed.");
    }

    return res.json();
}

// Logout Function
export async function logout() {
    try {
        // Call logout endpoint to clear session cookie
        await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'include'
        });
        
        // Also try NextAuth logout (works for OAuth users)
        await nextAuthSignOut({ redirect: false });
        
        // Force redirect to home
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even on error
        window.location.href = '/';
    }
}

// Session Hook
export function useCurrentUser() {
    const { data: session, status } = useSession();
    
    return {
        user: session?.user || null,
        isLoading: status === "loading",
        isAuthenticated: status === "authenticated",
    };
}