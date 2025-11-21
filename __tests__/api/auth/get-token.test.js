/**
 * @jest-environment node
 */

// Mock modules before imports
const mockCreateJWTToken = jest.fn();
const mockWithAuth = jest.fn((handler) => handler);

jest.mock('@/lib/auth', () => ({
    createJWTToken: mockCreateJWTToken
}));

jest.mock('@/lib/api-helpers', () => ({
    withAuth: mockWithAuth
}));

// Import after mocks
const { POST } = require('@/app/api/auth/get-token/route');

describe('POST /api/auth/get-token', () => {
    const mockRequest = {};
    const mockContext = {};
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Token Generation', () => {
        it('should generate API token successfully', async () => {
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
            mockCreateJWTToken.mockReturnValue(mockToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('API token generated successfully');
            expect(data.token).toBe(mockToken);
        });

        it('should call createJWTToken with correct payload', async () => {
            mockCreateJWTToken.mockReturnValue('mock-token');

            await POST(mockRequest, mockContext, mockUser);

            expect(mockCreateJWTToken).toHaveBeenCalledWith({
                userId: 'user-123',
                email: 'test@example.com',
                type: 'api_token'
            });
        });

        it('should include userId from user object', async () => {
            mockCreateJWTToken.mockReturnValue('mock-token');

            await POST(mockRequest, mockContext, mockUser);

            const callArgs = mockCreateJWTToken.mock.calls[0][0];
            expect(callArgs.userId).toBe('user-123');
        });

        it('should include email from user object', async () => {
            mockCreateJWTToken.mockReturnValue('mock-token');

            await POST(mockRequest, mockContext, mockUser);

            const callArgs = mockCreateJWTToken.mock.calls[0][0];
            expect(callArgs.email).toBe('test@example.com');
        });

        it('should set type to api_token', async () => {
            mockCreateJWTToken.mockReturnValue('mock-token');

            await POST(mockRequest, mockContext, mockUser);

            const callArgs = mockCreateJWTToken.mock.calls[0][0];
            expect(callArgs.type).toBe('api_token');
        });

        it('should handle different user IDs', async () => {
            mockCreateJWTToken.mockReturnValue('mock-token');
            const differentUser = { ...mockUser, id: 'user-456' };

            await POST(mockRequest, mockContext, differentUser);

            expect(mockCreateJWTToken).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-456' })
            );
        });

        it('should handle different email addresses', async () => {
            mockCreateJWTToken.mockReturnValue('mock-token');
            const differentUser = { ...mockUser, email: 'different@example.com' };

            await POST(mockRequest, mockContext, differentUser);

            expect(mockCreateJWTToken).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'different@example.com' })
            );
        });
    });

    describe('Response Structure', () => {
        beforeEach(() => {
            mockCreateJWTToken.mockReturnValue('test-token');
        });

        it('should return success field', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data).toHaveProperty('success');
        });

        it('should return message field', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data).toHaveProperty('message');
        });

        it('should return token field', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data).toHaveProperty('token');
        });

        it('should return expiresIn field', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data).toHaveProperty('expiresIn');
        });

        it('should return usage field', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data).toHaveProperty('usage');
        });

        it('should have expiresIn value of 7 days', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.expiresIn).toBe('7 days');
        });

        it('should include usage description', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.usage).toHaveProperty('description');
            expect(data.usage.description).toBe('Use this token in the Authorization header');
        });

        it('should include usage example', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.usage).toHaveProperty('example');
        });

        it('should format usage example correctly', async () => {
            const mockToken = 'test-jwt-token';
            mockCreateJWTToken.mockReturnValue(mockToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.usage.example).toBe(`Authorization: Bearer ${mockToken}`);
        });

        it('should include token in usage example', async () => {
            const mockToken = 'custom-token-123';
            mockCreateJWTToken.mockReturnValue(mockToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.usage.example).toContain(mockToken);
        });
    });

    describe('Token Format', () => {
        it('should return generated token in response', async () => {
            const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
            mockCreateJWTToken.mockReturnValue(expectedToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.token).toBe(expectedToken);
        });

        it('should handle long JWT tokens', async () => {
            const longToken = 'a'.repeat(500);
            mockCreateJWTToken.mockReturnValue(longToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.token).toBe(longToken);
            expect(data.token.length).toBe(500);
        });

        it('should handle tokens with special characters', async () => {
            const specialToken = 'eyJ+abc-def_123.xyz+456_789';
            mockCreateJWTToken.mockReturnValue(specialToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.token).toBe(specialToken);
        });
    });

    describe('User Context', () => {
        it('should work with user object without name field', async () => {
            mockCreateJWTToken.mockReturnValue('token');
            const userWithoutName = { id: 'user-123', email: 'test@example.com' };

            const response = await POST(mockRequest, mockContext, userWithoutName);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should work with numeric user IDs', async () => {
            mockCreateJWTToken.mockReturnValue('token');
            const userWithNumericId = { ...mockUser, id: 12345 };

            await POST(mockRequest, mockContext, userWithNumericId);

            expect(mockCreateJWTToken).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 12345 })
            );
        });

        it('should work with UUID user IDs', async () => {
            mockCreateJWTToken.mockReturnValue('token');
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const userWithUUID = { ...mockUser, id: uuid };

            await POST(mockRequest, mockContext, userWithUUID);

            expect(mockCreateJWTToken).toHaveBeenCalledWith(
                expect.objectContaining({ userId: uuid })
            );
        });

        it('should work with email containing special characters', async () => {
            mockCreateJWTToken.mockReturnValue('token');
            const specialEmail = 'user+tag@sub.example.com';
            const userWithSpecialEmail = { ...mockUser, email: specialEmail };

            await POST(mockRequest, mockContext, userWithSpecialEmail);

            expect(mockCreateJWTToken).toHaveBeenCalledWith(
                expect.objectContaining({ email: specialEmail })
            );
        });
    });

    describe('withAuth Middleware', () => {
        it('should wrap POST handler', () => {
            // POST handler should be a function
            expect(typeof POST).toBe('function');
        });

        it('should return a function from withAuth mock', () => {
            // Verify the mock returns a function
            const handler = async () => {};
            const wrapped = mockWithAuth(handler);
            expect(typeof wrapped).toBe('function');
        });
    });

    describe('Mutation Resistance', () => {
        beforeEach(() => {
            mockCreateJWTToken.mockReturnValue('test-token');
        });

        it('should validate success status is exactly 200', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
            expect(response.status).not.toBe(204);
        });

        it('should validate success field is exactly true', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should validate exact success message', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.message).toBe('API token generated successfully');
            expect(data.message).not.toBe('Token generated successfully');
            expect(data.message).not.toBe('API token generated');
        });

        it('should validate exact expiresIn value', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.expiresIn).toBe('7 days');
            expect(data.expiresIn).not.toBe('7d');
            expect(data.expiresIn).not.toBe('7 Days');
            expect(data.expiresIn).not.toBe('seven days');
        });

        it('should validate exact usage description', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.usage.description).toBe('Use this token in the Authorization header');
            expect(data.usage.description).not.toBe('Use this token in Authorization header');
            expect(data.usage.description).not.toBe('Use this token in the authorization header');
        });

        it('should validate usage example starts with Authorization: Bearer', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.usage.example).toMatch(/^Authorization: Bearer /);
            expect(data.usage.example).not.toMatch(/^authorization: bearer /);
            expect(data.usage.example).not.toMatch(/^Bearer /);
        });

        it('should validate type field is exactly api_token', async () => {
            await POST(mockRequest, mockContext, mockUser);

            const callArgs = mockCreateJWTToken.mock.calls[0][0];
            expect(callArgs.type).toBe('api_token');
            expect(callArgs.type).not.toBe('apiToken');
            expect(callArgs.type).not.toBe('API_TOKEN');
            expect(callArgs.type).not.toBe('api-token');
        });

        it('should validate success is boolean type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.success).toBe('boolean');
        });

        it('should validate message is string type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.message).toBe('string');
        });

        it('should validate token is string type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.token).toBe('string');
        });

        it('should validate expiresIn is string type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.expiresIn).toBe('string');
        });

        it('should validate usage is object type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.usage).toBe('object');
            expect(data.usage).not.toBeNull();
        });

        it('should validate usage.description is string type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.usage.description).toBe('string');
        });

        it('should validate usage.example is string type', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(typeof data.usage.example).toBe('string');
        });

        it('should call createJWTToken exactly once', async () => {
            await POST(mockRequest, mockContext, mockUser);

            expect(mockCreateJWTToken).toHaveBeenCalledTimes(1);
        });

        it('should not call createJWTToken multiple times', async () => {
            await POST(mockRequest, mockContext, mockUser);
            
            expect(mockCreateJWTToken.mock.calls.length).toBe(1);
            expect(mockCreateJWTToken.mock.calls.length).not.toBe(2);
        });

        it('should ensure token matches the generated token exactly', async () => {
            const specificToken = 'very-specific-token-12345';
            mockCreateJWTToken.mockReturnValue(specificToken);

            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.token).toBe(specificToken);
            expect(data.token).not.toBe('very-specific-token-1234');
            expect(data.token).not.toBe('very-specific-token-123456');
        });

        it('should not have error field on success', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.error).toBeUndefined();
        });

        it('should have exactly 5 top-level fields in response', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            const keys = Object.keys(data);
            expect(keys.length).toBe(5);
            expect(keys).toContain('success');
            expect(keys).toContain('message');
            expect(keys).toContain('token');
            expect(keys).toContain('expiresIn');
            expect(keys).toContain('usage');
        });

        it('should have exactly 2 fields in usage object', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            const usageKeys = Object.keys(data.usage);
            expect(usageKeys.length).toBe(2);
            expect(usageKeys).toContain('description');
            expect(usageKeys).toContain('example');
        });

        it('should validate payload has exactly 3 fields', async () => {
            await POST(mockRequest, mockContext, mockUser);

            const payload = mockCreateJWTToken.mock.calls[0][0];
            const payloadKeys = Object.keys(payload);
            expect(payloadKeys.length).toBe(3);
            expect(payloadKeys).toContain('userId');
            expect(payloadKeys).toContain('email');
            expect(payloadKeys).toContain('type');
        });

        it('should ensure userId is not modified', async () => {
            const originalId = 'user-original-123';
            const user = { id: originalId, email: 'test@example.com' };
            
            await POST(mockRequest, mockContext, user);

            const payload = mockCreateJWTToken.mock.calls[0][0];
            expect(payload.userId).toBe(originalId);
            expect(payload.userId).not.toBe('user-123');
        });

        it('should ensure email is not modified', async () => {
            const originalEmail = 'original@example.com';
            const user = { id: 'user-123', email: originalEmail };
            
            await POST(mockRequest, mockContext, user);

            const payload = mockCreateJWTToken.mock.calls[0][0];
            expect(payload.email).toBe(originalEmail);
            expect(payload.email).not.toBe('test@example.com');
        });

        it('should validate response is JSON format', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            
            // Should be able to parse JSON without error
            const data = await response.json();
            expect(data).toBeDefined();
        });

        it('should not include userId in response', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.userId).toBeUndefined();
        });

        it('should not include email in response', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.email).toBeUndefined();
        });

        it('should not include type in response', async () => {
            const response = await POST(mockRequest, mockContext, mockUser);
            const data = await response.json();

            expect(data.type).toBeUndefined();
        });
    });
});
