import { RateLimiterMemory } from 'rate-limiter-flexible';

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

export async function checkRateLimit(identifier, isAuth = false) {
    const limiter = isAuth ? authRateLimiter : rateLimiter;

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
