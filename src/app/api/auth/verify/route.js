import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { generateSessionToken, setSessionCookie } from '@/lib/auth';

export async function GET(request){
    try{
        const url=new URL(request.url);
        const token=url.searchParams.get("token");
        if(!token){
            return NextResponse.json({error:"Verification token is missing"}, {status:400});
        }
   
            const pending_user=await pool.query(
                `SELECT * from pending_users where verify_token=$1 AND token_expires_at > NOW()`,
                [token]
            )
            if(pending_user.rows.length===0)
            {
                return NextResponse.json({error:"Invalid or expired verification link. Please try again"}, {status:400});
            }

            const user = pending_user.rows[0];
            const result = await pool.query(`INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at`,
            [user.email, user.password_hash, user.name]
    );
            const verified_user=result.rows[0];

          //Deleting from pending users table
            await pool.query(`DELETE from pending_users where id=$1`, [user.id]);
          // Create session
            const sessionToken = generateSessionToken();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);
            await pool.query(`
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES ($1, $2, $3)`, [verified_user.id, sessionToken, expiryDate]);

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
                to: [{ email: verified_user.email}],
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

      console.log("Email sent: ");
     
    } catch (err) {
    
      console.log("Error sending email: ", err);
    }
   return NextResponse.redirect(`${process.env.web_url}`);

    }
    catch(error){
        console.error("Verification error: ", error);
        return NextResponse.json({error:"Internal Server Error"}, {status:500});
    }
}