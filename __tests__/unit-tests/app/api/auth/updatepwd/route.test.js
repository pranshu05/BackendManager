/**
 * @jest-environment node
 */

// Mock modules before imports
const mockPool = {
    query: jest.fn()
};

const mockHashPassword = jest.fn();

jest.mock('@/lib/db', () => ({
    pool: mockPool
}));

jest.mock('@/lib/auth', () => ({
    hashPassword: mockHashPassword
}));

// Import after mocks
const { POST } = require('@/app/api/auth/updatepwd/route');

describe('POST /api/auth/updatepwd', () => {
    const mockRequest = (body) => ({
        json: jest.fn().mockResolvedValue(body)
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Successful Password Update', () => {
        it('should update password successfully', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] }) // User check
                .mockResolvedValueOnce({ rows: [] }); // Update

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('Password updated successfully');
        });

        it('should check if user exists', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT id FROM users WHERE email = $1',
                ['test@example.com']
            );
        });

        it('should hash the new password', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            expect(mockHashPassword).toHaveBeenCalledWith('newPassword123');
        });

        it('should update password in database', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledWith(
                'UPDATE users SET password_hash = $1 WHERE email = $2',
                ['hashed-new-password', 'test@example.com']
            );
        });

        it('should call hashPassword exactly once', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            expect(mockHashPassword).toHaveBeenCalledTimes(1);
        });

        it('should call database query exactly twice on success', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });
    });

    describe('Input Validation', () => {
        it('should reject missing email', async () => {
            const userData = {
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Email and new password are required');
        });

        it('should reject missing newpwd', async () => {
            const userData = {
                email: 'test@example.com',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Email and new password are required');
        });

        it('should reject missing confirmPassword', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123'
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
                newpwd: 'newPassword123',
                confirmPassword: 'differentPassword123'
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
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should reject empty string newpwd', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: '',
                confirmPassword: ''
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should reject empty string confirmPassword', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: ''
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should not check database if validation fails', async () => {
            const userData = {
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).not.toHaveBeenCalled();
        });
    });

    describe('User Not Found', () => {
        it('should return error when user does not exist', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(409);
            expect(data.error).toBe('User with this email does not exist in Registered Users');
        });

        it('should not hash password if user does not exist', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockHashPassword).not.toHaveBeenCalled();
        });

        it('should not update database if user does not exist', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            await POST(request);

            expect(mockPool.query).toHaveBeenCalledTimes(1);
        });

        it('should handle rows.length == 0 correctly', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(409);
        });
    });

    describe('Database Errors', () => {
        it('should handle user query error', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockRejectedValueOnce(new Error('Database error'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Error in Password Update');
        });

        it('should handle update query error', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockHashPassword.mockResolvedValue('hashed-new-password');
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockRejectedValueOnce(new Error('Update failed'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Error in Password Update');
        });

        it('should handle hashing error', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });
            mockHashPassword.mockRejectedValueOnce(new Error('Hash failed'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Error in Password Update');
        });
    });

    describe('Edge Cases', () => {
        it('should handle special characters in password', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'P@ssw0rd!#$%^&*()',
                confirmPassword: 'P@ssw0rd!#$%^&*()'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should handle special characters in email', async () => {
            const userData = {
                email: 'test+tag@example.co.uk',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should handle very long passwords', async () => {
            const longPassword = 'a'.repeat(1000);
            const userData = {
                email: 'test@example.com',
                newpwd: longPassword,
                confirmPassword: longPassword
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
        });

        it('should handle null values in request body', async () => {
            const userData = {
                email: null,
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should handle undefined values in request body', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: undefined,
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should handle JSON parsing error', async () => {
            const request = {
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Error in Password Update');
        });
    });

    describe('Mutation Resistance', () => {
        it('should validate success status is exactly 200', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
            expect(response.status).not.toBe(204);
        });

        it('should validate validation error status is exactly 400', async () => {
            const userData = {
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(401);
            expect(response.status).not.toBe(404);
        });

        it('should validate user not found status is exactly 409', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(409);
            expect(response.status).not.toBe(404);
            expect(response.status).not.toBe(400);
        });

        it('should validate error status is exactly 500', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
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
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.message).toBe('Password updated successfully');
            expect(data.message).not.toBe('Password updated');
            expect(data.message).not.toBe('Password updated successfully.');
        });

        it('should validate exact required fields message', async () => {
            const userData = {
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Email and new password are required');
            expect(data.error).not.toBe('Email and password are required');
        });

        it('should validate exact confirm password message', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123'
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
                newpwd: 'newPassword123',
                confirmPassword: 'different'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Passwords do not match');
            expect(data.error).not.toBe('Password mismatch');
        });

        it('should validate exact user not found message', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('User with this email does not exist in Registered Users');
            expect(data.error).not.toBe('User does not exist');
        });

        it('should validate exact error message', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(data.error).toBe('Error in Password Update');
            expect(data.error).not.toBe('Error in password update');
        });

        it('should validate message is string type', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.message).toBe('string');
        });

        it('should validate error is string type', async () => {
            const userData = {
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should have exactly 1 field in success response', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('message');
        });

        it('should have exactly 1 field in error response', async () => {
            const userData = {
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            const request = mockRequest(userData);
            const response = await POST(request);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(1);
            expect(keys).toContain('error');
        });

        it('should validate equality comparison (==) works correctly for zero length', async () => {
            const userData = {
                email: 'nonexistent@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(409);
        });

        it('should validate inequality comparison (!==) works for password mismatch', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'password1',
                confirmPassword: 'password2'
            };

            const request = mockRequest(userData);
            const response = await POST(request);

            expect(response.status).toBe(400);
        });

        it('should pass newpwd to hashPassword, not confirmPassword', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'correctPassword',
                confirmPassword: 'correctPassword'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            expect(mockHashPassword).toHaveBeenCalledWith('correctPassword');
            expect(mockHashPassword).not.toHaveBeenCalledWith('wrongPassword');
        });

        it('should update with hashed password, not plain text', async () => {
            const userData = {
                email: 'test@example.com',
                newpwd: 'plainPassword',
                confirmPassword: 'plainPassword'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-password-value');

            const request = mockRequest(userData);
            await POST(request);

            const updateCall = mockPool.query.mock.calls[1];
            expect(updateCall[1][0]).toBe('hashed-password-value');
            expect(updateCall[1][0]).not.toBe('plainPassword');
        });

        it('should use correct email in update query', async () => {
            const userData = {
                email: 'correct@example.com',
                newpwd: 'newPassword123',
                confirmPassword: 'newPassword123'
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
                .mockResolvedValueOnce({ rows: [] });

            mockHashPassword.mockResolvedValue('hashed-new-password');

            const request = mockRequest(userData);
            await POST(request);

            const updateCall = mockPool.query.mock.calls[1];
            expect(updateCall[1][1]).toBe('correct@example.com');
        });
    });
});
