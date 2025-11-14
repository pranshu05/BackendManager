import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';

// GET: Fetch user profile
export const GET = withAuth(async (_request, _context, user) => {
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
        [user.id]
    );

    // no profile -> return user info with null profile fields
    if (result.rows.length === 0) {
        const userResult = await pool.query(
            `SELECT id as user_id, email, name as username FROM users WHERE id = $1`,
            [user.id]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    return NextResponse.json({ profile: result.rows[0] });
});

// PUT: Update user profile
export const PUT = withAuth(async (request, _context, user) => {
    const body = await request.json();
    const {
        phone_number = null,
        address = null,
        city = null,
        pincode = null,
        nationality = null,
        birth_date = null,
        organization_name = null,
        organization_type = null,
        joining_date = null,
        role = null
    } = body || {};

    // upsert using on conflict (on user_id). COALESCE keeps existing value if new value is null
    const result = await pool.query(
        `INSERT INTO user_profiles (
            user_id, phone_number, address, city, pincode, nationality, birth_date,
            organization_name, organization_type, joining_date, role, created_at, updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number),
            address = COALESCE(EXCLUDED.address, user_profiles.address),
            city = COALESCE(EXCLUDED.city, user_profiles.city),
            pincode = COALESCE(EXCLUDED.pincode, user_profiles.pincode),
            nationality = COALESCE(EXCLUDED.nationality, user_profiles.nationality),
            birth_date = COALESCE(EXCLUDED.birth_date, user_profiles.birth_date),
            organization_name = COALESCE(EXCLUDED.organization_name, user_profiles.organization_name),
            organization_type = COALESCE(EXCLUDED.organization_type, user_profiles.organization_type),
            joining_date = COALESCE(EXCLUDED.joining_date, user_profiles.joining_date),
            role = COALESCE(EXCLUDED.role, user_profiles.role),
            updated_at = NOW()
        RETURNING id, user_id, phone_number, address, city, pincode, nationality, birth_date,
                    organization_name, organization_type, joining_date, role, created_at, updated_at
        `,
        [
            user.id,
            phone_number,
            address,
            city,
            pincode,
            nationality,
            birth_date,
            organization_name,
            organization_type,
            joining_date,
            role
        ]
    );

    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: result.rows[0] });
});