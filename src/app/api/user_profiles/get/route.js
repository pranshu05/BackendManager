import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// method is GET (returns profile with user info)
export async function GET() {
  try {
    const authResult = await requireAuth();
    if(authResult.error){
      return NextResponse.json({error:authResult.error}, {status:authResult.status});
    }

    // joining two tables
    const result = await pool.query(
      `SELECT 
        up.id, 
        up.user_id, 
        up.phone_number, 
        up.address, 
        up.city, 
        up.pincode, 
        up.nationality, 
        up.birth_date,
        up.organization_name, 
        up.organization_type, 
        up.joining_date, 
        up.role,
        up.created_at, 
        up.updated_at,
        u.email,
        u.name as username
       FROM user_profiles up
       LEFT JOIN users u ON up.user_id = u.id
       WHERE up.user_id = $1`,
      [authResult.user.id]
    );

    //no profile -> null
    if(result.rows.length===0) {
      const userResult = await pool.query(
        `SELECT id as user_id, email, name as username FROM users WHERE id = $1`,
        [authResult.user.id]
      );
      
      if(userResult.rows.length === 0) {
        return NextResponse.json({error:'User not found'}, {status:404});
      }

      return NextResponse.json({ 
        profile: {
          user_id: userResult.rows[0].user_id,
          email: userResult.rows[0].email,
          username: userResult.rows[0].username,
          phone_number: null,
          address: null,
          city: null,
          pincode: null,
          nationality: null,
          birth_date: null,
          organization_name: null,
          organization_type: null,
          joining_date: null,
          role: null
        }
      });
    }

    return NextResponse.json({profile:result.rows[0]});
  } catch(error){
    console.error('Get user_profiles error:', error);
    return NextResponse.json({error:'Internal server error'},{status:500});
  }
}