import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword, generateSessionToken, setSessionCookie } from '@/lib/auth';

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


    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const result = await pool.query(`
            INSERT INTO users (email, password_hash, name)
            VALUES ($1, $2, $3)
            RETURNING id, email, name, created_at
        `, [email, hashedPassword, name]);

    const user = result.rows[0];

    // Create session
    const sessionToken = generateSessionToken();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    await pool.query(`
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, sessionToken, expiryDate]);

    // Set cookie
    // User will be logged in immediately after registration
    setSessionCookie(sessionToken);
    try {

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
          subject: "Welcome to DBuddy - Your Database Companion!",
          htmlContent: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to DBuddy</title>
    <script
  src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.1/dist/dotlottie-wc.js"
  type="module"
></script>
    <style>
.btn-gradient-1 {
  border-width: 2px;
  border-style: solid;
  border-image: linear-gradient(to right, #133E87, darkorchid) 1;
}

      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: 'Fira Sans', Arial, sans-serif;
        color: #333;
      }

      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
      }

      .header {
        color: #133E87;
        text-align: center;
      }

      .header h1 {
        font-size: 24px;
      }

      .content {
        padding: 20px 40px;
      }

      .content p {
        font-size: 15px;
        line-height: 22px;
        margin-bottom: 15px;
      }

      .features {
        padding-left: 20px;
      }

      .features li {
        margin-bottom: 10px;
      }

      .button {
        display: inline-block;
        background-color: #133E87;
        color: white;
        text-decoration: none;
        padding: 10px 18px;
        border-radius: 4px;
        font-size: 15px;
        margin-top: 20px;
      }
      @media (max-width: 600px) {
        .content {
          padding: 20px;
        }
        .header h1 {
          font-size: 20px;
        }
      }
    </style>
  </head>
  

  <body>
    <div class="email-container btn-gradient-1">
      <div class="header">
        <h1>Hi there!! Welcome to DBuddy</h1>
        <p>Your Database Companion</p>
      </div>

      <div class="content">
        <p>
          Thank you for signing up. We’re thrilled to have you on board. DBuddy helps you create
          and manage NoSQL databases effortlessly — no technical expertise
          required!!
        </p>

        <ul class="features" style="list-style: none;">
          
<li> 
<b> <div style="display: flex; align-items: center;">AI-Powered Creation</div></b></li>
<p style="margin-top: 0px;">Automatically generate databases and schemas from your descriptions</p>

          <li><b><div style="display: flex; align-items: center;"> 
One-Click Deployment</div></b></li>
          <p>Deploy your databases instantly with just a button click</p>
          <li><b><div style="display: flex; align-items: center;">Smart Queries</div></b></b></li>
<p>Write queries in plain English and get results instantly</p>
        </ul>

        <a href="https://yourwebsite.com" class="button" style="color: white;">Get Started</a>
      </div>
    </div>
  </body>
</html>
`
        })
      });

      console.log("Email sent: ", info);
      // return NextResponse.json({message:"Email sent successfully",info:info })

    } catch (err) {
      console.log("Error sending email: ", err);
      // return NextResponse.json({error:"Error sending email"})
    }
    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}