import { signOut as nextAuthSignOut, useSession } from "next-auth/react";

// Universal logout function that works with both NextAuth and legacy sessions
export async function logout() {
    try {
        // Call logout endpoint to clear legacy session and cookie
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

// Hook to get current user from either NextAuth or legacy session
export function useCurrentUser() {
    const { data: session, status } = useSession();
    
    return {
        user: session?.user || null,
        isLoading: status === "loading",
        isAuthenticated: status === "authenticated",
    };
}