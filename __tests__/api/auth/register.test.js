/**
 * @jest-environment node
 */

// Mock modules before imports
const mockPool = {
    query: jest.fn()
};

const mockHashPassword = jest.fn();
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('@/lib/db', () => ({
    pool: mockPool
}));

jest.mock('@/lib/auth', () => ({
    hashPassword: mockHashPassword
}));

jest.mock('crypto', () => ({
    randomBytes: jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('mock-token-12345678901234567890123456789012')
    })
}));

// Import after mocks
const { POST } = require('@/app/api/auth/register/route');
const crypto = require('crypto');

describe('POST /api/auth/register', () => {
    const mockRequest = (body, url = 'http://localhost:3000/api/auth/register') => ({
        json: jest.fn().mockResolvedValue(body),
        url
    });

    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
        process.env = {
            ...originalEnv,
            BREVO_API_KEY: 'test-api-key',
            EMAIL: 'support@dbuddy.com'
        };
    });

    afterEach(() => {
        jest.useRealTimers();
        process.env = originalEnv;
    });

    describe('Successful Registration', () => {
        it('should register new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] }) // User check
                .mockResolvedValueOnce({ rows: [] }) // Pending user check
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] }); // Insert

            mockFetch.mockResolvedValue({
                ok: true,
                text: jest.fn().mockResolvedValue('Email sent')
            });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('Email verfication link sent on your entered email address. Please check your inbox!!');
        });

        it('should check if user already exists', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                ['test@example.com']
            );
        });

        it('should hash the password', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockHashPassword).toHaveBeenCalledWith('password123');
        });

        it('should generate verification token', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            expect(crypto.randomBytes).toHaveBeenCalledWith(32);
        });

        it('should insert pending user with correct data', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const insertCall = mockPool.query.mock.calls[2];
            expect(insertCall[1][0]).toBe('test@example.com'); // email
            expect(insertCall[1][1]).toBe('Test User'); // name
            expect(insertCall[1][2]).toBe('hashed-password'); // password_hash
            expect(insertCall[1][3]).toBe('mock-token-12345678901234567890123456789012'); // token
            expect(insertCall[1][4]).toBeInstanceOf(Date); // expiry
        });

        it('should send verification email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.brevo.com/v3/smtp/email',
                expect.objectContaining({
                    method: 'POST'
                })
            );
        });

        it('should include verification link in email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.htmlContent).toContain('http://localhost:3000/api/auth/verify?token=mock-token-12345678901234567890123456789012');
        });
    });

    describe('Input Validation', () => {
        it('should reject missing email', async () => {
            const userData = {
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Email, password, and name are required');
        });

        it('should reject missing password', async () => {
            const userData = {
                email: 'test@example.com',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Email, password, and name are required');
        });

        it('should reject missing name', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Email, password, and name are required');
        });

        it('should reject missing confirmPassword', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Please confirm your password');
        });

        it('should reject mismatched passwords', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'different123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Passwords do not match');
        });

        it('should reject empty string email', async () => {
            const userData = {
                email: '',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should reject empty string password', async () => {
            const userData = {
                email: 'test@example.com',
                password: '',
                confirmPassword: '',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should reject empty string name', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: ''
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });
    });

    describe('Existing User', () => {
        it('should return error when user already exists', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(409);
            expect(data.error).toBe('User already exists with this email');
        });

        it('should not check pending users if user exists', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
        });
    });

    describe('Pending User - Rate Limiting', () => {
        it('should rate limit if token was created less than 2 minutes ago', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            // Token expires in 29 minutes (created 1 minute ago)
            const tokenExpiresAt = new Date('2025-01-01T12:29:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [] }) // User check
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1', 
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(429);
            expect(data.error).toContain('A verification email was already sent recently');
            expect(data.remainingTime).toBeGreaterThan(0);
        });

        it('should allow resend after 2 minutes', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            // Token expires in 27 minutes (created 3 minutes ago, past rate limit)
            const tokenExpiresAt = new Date('2025-01-01T12:27:00Z');

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] }); // Update

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should allow resend when token was created exactly 2 minutes ago (boundary)', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            // Token expires in 28 minutes (created exactly 2 minutes ago)
            const tokenExpiresAt = new Date('2025-01-01T12:28:00Z');

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] }); // Update

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);

            // It should allow resending without rate limiting
            expect(response.status).toBe(200);
        });

        it('should update pending user with new token when resending', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const tokenExpiresAt = new Date('2025-01-01T12:27:00Z');

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const updateCall = mockPool.query.mock.calls[2];
            expect(updateCall[0]).toContain('UPDATE pending_users');
            expect(updateCall[1][0]).toBe('mock-token-12345678901234567890123456789012'); // new token
            expect(updateCall[1][4]).toBe('test@example.com'); // email
        });

        it('should handle expired pending user token', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            // Token expired 5 minutes ago
            const tokenExpiresAt = new Date('2025-01-01T11:55:00Z');

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
        });
    });

    describe('Email Sending', () => {
        it('should handle email send failure', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({
                ok: false,
                text: jest.fn().mockResolvedValue('Email error')
            });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Error sending verification email. Please try again.');
        });

        it('should handle email send exception', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockRejectedValue(new Error('Network error'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Error sending verification email. Please try again.');
        });

        it('should use correct email sender', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.sender.email).toBe('support@dbuddy.com');
        });

        it('should send email to correct recipient', async () => {
            const userData = {
                email: 'recipient@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.to).toEqual([{ email: 'recipient@example.com' }]);
        });

        it('should include user name in email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'John Doe'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.htmlContent).toContain('John Doe');
        });
    });

    describe('Database Errors', () => {
        it('should handle user query error', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockRejectedValueOnce(new Error('Database error'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Database error');
        });

        it('should handle pending user query error', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockRejectedValueOnce(new Error('Query failed'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Query failed');
        });

        it('should handle insert failure', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] }); // Insert returns no rows

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to create pending user');
        });

        it('should handle update failure', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const tokenExpiresAt = new Date('2025-01-01T12:27:00Z');

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] }); // Update returns no rows

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to update pending user');
        });

        it('should handle hashing error', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockRejectedValueOnce(new Error('Hash failed'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Hash failed');
        });

        it('should return generic error message when error has no message', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockRejectedValueOnce({ error: 'Some error' });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });
    });

    describe('Base URL Handling', () => {
        it('should extract base URL from request', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData, 'https://example.com:8080/api/auth/register');
            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.htmlContent).toContain('https://example.com:8080/api/auth/verify');
        });

        it('should handle http protocol', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData, 'http://localhost:3000/api/auth/register');
            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.htmlContent).toContain('http://localhost:3000');
        });
    });

    describe('Mutation Resistance', () => {
        it('should validate success status is exactly 200', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
            expect(response.status).not.toBe(204);
        });

        it('should validate validation error status is exactly 400', async () => {
            const userData = {
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(401);
            expect(response.status).not.toBe(404);
        });

        it('should validate conflict status is exactly 409', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(409);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(404);
        });

        it('should validate rate limit status is exactly 429', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const tokenExpiresAt = new Date('2025-01-01T12:29:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(429);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should validate error status is exactly 500', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should validate exact success message', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.message).toBe('Email verfication link sent on your entered email address. Please check your inbox!!');
            expect(data.message).not.toBe('Email verification link sent');
            expect(data.message).not.toBe('Email verfication link sent on your entered email address. Please check your inbox');
        });

        it('should validate exact required fields message', async () => {
            const userData = {
                password: 'password123',
                confirmPassword: 'password123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Email, password, and name are required');
            expect(data.error).not.toBe('Email, password and name are required');
        });

        it('should validate exact confirm password message', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Please confirm your password');
            expect(data.error).not.toBe('Confirm password is required');
        });

        it('should validate exact password mismatch message', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'different',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Passwords do not match');
            expect(data.error).not.toBe('Password mismatch');
        });

        it('should validate exact user exists message', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('User already exists with this email');
            expect(data.error).not.toBe('User already exists');
        });

        it('should validate exact rate limit message', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const tokenExpiresAt = new Date('2025-01-01T12:29:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toContain('A verification email was already sent recently');
            expect(data).toHaveProperty('remainingTime');
        });

        it('should validate message is string type', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.message).toBe('string');
        });

        it('should validate error is string type', async () => {
            const userData = {
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should validate token expiry is 30 minutes', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            const insertCall = mockPool.query.mock.calls[2];
            const expiryDate = insertCall[1][4];
            const now = new Date('2025-01-01T12:00:00Z');
            const minutesDiff = (expiryDate - now) / (1000 * 60);

            expect(minutesDiff).toBe(30);
            expect(minutesDiff).not.toBe(29);
            expect(minutesDiff).not.toBe(31);
        });

        it('should validate remainingTime is number type', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const tokenExpiresAt = new Date('2025-01-01T12:29:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.remainingTime).toBe('number');
        });

        it('should call hashPassword exactly once on new user', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockHashPassword).toHaveBeenCalledTimes(1);
        });

        it('should call fetch exactly once on success', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should have exactly 1 field in success response', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            mockHashPassword.mockResolvedValue('hashed-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'pending-1' }] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('message');
        });

        it('should have exactly 1 field in validation error response', async () => {
            const userData = {
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('error');
        });

        it('should have exactly 2 fields in rate limit response', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                name: 'Test User'
            };

            const tokenExpiresAt = new Date('2025-01-01T12:29:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        token_expires_at: tokenExpiresAt,
                        verify_token: 'old-token'
                    }] 
                });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(2);
            expect(keys).toContain('error');
            expect(keys).toContain('remainingTime');
        });
    });
});
