export async function loginUser({ email, password }) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // important so cookies get set
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
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
        const errorData = await res.json();
        throw new Error(errorData.message || "Password reset failed. Account may not exist.");
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
        await res.json();
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
        const errorData = await res.json();
        throw new Error(errorData.message || "Password reset failed.");
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
        // Create error object with additional data for rate limiting
        const err = new Error(error.error || error.message || "Registration failed");
        err.statusCode = res.status;
        err.remainingTime = error.remainingTime;
        throw err;
    }

    return res.json();
}