import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request) {
    try {
        const { email, newpwd } = await request.json();

        if (!email || !newpwd) {
            return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length == 0) {
            return NextResponse.json(
                { error: 'User with this email does not exist in Registered Users' },
                { status: 409 }
            );
        }

        const hashedPassword = await hashPassword(newpwd);
        
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashedPassword, email]
        );

        return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });

    }
    catch (error) {
        console.log("Error in pwd update:", error);
        return NextResponse.json({ error: "Error in Password Update" }, { status: 500 });
    }
}