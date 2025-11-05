import { requireAuth, createJWTToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

// generate API token so that third-party can access..
export async function POST(request) {
    try{
        // authenticating user via session
        const authResult = await requireAuth(request);

        if(authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const user = authResult.user;

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
            usage:{
                description: 'Use this token in the Authorization header',
                example: 'Authorization: Bearer '+apiToken
            }
        });

    }catch(error) {
        console.error('Token generation error:',error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to generate token' 
            },
            { status: 500 }
        );
    }
}
