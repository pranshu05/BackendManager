export async function loginUser({ email, password }) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // important so cookies get set
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
    }

    return res.json();
}

//This function used to verify that the entered email exists
//OTP Mail sent to the entered email address 
export async function checkemail({ email }) {
    const res = await fetch("/api/auth/emailcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Password reset failed. Account may not exist.");
    }
    return res.json();
}



export async function otpcheck({email,otp})
{
    const res = await fetch("/api/auth/otpcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email,otp}),
    });
    if(!res.ok)
    {
        const error = await res.json();
        throw new Error("OTP verification failed.");
    }
    return res.json();
}


export async function resetPassword({ email, newpwd }) {
    const res = await fetch("/api/auth/updatepwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newpwd }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Password reset failed.");
    }

    return res.json();
}



export async function registerUser({ name, email, password }) {
    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
    }

    return res.json();
}



export async function fetchProjects(session) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/projects`, {
        headers: {
            Cookie: `dbuddy-session=${session}`,
        },
        cache: "no-store", // always fresh
    });

    if (!res.ok) {
        console.error("Failed to fetch projects", res.status, await res.text());
        return [];
    }

    const data = await res.json();
    return data.projects || [];
}