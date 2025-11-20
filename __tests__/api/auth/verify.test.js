/**
 * @jest-environment node
 */

// Mock modules before imports
const mockPool = {
    query: jest.fn()
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('@/lib/db', () => ({
    pool: mockPool
}));

// Import after mocks
const { GET } = require('@/app/api/auth/verify/route');

describe('GET /api/auth/verify', () => {
    const mockRequest = (token, baseUrl = 'http://localhost:3000') => ({
        url: token ? `${baseUrl}/api/auth/verify?token=${token}` : `${baseUrl}/api/auth/verify`
    });

    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            BREVO_API_KEY: 'test-api-key',
            EMAIL: 'support@dbuddy.com',
            web_url: 'http://localhost:3000/dashboard'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Successful Verification', () => {
        it('should verify user successfully', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                }) // Pending user check
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                }) // Insert user
                .mockResolvedValueOnce({ rows: [] }); // Delete pending user

            mockFetch.mockResolvedValue({
                ok: true,
                text: jest.fn().mockResolvedValue('Email sent')
            });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should check pending user with correct token', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * from pending_users where verify_token=$1 AND token_expires_at > NOW()'),
                [token]
            );
        });

        it('should insert user with correct data', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[0]).toContain('INSERT INTO users');
            expect(insertCall[1][0]).toBe('test@example.com'); // email
            expect(insertCall[1][1]).toBe('hashed-password'); // password_hash
            expect(insertCall[1][2]).toBe('Test User'); // name
        });

        it('should set is_active to true', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[0]).toContain('is_active, email_verified');
            expect(insertCall[0]).toContain('true, true');
        });

        it('should delete pending user after verification', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'DELETE from pending_users where id=$1',
                ['pending-1']
            );
        });

        it('should send welcome email', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.brevo.com/v3/smtp/email',
                expect.objectContaining({
                    method: 'POST'
                })
            );
        });

        it('should send welcome email to verified user', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'verified@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'verified@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.to).toEqual([{ email: 'verified@example.com' }]);
        });

        it('should redirect to web_url', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.headers.get('Location')).toBe('http://localhost:3000/dashboard');
        });

        it('should call database query exactly 3 times on success', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            expect(mockPool.query).toHaveBeenCalledTimes(3);
        });
    });

    describe('Input Validation', () => {
        it('should reject missing token', async () => {
            const request = mockRequest(null);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Verification token is missing');
        });

        it('should reject empty string token', async () => {
            const request = mockRequest('');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Verification token is missing');
        });

        it('should not check database if token is missing', async () => {
            const request = mockRequest(null);
            await GET(request);

            expect(mockPool.query).not.toHaveBeenCalled();
        });
    });

    describe('Invalid or Expired Token', () => {
        it('should reject invalid token', async () => {
            const token = 'invalid-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid or expired verification link. Please try again');
        });

        it('should reject expired token', async () => {
            const token = 'expired-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] }); // No rows means expired

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid or expired verification link. Please try again');
        });

        it('should not insert user if token is invalid', async () => {
            const token = 'invalid-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(token);
            await GET(request);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
        });

        it('should not send email if token is invalid', async () => {
            const token = 'invalid-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(token);
            await GET(request);

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle rows.length === 0 correctly', async () => {
            const token = 'invalid-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(400);
        });
    });

    describe('Welcome Email Handling', () => {
        it('should continue verification even if email fails', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockRejectedValue(new Error('Email service error'));

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should continue verification if email response is not ok', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({
                ok: false,
                text: jest.fn().mockResolvedValue('Error')
            });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should include welcome message in email', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.subject).toBe('Welcome to DBuddy - Your Database Companion!');
            expect(body.htmlContent).toContain('Welcome to DBuddy');
        });

        it('should use correct email sender', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.sender.email).toBe('support@dbuddy.com');
        });
    });

    describe('Database Errors', () => {
        it('should handle pending user query error', async () => {
            const token = 'valid-token-123';

            mockPool.query.mockRejectedValueOnce(new Error('Database error'));

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Database error');
        });

        it('should handle insert user error', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockRejectedValueOnce(new Error('Insert failed'));

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Insert failed');
        });

        it('should handle delete pending user error', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockRejectedValueOnce(new Error('Delete failed'));

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Delete failed');
        });

        it('should return generic error when error has no message', async () => {
            const token = 'valid-token-123';

            mockPool.query.mockRejectedValueOnce({ error: 'Some error' });

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });
    });

    describe('Edge Cases', () => {
        it('should handle special characters in token', async () => {
            const token = 'token-with-special!@#$%';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should handle very long token', async () => {
            const token = 'a'.repeat(1000);

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should handle special characters in email', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test+tag@example.co.uk',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test+tag@example.co.uk',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should handle special characters in name', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User @#$%'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User @#$%',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
        });

        it('should handle URL parsing error', async () => {
            const request = {
                url: 'invalid-url'
            };

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
        });

        it('should extract token from query parameters', async () => {
            const token = 'extracted-token';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.any(String),
                [token]
            );
        });
    });

    describe('Mutation Resistance', () => {
        it('should validate redirect status is exactly 307', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(307);
            expect(response.status).not.toBe(302);
            expect(response.status).not.toBe(301);
        });

        it('should validate validation error status is exactly 400', async () => {
            const request = mockRequest(null);
            const response = await GET(request);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(401);
            expect(response.status).not.toBe(404);
        });

        it('should validate error status is exactly 500', async () => {
            const token = 'valid-token-123';

            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should validate exact missing token message', async () => {
            const request = mockRequest(null);
            const response = await GET(request);
            const data = await response.json();

            expect(data.error).toBe('Verification token is missing');
            expect(data.error).not.toBe('Token is missing');
        });

        it('should validate exact invalid token message', async () => {
            const token = 'invalid-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(data.error).toBe('Invalid or expired verification link. Please try again');
            expect(data.error).not.toBe('Invalid or expired verification link');
        });

        it('should validate exact generic error message', async () => {
            const token = 'valid-token-123';

            mockPool.query.mockRejectedValueOnce({ error: 'Some error' });

            const request = mockRequest(token);
            const response = await GET(request);
            const data = await response.json();

            expect(data.error).toBe('Internal Server Error');
            expect(data.error).not.toBe('Internal server error');
        });

        it('should validate error is string type', async () => {
            const request = mockRequest(null);
            const response = await GET(request);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should have exactly 1 field in error response', async () => {
            const request = mockRequest(null);
            const response = await GET(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('error');
        });

        it('should validate equality comparison (===) works for zero length', async () => {
            const token = 'invalid-token';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.status).toBe(400);
        });

        it('should use pending user email for insertion', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'correct@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'correct@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[1][0]).toBe('correct@example.com');
        });

        it('should use pending user password_hash for insertion', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'correct-hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[1][1]).toBe('correct-hashed-password');
        });

        it('should use pending user name for insertion', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Correct Name'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Correct Name',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[1][2]).toBe('Correct Name');
        });

        it('should delete correct pending user id', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'correct-pending-id',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const deleteCall = mockPool.query.mock.calls[2];
            expect(deleteCall[1][0]).toBe('correct-pending-id');
        });

        it('should send email to verified user email, not pending', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'pending@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'verified@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.to[0].email).toBe('verified@example.com');
            expect(body.to[0].email).not.toBe('pending@example.com');
        });

        it('should call fetch exactly once on success', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should validate redirect URL is from web_url env variable', async () => {
            const token = 'valid-token-123';

            process.env.web_url = 'https://custom-url.com/dashboard';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            const response = await GET(request);

            expect(response.headers.get('Location')).toBe('https://custom-url.com/dashboard');
        });

        it('should check token expiry using NOW() in SQL', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const selectCall = mockPool.query.mock.calls[0];
            expect(selectCall[0]).toContain('token_expires_at > NOW()');
        });

        it('should include GET Started link in email', async () => {
            const token = 'valid-token-123';

            mockPool.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'pending-1',
                        email: 'test@example.com',
                        password_hash: 'hashed-password',
                        name: 'Test User'
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 'user-1',
                        email: 'test@example.com',
                        name: 'Test User',
                        created_at: new Date()
                    }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            mockFetch.mockResolvedValue({ ok: true, text: jest.fn() });

            const request = mockRequest(token);
            await GET(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.htmlContent).toContain('Get Started');
            expect(body.htmlContent).toContain('https://backend-manager.vercel.app');
        });
    });
});
