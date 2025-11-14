import { createJWTToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';

// generate API token so that third-party can access..
export const POST = withAuth(async (_request, _context, user) => {
    // generating JWT for api access
    const apiToken = createJWTToken({
        userId: user.id,
        email: user.email,
        type: 'api_token'
    });

    return NextResponse.json({
        success: true,
        message: 'API token generated successfully',
        token: apiToken,
        expiresIn: '7 days',
        usage: {
            description: 'Use this token in the Authorization header',
            example: 'Authorization: Bearer ' + apiToken
        }
    });
});
