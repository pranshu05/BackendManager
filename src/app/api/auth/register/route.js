import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();
    const emailid = email
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

    await pool.query('Delete from pending_users where email=$1',[email]);

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const verification_token= crypto.randomBytes(32).toString('hex');

     await pool.query(
      `INSERT INTO pending_users (email, name, password_hash, verify_token)
       VALUES ($1, $2, $3, $4)`,
      [email, name, hashedPassword, verification_token]
    );
    const verification_link=`${process.env.web_url}/api/auth/verify?token=${verification_token}`;

    //Send email for verification purpose
    try{
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { email: process.env.EMAIL },
          to: [{ email: emailid }],
          subject: "Please verify your email for DBuddy!!",
          htmlContent:`<div style="font-family:sans-serif;">
            <h2>Welcome to Dbuddy, ${name}!</h2>
            <p>Click below to verify your email and activate your account:</p>
            <a href="${verification_link}" 
              style="background:#133E87;color:white;padding:10px 15px;
                     border-radius:6px;text-decoration:none;">Verify My Email</a>
            <p>This link will expire in 30 minutes.</p>
          </div>`
        })
      });
    }catch(err){
      console.log("Error sending verification email: ", err);
      return NextResponse.json({error:"Error sending verification email"}, {status:500});
    }

    return NextResponse.json({
    message:'Email verfication link sent on your entered email address. Please check your inbox!!'
    })
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

