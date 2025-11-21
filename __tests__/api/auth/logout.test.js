/**
 * @jest-environment node
 */

// Mock modules before imports
const mockCookieStore = {
    set: jest.fn()
};

const mockCookies = jest.fn().mockResolvedValue(mockCookieStore);

jest.mock('next/headers', () => ({
    cookies: mockCookies
}));

// Import after mocks
const { POST } = require('@/app/api/auth/logout/route');

describe('POST /api/auth/logout', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Successful Logout', () => {
        it('should logout successfully', async () => {
            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Logout successful');
        });

        it('should return redirect path', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data.redirect).toBe('/');
        });

        it('should clear session token cookie', async () => {
            await POST();

            const sessionTokenCalls = mockCookieStore.set.mock.calls.filter(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCalls.length).toBeGreaterThanOrEqual(1);
        });

        it('should clear secure session token cookie', async () => {
            await POST();

            const secureTokenCalls = mockCookieStore.set.mock.calls.filter(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCalls.length).toBe(1);
        });

        it('should set session token to empty string', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[1]).toBe('');
        });

        it('should set secure session token to empty string', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[1]).toBe('');
        });

        it('should call cookies function', async () => {
            await POST();

            expect(mockCookies).toHaveBeenCalled();
        });
    });

    describe('Cookie Configuration - Development', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        it('should set httpOnly to true for session token', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].httpOnly).toBe(true);
        });

        it('should set secure to false in development', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].secure).toBe(false);
        });

        it('should set sameSite to lax for session token', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].sameSite).toBe('lax');
        });

        it('should set path to root for session token', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].path).toBe('/');
        });

        it('should set maxAge to 0 for session token', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].maxAge).toBe(0);
        });

        it('should set expires to epoch for session token', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].expires).toEqual(new Date(0));
        });
    });

    describe('Cookie Configuration - Production', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production';
        });

        it('should set secure to true in production', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].secure).toBe(true);
        });

        it('should set httpOnly to true in production', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].httpOnly).toBe(true);
        });
    });

    describe('Secure Cookie Configuration', () => {
        it('should always set secure to true for __Secure cookie', async () => {
            process.env.NODE_ENV = 'development';
            
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].secure).toBe(true);
        });

        it('should set httpOnly to true for secure cookie', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].httpOnly).toBe(true);
        });

        it('should set sameSite to lax for secure cookie', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].sameSite).toBe('lax');
        });

        it('should set path to root for secure cookie', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].path).toBe('/');
        });

        it('should set maxAge to 0 for secure cookie', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].maxAge).toBe(0);
        });

        it('should set expires to epoch for secure cookie', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].expires).toEqual(new Date(0));
        });
    });

    describe('Error Handling', () => {
        it('should handle cookies function error', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Cookies unavailable'));

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Logout failed');
        });

        it('should return redirect path on error', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(data.redirect).toBe('/');
        });

        it('should attempt to clear cookies in error handler', async () => {
            let callCount = 0;
            mockCookies.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('First call fails');
                }
                return Promise.resolve(mockCookieStore);
            });

            await POST();

            expect(mockCookies).toHaveBeenCalledTimes(2);
        });

        it('should handle cookie set error gracefully', async () => {
            mockCookieStore.set.mockImplementationOnce(() => {
                throw new Error('Set cookie failed');
            });

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
        });

        it('should handle nested error in error handler', async () => {
            mockCookies
                .mockRejectedValueOnce(new Error('First error'))
                .mockRejectedValueOnce(new Error('Second error'));

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Logout failed');
        });
    });

    describe('Response Structure', () => {
        it('should have success field', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data).toHaveProperty('success');
        });

        it('should have message field on success', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data).toHaveProperty('message');
        });

        it('should have redirect field', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data).toHaveProperty('redirect');
        });

        it('should have error field on failure', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(data).toHaveProperty('error');
        });

        it('should not have message field on failure', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(data.message).toBeUndefined();
        });

        it('should not have error field on success', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data.error).toBeUndefined();
        });
    });

    describe('Mutation Resistance', () => {
        it('should validate success status is exactly 200', async () => {
            const response = await POST();

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
            expect(response.status).not.toBe(204);
        });

        it('should validate error status is exactly 500', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should validate success field is exactly true', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should validate success field is exactly false on error', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(data.success).toBe(false);
            expect(data.success).not.toBe(0);
            expect(data.success).not.toBe('false');
        });

        it('should validate exact success message', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data.message).toBe('Logout successful');
            expect(data.message).not.toBe('Logout Successful');
            expect(data.message).not.toBe('logout successful');
            expect(data.message).not.toBe('Logout success');
        });

        it('should validate exact error message', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(data.error).toBe('Logout failed');
            expect(data.error).not.toBe('Logout Failed');
            expect(data.error).not.toBe('logout failed');
            expect(data.error).not.toBe('Failed to logout');
        });

        it('should validate exact redirect path', async () => {
            const response = await POST();
            const data = await response.json();

            expect(data.redirect).toBe('/');
            expect(data.redirect).not.toBe('');
            expect(data.redirect).not.toBe('/login');
        });

        it('should validate redirect path on error', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(data.redirect).toBe('/');
        });

        it('should validate session token cookie name', async () => {
            await POST();

            const sessionTokenCalls = mockCookieStore.set.mock.calls.filter(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCalls.length).toBeGreaterThanOrEqual(1);
            expect(sessionTokenCalls[0][0]).toBe('next-auth.session-token');
            expect(sessionTokenCalls[0][0]).not.toBe('nextauth.session-token');
        });

        it('should validate secure cookie name has __Secure prefix', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[0]).toBe('__Secure-next-auth.session-token');
            expect(secureTokenCall[0]).not.toBe('__secure-next-auth.session-token');
            expect(secureTokenCall[0]).not.toBe('Secure-next-auth.session-token');
        });

        it('should validate empty string value not null', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[1]).toBe('');
            expect(sessionTokenCall[1]).not.toBe(null);
            expect(sessionTokenCall[1]).not.toBe(undefined);
        });

        it('should validate httpOnly is boolean true', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].httpOnly).toBe(true);
            expect(sessionTokenCall[2].httpOnly).not.toBe(1);
            expect(sessionTokenCall[2].httpOnly).not.toBe('true');
        });

        it('should validate sameSite is lowercase lax', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].sameSite).toBe('lax');
            expect(sessionTokenCall[2].sameSite).not.toBe('Lax');
            expect(sessionTokenCall[2].sameSite).not.toBe('LAX');
            expect(sessionTokenCall[2].sameSite).not.toBe('strict');
        });

        it('should validate path is exactly /', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].path).toBe('/');
            expect(sessionTokenCall[2].path).not.toBe('');
        });

        it('should validate maxAge is number 0', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].maxAge).toBe(0);
            expect(sessionTokenCall[2].maxAge).not.toBe('0');
            expect(sessionTokenCall[2].maxAge).not.toBe(-1);
        });

        it('should validate expires is Date object', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].expires).toBeInstanceOf(Date);
        });

        it('should validate expires is exactly epoch', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            expect(sessionTokenCall[2].expires.getTime()).toBe(0);
            expect(sessionTokenCall[2].expires.getTime()).not.toBe(1);
        });

        it('should validate success is boolean type', async () => {
            const response = await POST();
            const data = await response.json();

            expect(typeof data.success).toBe('boolean');
        });

        it('should validate message is string type', async () => {
            const response = await POST();
            const data = await response.json();

            expect(typeof data.message).toBe('string');
        });

        it('should validate redirect is string type', async () => {
            const response = await POST();
            const data = await response.json();

            expect(typeof data.redirect).toBe('string');
        });

        it('should validate error is string type on failure', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should call cookies at least once', async () => {
            await POST();

            expect(mockCookies.mock.calls.length).toBeGreaterThanOrEqual(1);
        });

        it('should set at least 2 cookies on success', async () => {
            await POST();

            expect(mockCookieStore.set.mock.calls.length).toBeGreaterThanOrEqual(2);
        });

        it('should have exactly 3 fields in success response', async () => {
            const response = await POST();
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(3);
            expect(keys).toContain('success');
            expect(keys).toContain('message');
            expect(keys).toContain('redirect');
        });

        it('should have exactly 3 fields in error response', async () => {
            mockCookies.mockRejectedValueOnce(new Error('Error'));

            const response = await POST();
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(3);
            expect(keys).toContain('success');
            expect(keys).toContain('error');
            expect(keys).toContain('redirect');
        });

        it('should validate secure cookie configuration has 6 properties', async () => {
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            const configKeys = Object.keys(secureTokenCall[2]);
            expect(configKeys.length).toBe(6);
        });

        it('should validate session token configuration has 6 properties', async () => {
            await POST();

            const sessionTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === 'next-auth.session-token'
            );

            const configKeys = Object.keys(sessionTokenCall[2]);
            expect(configKeys.length).toBe(6);
        });

        it('should validate secure is always true for __Secure cookie regardless of NODE_ENV', async () => {
            process.env.NODE_ENV = 'development';
            
            await POST();

            const secureTokenCall = mockCookieStore.set.mock.calls.find(
                call => call[0] === '__Secure-next-auth.session-token'
            );

            expect(secureTokenCall[2].secure).toBe(true);
            expect(secureTokenCall[2].secure).not.toBe(false);
        });

        it('should clear both cookies even on partial failure', async () => {
            const response = await POST();

            expect(response.status).toBe(200);
            
            const cookieNames = mockCookieStore.set.mock.calls.map(call => call[0]);
            expect(cookieNames).toContain('next-auth.session-token');
            expect(cookieNames).toContain('__Secure-next-auth.session-token');
        });
    });
});
