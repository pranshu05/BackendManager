import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextResponse } from 'next/server';

// Rate limiter for API endpoints
const rateLimiter = new RateLimiterMemory({
    keyType: 'string',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
});

// Rate limiter for auth endpoints (more restrictive)
const authRateLimiter = new RateLimiterMemory({
    keyType: 'string',
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds
});

// Rate limiter for AI endpoints (even more restrictive)
const aiRateLimiter = new RateLimiterMemory({
    keyType: 'string',
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds
});

export async function checkRateLimit(identifier, isAuth = false, isAI = false) {
    // Select appropriate limiter based on endpoint type
    let limiter;
    if (isAI) {
        limiter = aiRateLimiter;
    } else if (isAuth) {
        limiter = authRateLimiter;
    } else {
        limiter = rateLimiter;
    }

    try {
        await limiter.consume(identifier);
        return { success: true };
    } catch (rejRes) {
        return {
            success: false,
            msBeforeNext: rejRes.msBeforeNext,
            remainingPoints: rejRes.remainingPoints
        };
    }
}

// Middleware wrapper for rate limiting
export function withRateLimit(handler, options = {}) {
    const { isAuth = false, isAI = false } = options;

    return async (request, context) => {
        try {
            // Determine rate limit identifier (IP address)
            const forwarded = request.headers.get('x-forwarded-for');
            const ip = forwarded ? forwarded.split(',')[0] : 
                      request.headers.get('x-real-ip') || 
                      'unknown';

            // Check rate limit
            const rateLimitResult = await checkRateLimit(ip, isAuth, isAI);

            if (!rateLimitResult.success) {
                const retryAfter = Math.ceil(rateLimitResult.msBeforeNext / 1000);
                
                return NextResponse.json({
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please try again later.',
                    retryAfter,
                    remainingTime: rateLimitResult.msBeforeNext
                }, { 
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Remaining': '0'
                    }
                });
            }

            // Continue to handler
            return await handler(request, context);

        } catch (error) {
            console.error('Rate limit error:', error);
            // Don't block request on rate limiter errors
            return await handler(request, context);
        }
    };
}