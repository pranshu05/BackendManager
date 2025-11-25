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

jest.mock('crypto', () => ({
    randomInt: jest.fn()
}));

// Import after mocks
const { POST, generateOTP } = require('@/app/api/auth/emailcheck/route');
const crypto = require('crypto');

describe('POST /api/auth/emailcheck', () => {
    const mockRequest = (body) => ({
        json: jest.fn().mockResolvedValue(body)
    });

    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            BREVO_API_KEY: 'test-api-key',
            EMAIL: 'support@dbuddy.com'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('generateOTP', () => {
        it('should generate a 6-digit OTP', () => {
            crypto.randomInt.mockReturnValue(123456);
            
            const otp = generateOTP();
            
            expect(otp).toBe('123456');
            expect(crypto.randomInt).toHaveBeenCalledWith(100000, 999999);
        });

        it('should return string type', () => {
            crypto.randomInt.mockReturnValue(500000);
            
            const otp = generateOTP();
            
            expect(typeof otp).toBe('string');
        });

        it('should handle minimum value', () => {
            crypto.randomInt.mockReturnValue(100000);
            
            const otp = generateOTP();
            
            expect(otp).toBe('100000');
            expect(otp.length).toBe(6);
        });

        it('should handle maximum value', () => {
            crypto.randomInt.mockReturnValue(999999);
            
            const otp = generateOTP();
            
            expect(otp).toBe('999999');
            expect(otp.length).toBe(6);
        });
    });

    describe('Successful OTP Generation', () => {
        beforeEach(() => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }) // User check
                .mockResolvedValueOnce({ rows: [] }); // OTP insert
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ messageId: 'msg-123' })
            });
        });

        it('should send OTP successfully for existing user', async () => {
            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('OTP sent successfully');
        });

        it('should check if user exists in database', async () => {
            const email = 'test@example.com';
            const request = mockRequest({ email });

            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
        });

        it('should generate OTP for the user', async () => {
            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            expect(crypto.randomInt).toHaveBeenCalledWith(100000, 999999);
        });

        it('should insert OTP into password_resets table', async () => {
            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[0]).toContain('INSERT INTO password_resets');
            expect(insertCall[1][0]).toBe('user-123'); // user_id
            expect(insertCall[1][1]).toBe('123456'); // otp
            expect(insertCall[1][2]).toBeInstanceOf(Date); // expires_at
        });

        it('should set OTP expiry to 5 minutes', async () => {
            const now = Date.now();
            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const insertCall = mockPool.query.mock.calls[1];
            const expiresAt = insertCall[1][2];
            const expiryTime = expiresAt.getTime() - now;

            expect(expiryTime).toBeGreaterThanOrEqual(4.9 * 60 * 1000);
            expect(expiryTime).toBeLessThanOrEqual(5.1 * 60 * 1000);
        });

        it('should send email via Brevo API', async () => {
            const email = 'test@example.com';
            const request = mockRequest({ email });

            await POST(request);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.brevo.com/v3/smtp/email',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        accept: 'application/json',
                        'api-key': 'test-api-key',
                        'content-type': 'application/json'
                    })
                })
            );
        });

        it('should include OTP in email content', async () => {
            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.htmlContent).toContain('123456');
        });

        it('should send email to correct recipient', async () => {
            const email = 'user@test.com';
            const request = mockRequest({ email });

            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.to).toEqual([{ email }]);
        });

        it('should use correct sender information', async () => {
            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.sender.name).toBe('DBuddy Support');
            expect(body.sender.email).toBe('support@dbuddy.com');
        });

        it('should include subject in email', async () => {
            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.subject).toBe('Your DBuddy Password Reset Code');
        });
    });

    describe('User Not Found', () => {
        it('should return 404 when user does not exist', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('No account found with that email');
        });

        it('should not generate OTP for non-existent user', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com' });

            await POST(request);

            expect(crypto.randomInt).not.toHaveBeenCalled();
        });

        it('should not send email for non-existent user', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com' });

            await POST(request);

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should not insert OTP for non-existent user', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com' });

            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
        });
    });

    describe('Email Sending Failures', () => {
        beforeEach(() => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
        });

        it('should handle Brevo API failure', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: jest.fn().mockResolvedValue({ error: 'API error' })
            });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to send email');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });

        it('should handle Brevo authentication errors', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 401,
                json: jest.fn().mockResolvedValue({ error: 'Invalid API key' })
            });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to send email');
        });
    });

    describe('Database Errors', () => {
        it('should handle user query errors', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });

        it('should handle OTP insert errors', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockRejectedValueOnce(new Error('Insert failed'));

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });

        it('should not send email if database insert fails', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockRejectedValueOnce(new Error('Insert failed'));

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('Input Validation', () => {
        it('should handle missing email field', async () => {
            const request = mockRequest({});

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });

        it('should handle null email', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: null });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(404);
        });

        it('should handle empty string email', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: '' });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(404);
        });

        it('should handle malformed JSON', async () => {
            const request = {
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple users with same email (edge case)', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }, { id: 'user-2' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);

            expect(response.status).toBe(200);
            // Should use first user's ID
            const insertCall = mockPool.query.mock.calls[1];
            expect(insertCall[1][0]).toBe('user-1');
        });

        it('should handle very long email addresses', async () => {
            const longEmail = 'a'.repeat(100) + '@example.com';
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: longEmail });

            const response = await POST(request);

            expect(response.status).toBe(404);
            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                [longEmail]
            );
        });

        it('should handle email with special characters', async () => {
            const email = 'user+tag@example.com';
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email });

            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should handle case sensitivity in email', async () => {
            const email = 'Test@Example.COM';
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email });

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
        });
    });

    describe('Mutation Resistance', () => {
        it('should validate success status is exactly 200', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
            expect(response.status).not.toBe(204);
        });

        it('should validate not found status is exactly 404', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);

            expect(response.status).toBe(404);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(401);
        });

        it('should validate error status is exactly 500', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should validate exact success message', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(data.message).toBe('OTP sent successfully');
            expect(data.message).not.toBe('OTP sent');
            expect(data.message).not.toBe('otp sent successfully');
        });

        it('should validate exact not found error message', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('No account found with that email');
            expect(data.error).not.toBe('User not found');
            expect(data.error).not.toBe('No account found');
        });

        it('should validate exact email send error message', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: false });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Failed to send email');
            expect(data.error).not.toBe('Email sending failed');
        });

        it('should validate exact internal error message', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Internal server error');
            expect(data.error).not.toBe('Server error');
        });

        it('should ensure message field exists on success', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(data).toHaveProperty('message');
            expect(data.error).toBeUndefined();
        });

        it('should ensure error field exists on failure', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(data).toHaveProperty('error');
            expect(data.message).toBeUndefined();
        });

        it('should validate message is string type', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.message).toBe('string');
        });

        it('should validate error is string type', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com' });

            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should validate OTP is 6 digits exactly', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const insertCall = mockPool.query.mock.calls[1];
            const otp = insertCall[1][1];

            expect(otp).toBe('123456');
            expect(otp.length).toBe(6);
        });

        it('should call user query exactly once', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const userQueries = mockPool.query.mock.calls.filter(
                call => call[0].includes('SELECT id FROM users')
            );
            expect(userQueries.length).toBe(1);
        });

        it('should call insert query exactly once on success', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const insertQueries = mockPool.query.mock.calls.filter(
                call => call[0].includes('INSERT INTO password_resets')
            );
            expect(insertQueries.length).toBe(1);
        });

        it('should call fetch exactly once on success', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should validate Brevo API endpoint is exact', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.brevo.com/v3/smtp/email',
                expect.any(Object)
            );
            expect(mockFetch.mock.calls[0][0]).not.toBe('https://api.brevo.com/v3/email');
        });

        it('should validate POST method for Brevo API', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            expect(fetchCall.method).toBe('POST');
            expect(fetchCall.method).not.toBe('post');
        });

        it('should validate exact subject line', async () => {
            crypto.randomInt.mockReturnValue(123456);
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const fetchCall = mockFetch.mock.calls[0][1];
            const body = JSON.parse(fetchCall.body);

            expect(body.subject).toBe('Your DBuddy Password Reset Code');
            expect(body.subject).not.toBe('Password Reset Code');
        });

        it('should validate OTP expiry is 5 minutes not 10', async () => {
            crypto.randomInt.mockReturnValue(123456);
            const startTime = Date.now();
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });
            mockFetch.mockResolvedValue({ ok: true });

            const request = mockRequest({ email: 'test@example.com' });

            await POST(request);

            const insertCall = mockPool.query.mock.calls[1];
            const expiresAt = insertCall[1][2];
            const expiryMinutes = (expiresAt.getTime() - startTime) / (60 * 1000);

            expect(expiryMinutes).toBeCloseTo(5, 1);
            expect(expiryMinutes).not.toBeCloseTo(10, 1);
        });
    });
});
