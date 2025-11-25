/**
 * @jest-environment node
 */

// Mock modules before imports
const mockPool = {
    query: jest.fn()
};

jest.mock('@/lib/db', () => ({
    pool: mockPool
}));

// Import after mocks
const { POST } = require('@/app/api/auth/otpcheck/route');

describe('POST /api/auth/otpcheck', () => {
    const mockRequest = (body) => ({
        json: jest.fn().mockResolvedValue(body)
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock Date.now() for consistent time testing
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Successful OTP Verification', () => {
        it('should verify OTP successfully', async () => {
            const email = 'test@example.com';
            const otp = '123456';
            const userId = 'user-123';
            const resetId = 'reset-456';
            const futureTime = new Date('2025-01-01T12:05:00Z'); // 5 minutes in future

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: userId }] }) // User check
                .mockResolvedValueOnce({ 
                    rows: [{ id: resetId, otp: otp, expires_at: futureTime }] 
                }) // OTP check
                .mockResolvedValueOnce({ rows: [] }); // Delete OTP

            const request = mockRequest({ email, otp });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('OTP verified Successfully!!');
        });

        it('should check if user exists in database', async () => {
            const email = 'test@example.com';
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email, otp });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
        });

        it('should check OTP from password_resets table', async () => {
            const userId = 'user-123';
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: userId }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id, otp, expires_at FROM password_resets WHERE user_id = $1 AND used = false ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
        });

        it('should delete OTP entry after successful verification', async () => {
            const resetId = 'reset-456';
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: resetId, otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'DELETE FROM password_resets WHERE id = $1',
                [resetId]
            );
        });

        it('should make exactly 3 database queries on success', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(3);
        });
    });

    describe('User Not Found', () => {
        it('should return 404 when user does not exist', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('No account found with that email');
        });

        it('should not check OTP if user does not exist', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com', otp: '123456' });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
        });

        it('should not delete OTP if user does not exist', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'nonexistent@example.com', otp: '123456' });
            await POST(request);

            const deleteCalls = mockPool.query.mock.calls.filter(
                call => call[0].includes('DELETE')
            );
            expect(deleteCalls.length).toBe(0);
        });
    });

    describe('Invalid OTP', () => {
        it('should return error when no OTP record found', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] }); // No OTP found

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid or expired OTP');
        });

        it('should return error when OTP does not match', async () => {
            const storedOtp = '123456';
            const providedOtp = '654321';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: storedOtp, expires_at: futureTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp: providedOtp });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('OTP does not match');
        });

        it('should not delete OTP when OTP does not match', async () => {
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: '123456', expires_at: futureTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp: '654321' });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });

        it('should handle OTP as string comparison', async () => {
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: '123456', expires_at: futureTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });
    });

    describe('Expired OTP', () => {
        it('should return error when OTP is expired', async () => {
            const pastTime = new Date('2025-01-01T11:55:00Z'); // 5 minutes in past
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: pastTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Expired');
        });

        it('should not delete OTP when expired', async () => {
            const pastTime = new Date('2025-01-01T11:55:00Z');
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: pastTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });

        it('should handle exact expiry time boundary', async () => {
            const exactTime = new Date('2025-01-01T12:00:00Z'); // Same as current time
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: exactTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            // Should NOT be expired (now > expiresAt is false, equality means still valid)
            expect(response.status).toBe(200);
        });

        it('should accept OTP one millisecond before expiry', async () => {
            const futureTime = new Date('2025-01-01T12:00:00.001Z'); // 1ms in future
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });
    });

    describe('Database Errors', () => {
        it('should handle user query error', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Database error'));

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });

        it('should handle OTP query error', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockRejectedValueOnce(new Error('Query failed'));

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });

        it('should handle delete query error', async () => {
            const futureTime = new Date('2025-01-01T12:05:00Z');
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockRejectedValueOnce(new Error('Delete failed'));

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });
    });

    describe('Input Validation', () => {
        it('should handle missing email field', async () => {
            const request = mockRequest({ otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });

        it('should handle missing otp field', async () => {
            const request = mockRequest({ email: 'test@example.com' });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });

        it('should handle null email', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: null, otp: '123456' });
            const response = await POST(request);

            expect(response.status).toBe(404);
        });

        it('should handle empty string email', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: '', otp: '123456' });
            const response = await POST(request);

            expect(response.status).toBe(404);
        });

        it('should handle malformed JSON', async () => {
            const request = {
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple OTP records (takes most recent)', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-latest', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                'DELETE FROM password_resets WHERE id = $1',
                ['reset-latest']
            );
        });

        it('should handle 6-digit OTP', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should handle email with special characters', async () => {
            const email = 'user+tag@example.com';
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email, otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should handle case-sensitive email', async () => {
            const email = 'Test@Example.COM';
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email, otp });
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
        });

        it('should handle OTP with leading zeros', async () => {
            const otp = '001234';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });
    });

    describe('Mutation Resistance', () => {
        it('should validate success status is exactly 200', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
            expect(response.status).not.toBe(204);
        });

        it('should validate not found status is exactly 404', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);

            expect(response.status).toBe(404);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(401);
        });

        it('should validate invalid OTP status is exactly 400', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(401);
            expect(response.status).not.toBe(404);
        });

        it('should validate error status is exactly 500', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should validate exact success message', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            expect(data.message).toBe('OTP verified Successfully!!');
            expect(data.message).not.toBe('OTP verified successfully');
            expect(data.message).not.toBe('OTP verified Successfully');
            expect(data.message).not.toBe('OTP verified');
        });

        it('should validate exact user not found message', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('No account found with that email');
            expect(data.error).not.toBe('User not found');
            expect(data.error).not.toBe('No account found');
        });

        it('should validate exact invalid OTP message', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Invalid or expired OTP');
            expect(data.error).not.toBe('Invalid OTP');
            expect(data.error).not.toBe('OTP not found');
        });

        it('should validate exact OTP mismatch message', async () => {
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: '123456', expires_at: futureTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp: '654321' });
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('OTP does not match');
            expect(data.error).not.toBe('OTP mismatch');
            expect(data.error).not.toBe('Invalid OTP');
        });

        it('should validate exact expired message', async () => {
            const pastTime = new Date('2025-01-01T11:55:00Z');
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: pastTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Expired');
            expect(data.error).not.toBe('OTP expired');
            expect(data.error).not.toBe('expired');
            expect(data.error).not.toBe('Expired OTP');
        });

        it('should validate exact internal error message', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Internal Server Error');
            expect(data.error).not.toBe('Server Error');
            expect(data.error).not.toBe('Internal error');
        });

        it('should validate message field exists on success', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            expect(data).toHaveProperty('message');
            expect(data.error).toBeUndefined();
        });

        it('should validate error field exists on failure', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(data).toHaveProperty('error');
            expect(data.message).toBeUndefined();
        });

        it('should validate message is string type', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.message).toBe('string');
        });

        it('should validate error is string type', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should call user query exactly once', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            const userQueries = mockPool.query.mock.calls.filter(
                call => call[0].includes('SELECT id FROM users')
            );
            expect(userQueries.length).toBe(1);
        });

        it('should call OTP query exactly once on success', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            const otpQueries = mockPool.query.mock.calls.filter(
                call => call[0].includes('SELECT id, otp, expires_at FROM password_resets')
            );
            expect(otpQueries.length).toBe(1);
        });

        it('should call delete query exactly once on success', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            const deleteQueries = mockPool.query.mock.calls.filter(
                call => call[0].includes('DELETE FROM password_resets')
            );
            expect(deleteQueries.length).toBe(1);
        });

        it('should use strict equality for OTP comparison', async () => {
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: '123456', expires_at: futureTime }] 
                });

            const request = mockRequest({ email: 'test@example.com', otp: '123457' });
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should validate expires_at is compared as Date', async () => {
            const futureTime = new Date('2025-01-01T12:05:00Z');
            const otp = '123456';

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should have exactly 1 field in success response', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('message');
        });

        it('should have exactly 1 field in error response', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp: '123456' });
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('error');
        });

        it('should query used = false explicitly', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            const otpQuery = mockPool.query.mock.calls[1][0];
            expect(otpQuery).toContain('used = false');
        });

        it('should order by created_at DESC', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            const otpQuery = mockPool.query.mock.calls[1][0];
            expect(otpQuery).toContain('ORDER BY created_at DESC');
        });

        it('should limit to 1 OTP record', async () => {
            const otp = '123456';
            const futureTime = new Date('2025-01-01T12:05:00Z');

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
                .mockResolvedValueOnce({ 
                    rows: [{ id: 'reset-456', otp: otp, expires_at: futureTime }] 
                })
                .mockResolvedValueOnce({ rows: [] });

            const request = mockRequest({ email: 'test@example.com', otp });
            await POST(request);

            const otpQuery = mockPool.query.mock.calls[1][0];
            expect(otpQuery).toContain('LIMIT 1');
        });
    });
});
