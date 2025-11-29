/**
 * @jest-environment node
 */

const mockCookieStore = { set: jest.fn() };
const mockCookies = jest.fn().mockResolvedValue(mockCookieStore);

jest.mock('next/headers', () => ({ cookies: mockCookies }));

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

    // Helper to get cookie call by name
    const getCookieCall = (name) => mockCookieStore.set.mock.calls.find(c => c[0] === name);

    describe('Success Path - Cookie Mutations', () => {
        it('should set both cookies with exact empty string value (not "Stryker was here!")', async () => {
            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({ success: true, message: 'Logout successful', redirect: '/' });

            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');

            // Kill cookie value mutations
            expect(sessionCall[1]).toBe('');
            expect(sessionCall[1]).not.toBe('Stryker was here!');
            expect(secureCall[1]).toBe('');
            expect(secureCall[1]).not.toBe('Stryker was here!');
        });

        it('should use non-empty cookie options object with all 6 properties', async () => {
            await POST();

            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');

            // Kill empty object mutation
            expect(sessionCall[2]).not.toEqual({});
            expect(secureCall[2]).not.toEqual({});
            expect(Object.keys(sessionCall[2])).toEqual(['httpOnly', 'secure', 'sameSite', 'path', 'maxAge', 'expires']);
            expect(Object.keys(secureCall[2])).toEqual(['httpOnly', 'secure', 'sameSite', 'path', 'maxAge', 'expires']);
        });

        it('should set httpOnly to true (not false) for both cookies', async () => {
            await POST();

            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');

            // Kill httpOnly false mutation
            expect(sessionCall[2].httpOnly).toBe(true);
            expect(sessionCall[2].httpOnly).not.toBe(false);
            expect(secureCall[2].httpOnly).toBe(true);
            expect(secureCall[2].httpOnly).not.toBe(false);
        });

        it('should set sameSite to "lax" (not empty string)', async () => {
            await POST();

            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');

            // Kill sameSite empty string mutation
            expect(sessionCall[2].sameSite).toBe('lax');
            expect(sessionCall[2].sameSite).not.toBe('');
            expect(secureCall[2].sameSite).toBe('lax');
            expect(secureCall[2].sameSite).not.toBe('');
        });

        it('should set path to "/" (not empty string)', async () => {
            await POST();

            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');

            // Kill path empty string mutation
            expect(sessionCall[2].path).toBe('/');
            expect(sessionCall[2].path).not.toBe('');
            expect(secureCall[2].path).toBe('/');
            expect(secureCall[2].path).not.toBe('');
        });

        it('should use conditional secure for session cookie (=== operator, "production" string)', async () => {
            // Test production
            process.env.NODE_ENV = 'production';
            await POST();
            let sessionCall = getCookieCall('next-auth.session-token');
            
            // Kill: secure true mutation, !== operator mutation, empty string mutation
            expect(sessionCall[2].secure).toBe(true);

            // Test development
            mockCookieStore.set.mockClear();
            process.env.NODE_ENV = 'development';
            await POST();
            sessionCall = getCookieCall('next-auth.session-token');
            
            // Kill: secure false mutation
            expect(sessionCall[2].secure).toBe(false);

            // Test empty string NODE_ENV
            mockCookieStore.set.mockClear();
            process.env.NODE_ENV = '';
            await POST();
            sessionCall = getCookieCall('next-auth.session-token');
            
            // Kill: NODE_ENV === "" mutation
            expect(sessionCall[2].secure).toBe(false);
        });

        it('should set secure to always true for __Secure cookie regardless of NODE_ENV', async () => {
            process.env.NODE_ENV = 'development';
            await POST();
            
            const secureCall = getCookieCall('__Secure-next-auth.session-token');
            expect(secureCall[2].secure).toBe(true);
        });
    });

    describe('Error Path - Cookie Mutations in Error Handler', () => {
        beforeEach(() => {
            let callCount = 0;
            mockCookies.mockImplementation(() => {
                callCount++;
                if (callCount === 1) throw new Error('First call fails');
                return Promise.resolve(mockCookieStore);
            });
        });

        it('should handle error and still attempt cookie clear with exact values', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ success: false, error: 'Logout failed', redirect: '/' });

            // Verify console.error called with non-empty message
            expect(consoleErrorSpy.mock.calls[0][0]).toBe('Logout error:');
            expect(consoleErrorSpy.mock.calls[0][0]).not.toBe('');

            consoleErrorSpy.mockRestore();
        });

        it('should use exact cookie parameters in error handler (kill all error path mutations)', async () => {
            process.env.NODE_ENV = 'production';
            await POST();

            const errorCall = mockCookieStore.set.mock.calls[0];

            // Kill all error handler mutations
            expect(errorCall[0]).toBe('next-auth.session-token');
            expect(errorCall[1]).toBe('');
            expect(errorCall[1]).not.toBe('Stryker was here!');
            expect(errorCall[2]).not.toEqual({});
            expect(errorCall[2].httpOnly).toBe(true);
            expect(errorCall[2].httpOnly).not.toBe(false);
            expect(errorCall[2].secure).toBe(true);
            expect(errorCall[2].sameSite).toBe('lax');
            expect(errorCall[2].sameSite).not.toBe('');
            expect(errorCall[2].path).toBe('/');
            expect(errorCall[2].path).not.toBe('');

            // Test development
            mockCookieStore.set.mockClear();
            process.env.NODE_ENV = 'development';
            await POST();

            const devErrorCall = mockCookieStore.set.mock.calls[0];
            expect(devErrorCall[2].secure).toBe(false);

            // Test empty string NODE_ENV
            mockCookieStore.set.mockClear();
            process.env.NODE_ENV = '';
            await POST();

            const emptyErrorCall = mockCookieStore.set.mock.calls[0];
            expect(emptyErrorCall[2].secure).toBe(false);
        });

        it('should execute nested catch block and log with non-empty message', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            mockCookies
                .mockRejectedValueOnce(new Error('First error'))
                .mockRejectedValueOnce(new Error('Second error'));

            await POST();

            // Kill empty catch block and console.error empty string mutations
            expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
            expect(consoleErrorSpy.mock.calls[1][0]).toBe('Failed to clear cookies:');
            expect(consoleErrorSpy.mock.calls[1][0]).not.toBe('');

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Additional Mutation Killers', () => {
        beforeEach(() => {
            // Reset mocks to normal behavior for this suite
            mockCookies.mockResolvedValue(mockCookieStore);
        });

        it('should verify exact cookie names (not empty strings)', async () => {
            await POST();

            expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
            
            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');
            
            expect(sessionCall).toBeDefined();
            expect(secureCall).toBeDefined();
            expect(sessionCall[0]).toBe('next-auth.session-token');
            expect(sessionCall[0]).not.toBe('');
            expect(secureCall[0]).toBe('__Secure-next-auth.session-token');
            expect(secureCall[0]).not.toBe('');
        });

        it('should set maxAge and expires to exact values', async () => {
            await POST();

            const sessionCall = getCookieCall('next-auth.session-token');
            const secureCall = getCookieCall('__Secure-next-auth.session-token');

            expect(sessionCall[2].maxAge).toBe(0);
            expect(sessionCall[2].expires).toEqual(new Date(0));
            expect(secureCall[2].maxAge).toBe(0);
            expect(secureCall[2].expires).toEqual(new Date(0));
        });

        it('should call cookies() and set() the correct number of times', async () => {
            await POST();

            expect(mockCookies).toHaveBeenCalledTimes(1);
            expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
        });
    });
});
