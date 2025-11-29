/**
 * @jest-environment node
 */

// Mock modules before imports
const mockGetDatabaseSchema = jest.fn();
const mockParseDbError = jest.fn();
const mockPool = {
    query: jest.fn()
};

const mockWithAuth = jest.fn();
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockWithRateLimit = jest.fn((handler) => handler);

jest.mock('@/lib/db', () => ({
    getDatabaseSchema: mockGetDatabaseSchema,
    pool: mockPool
}));

jest.mock('@/lib/ai', () => ({
    parseDbError: mockParseDbError
}));

jest.mock('@/lib/api-helpers', () => ({
    withAuth: mockWithAuth,
    withProjectAuth: mockWithProjectAuth
}));

jest.mock('@/lib/rate-limitter', () => ({
    withRateLimit: mockWithRateLimit
}));

// Import after mocks
const { POST } = require('@/app/api/ai/parse-error/[projectId]/route');
const { NextResponse } = require('next/server');

describe('POST /api/ai/parse-error/[projectId]', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
    };

    const mockProject = {
        id: 'project-456',
        connection_string: 'postgresql://test:test@localhost:5432/testdb',
        database_name: 'testdb',
        project_name: 'Test Project'
    };

    const mockRequest = (body) => ({
        json: jest.fn().mockResolvedValue(body)
    });

    const mockContext = {
        params: Promise.resolve({ projectId: 'project-456' })
    };

    const mockSchema = [
        {
            name: 'users',
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'name', type: 'VARCHAR', nullable: false }
            ]
        }
    ];

    const mockParsedError = {
        errorType: 'Missing Data',
        summary: 'Table does not exist',
        userFriendlyExplanation: 'The table you are trying to access does not exist in the database.',
        foreignKeyExplanation: null,
        technicalDetails: {
            originalError: 'relation "users" does not exist',
            availableContext: {
                schema: true,
                sql: true
            },
            missingData: []
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDatabaseSchema.mockResolvedValue(mockSchema);
        mockParseDbError.mockResolvedValue(mockParsedError);
    });

    it('wraps the handler with rate limiter using isAI: true', () => {
        // Re-import the route to trigger the wrapper call after mock counters are cleared
        jest.resetModules();
        mockWithRateLimit.mockClear();

        // Re-require with mocks still in effect
        // eslint-disable-next-line global-require
        require('@/app/api/ai/parse-error/[projectId]/route');

        expect(mockWithRateLimit).toHaveBeenCalled();
        const [wrappedHandler, options] = mockWithRateLimit.mock.calls[0];
        expect(typeof wrappedHandler).toBe('function');
        expect(options).toBeDefined();
        expect(options.isAI).toBe(true);
    });

    describe('Input Validation', () => {
        it('should reject missing error field', async () => {
            const request = mockRequest({});
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing "error" field in request body');
        });

        it('should reject null error field', async () => {
            const request = mockRequest({ error: null });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing "error" field in request body');
        });

        it('should reject undefined error field', async () => {
            const request = mockRequest({ error: undefined });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing "error" field in request body');
        });

        it('should reject empty string error', async () => {
            const request = mockRequest({ error: '' });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing "error" field in request body');
        });

        it('should reject falsy value 0', async () => {
            const request = mockRequest({ error: 0 });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing "error" field in request body');
        });

        it('should reject false boolean', async () => {
            const request = mockRequest({ error: false });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing "error" field in request body');
        });
    });

    describe('Successful Error Parsing', () => {
        it('should parse error successfully with all fields', async () => {
            const request = mockRequest({
                error: 'relation "users" does not exist',
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.parsed).toEqual(mockParsedError);
        });

        it('should parse error successfully without sql', async () => {
            const request = mockRequest({
                error: 'syntax error at or near "SELECT"'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should call parseDbError with correct parameters', async () => {
            const error = 'duplicate key value violates unique constraint';
            const sql = 'INSERT INTO users (id, name) VALUES (1, \'John\')';
            
            const request = mockRequest({ error, sql });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(error, sql, mockSchema);
            expect(mockParseDbError).toHaveBeenCalledTimes(1);
        });

        it('should call getDatabaseSchema with correct connection string', async () => {
            const request = mockRequest({
                error: 'some error'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should handle various error types', async () => {
            const errorTypes = [
                'Foreign Key Violation',
                'Duplicate Value',
                'Invalid Input',
                'Syntax Error',
                'Permission Denied',
                'Connection Error',
                'Unknown'
            ];

            for (const errorType of errorTypes) {
                mockParseDbError.mockResolvedValueOnce({
                    ...mockParsedError,
                    errorType
                });

                const request = mockRequest({
                    error: 'test error'
                });

                const response = await POST(request, mockContext, mockUser, mockProject);
                const data = await response.json();

                expect(data.parsed.errorType).toBe(errorType);
            }
        });
    });

    describe('Schema Loading', () => {
        it('should attempt to load schema', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalled();
        });

        it('should continue parsing even if schema loading fails', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Connection failed'));

            const request = mockRequest({
                error: 'test error',
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockParseDbError).toHaveBeenCalledWith('test error', 'SELECT * FROM users', null);
        });

        it('should pass null schema to parseDbError when loading fails', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Schema error'));

            const request = mockRequest({
                error: 'test error'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(
                'test error',
                undefined,
                null
            );
        });

        it('should pass loaded schema to parseDbError', async () => {
            const customSchema = [
                { name: 'products', columns: [{ name: 'id', type: 'INT' }] }
            ];
            mockGetDatabaseSchema.mockResolvedValueOnce(customSchema);

            const request = mockRequest({
                error: 'test error',
                sql: 'SELECT * FROM products'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(
                'test error',
                'SELECT * FROM products',
                customSchema
            );
        });
    });

    describe('SQL Parameter Handling', () => {
        it('should pass sql to parseDbError when provided', async () => {
            const sql = 'DELETE FROM users WHERE id = 1';
            const request = mockRequest({
                error: 'permission denied',
                sql
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(
                'permission denied',
                sql,
                mockSchema
            );
        });

        it('should pass undefined sql when not provided', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(
                'test error',
                undefined,
                mockSchema
            );
        });

        it('should handle null sql', async () => {
            const request = mockRequest({
                error: 'test error',
                sql: null
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(
                'test error',
                null,
                mockSchema
            );
        });

        it('should handle empty string sql', async () => {
            const request = mockRequest({
                error: 'test error',
                sql: ''
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledWith(
                'test error',
                '',
                mockSchema
            );
        });
    });

    describe('Error Types', () => {
        it('should handle Missing Data errors', async () => {
            mockParseDbError.mockResolvedValueOnce({
                errorType: 'Missing Data',
                summary: 'Table not found',
                userFriendlyExplanation: 'The table does not exist.',
                foreignKeyExplanation: null,
                technicalDetails: {
                    originalError: 'relation does not exist',
                    availableContext: { schema: true, sql: true },
                    missingData: ['users table']
                }
            });

            const request = mockRequest({
                error: 'relation "users" does not exist'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed.errorType).toBe('Missing Data');
        });

        it('should handle Foreign Key Violation errors', async () => {
            mockParseDbError.mockResolvedValueOnce({
                errorType: 'Foreign Key Violation',
                summary: 'Referenced record does not exist',
                userFriendlyExplanation: 'You are trying to create a relationship to something that does not exist.',
                foreignKeyExplanation: 'You are trying to link a post to a user, but that user does not exist in the database.',
                technicalDetails: {
                    originalError: 'foreign key constraint violated',
                    availableContext: { schema: true, sql: true },
                    missingData: []
                }
            });

            const request = mockRequest({
                error: 'insert or update on table "posts" violates foreign key constraint'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed.errorType).toBe('Foreign Key Violation');
            expect(data.parsed.foreignKeyExplanation).toBeTruthy();
        });

        it('should handle Duplicate Value errors', async () => {
            mockParseDbError.mockResolvedValueOnce({
                errorType: 'Duplicate Value',
                summary: 'Value already exists',
                userFriendlyExplanation: 'The value you are trying to insert already exists.',
                foreignKeyExplanation: null,
                technicalDetails: {
                    originalError: 'duplicate key value',
                    availableContext: { schema: true, sql: true },
                    missingData: []
                }
            });

            const request = mockRequest({
                error: 'duplicate key value violates unique constraint'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed.errorType).toBe('Duplicate Value');
        });

        it('should handle Syntax Error', async () => {
            mockParseDbError.mockResolvedValueOnce({
                errorType: 'Syntax Error',
                summary: 'SQL syntax is incorrect',
                userFriendlyExplanation: 'There is a mistake in the query structure.',
                foreignKeyExplanation: null,
                technicalDetails: {
                    originalError: 'syntax error at or near',
                    availableContext: { schema: true, sql: true },
                    missingData: []
                }
            });

            const request = mockRequest({
                error: 'syntax error at or near "SELECT"'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed.errorType).toBe('Syntax Error');
        });

        it('should handle Permission Denied errors', async () => {
            mockParseDbError.mockResolvedValueOnce({
                errorType: 'Permission Denied',
                summary: 'Access not allowed',
                userFriendlyExplanation: 'You do not have permission to perform this action.',
                foreignKeyExplanation: null,
                technicalDetails: {
                    originalError: 'permission denied',
                    availableContext: { schema: true, sql: true },
                    missingData: []
                }
            });

            const request = mockRequest({
                error: 'permission denied for table users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed.errorType).toBe('Permission Denied');
        });
    });

    describe('Response Format', () => {
        it('should include success field in response', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('success');
        });

        it('should include parsed field in success response', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('parsed');
        });

        it('should include all required fields in parsed error', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed).toHaveProperty('errorType');
            expect(data.parsed).toHaveProperty('summary');
            expect(data.parsed).toHaveProperty('userFriendlyExplanation');
            expect(data.parsed).toHaveProperty('foreignKeyExplanation');
            expect(data.parsed).toHaveProperty('technicalDetails');
        });

        it('should include technical details with correct structure', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed.technicalDetails).toHaveProperty('originalError');
            expect(data.parsed.technicalDetails).toHaveProperty('availableContext');
            expect(data.parsed.technicalDetails.availableContext).toHaveProperty('schema');
            expect(data.parsed.technicalDetails.availableContext).toHaveProperty('sql');
        });
    });

    describe('Error Handling', () => {
        it('should handle parseDbError failures', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('AI service unavailable'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Failed to parse database error');
            expect(data.details).toBe('AI service unavailable');
        });

        it('should handle JSON parsing errors in request', async () => {
            const request = {
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Failed to parse database error');
        });

        it('should handle network errors', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Network timeout'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.details).toBe('Network timeout');
        });

        it('should handle AI API errors', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Invalid API key'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBe('Invalid API key');
        });

        it('should include error details in error response', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('error');
        });

        it('should include success false in error response', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long error messages', async () => {
            const longError = 'Error: '.repeat(500);
            const request = mockRequest({
                error: longError
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(mockParseDbError).toHaveBeenCalledWith(longError, undefined, mockSchema);
        });

        it('should handle error messages with special characters', async () => {
            const request = mockRequest({
                error: 'Error: "users" table doesn\'t exist at position $1'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle error messages with newlines', async () => {
            const request = mockRequest({
                error: 'Line 1 error\nLine 2 error\nLine 3 error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle error as object', async () => {
            const request = mockRequest({
                error: { message: 'Object error', code: '23505' }
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle error as number', async () => {
            const request = mockRequest({
                error: 12345
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle empty schema array', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle complex nested error objects', async () => {
            const request = mockRequest({
                error: {
                    message: 'Nested error',
                    stack: 'Stack trace here',
                    cause: { code: 'ER_DUP_ENTRY' }
                }
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });
    });

    describe('Mutation Resistance', () => {
        it('should not accept status 201 for successful parsing', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for successful parsing', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate validation error status is exactly 400', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(422);
        });

        it('should validate server error status is exactly 500', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
        });

        it('should validate success is strictly boolean true', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should validate success is strictly boolean false on error', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(false);
            expect(data.success).not.toBe(0);
            expect(data.success).not.toBe('false');
        });

        it('should ensure error is a string in validation error', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should ensure error is a string in server error', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should ensure details is a string when present', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Test error message'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.details).toBe('string');
        });

        it('should not include parsed in error response', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.parsed).toBeUndefined();
        });

        it('should not include success in validation error', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBeUndefined();
        });

        it('should not include error field in success response', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBeUndefined();
        });

        it('should not include details in success response', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBeUndefined();
        });

        it('should call parseDbError exactly once on success', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).toHaveBeenCalledTimes(1);
        });

        it('should call getDatabaseSchema exactly once', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should not call parseDbError on validation error', async () => {
            const request = mockRequest({});

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockParseDbError).not.toHaveBeenCalled();
        });

        it('should validate exact error message for missing error field', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Missing "error" field in request body');
            expect(data.error).not.toBe('Missing error field');
        });

        it('should validate exact error message for server errors', async () => {
            mockParseDbError.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Failed to parse database error');
            expect(data.error).not.toBe('Failed to parse error');
        });

        it('should ensure parsed is an object', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.parsed).toBe('object');
            expect(data.parsed).not.toBeNull();
        });

        it('should ensure errorType is a string', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.parsed.errorType).toBe('string');
        });

        it('should ensure summary is a string', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.parsed.summary).toBe('string');
        });

        it('should ensure userFriendlyExplanation is a string', async () => {
            const request = mockRequest({
                error: 'test error'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.parsed.userFriendlyExplanation).toBe('string');
        });
    });
});

// =========================
// MUTATION-KILLER TESTS
// These tests detect mutations that replace console.error string literals with empty strings
// or remove logging entirely. They also add coverage for error branches (schema load fail,
// parseDbError rejection, and JSON parse rejection) that commonly survive mutation testing.
// Paste this block inside the top-level describe(...) for the route tests.
// =========================
describe('Mutation killers: logging & error branches', () => {
    let mockReq;
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com'
        };

        const mockProject = {
            id: 'project-456',
            connection_string: 'postgresql://test:test@localhost:5432/testdb',
            database_name: 'testdb',
            project_name: 'Test Project'
        };

        const mockContext = {
            params: Promise.resolve({ projectId: 'project-456' })
        };

    const mockSchema = [
        {
            name: 'users',
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'name', type: 'VARCHAR', nullable: false }
            ]
        }
    ];

    const mockParsedError = {
        errorType: 'Missing Data',
        summary: 'Table does not exist',
        userFriendlyExplanation: 'The table you are trying to access does not exist in the database.',
        foreignKeyExplanation: null,
        technicalDetails: {
            originalError: 'relation "users" does not exist',
            availableContext: {
                schema: true,
                sql: true
            },
            missingData: []
        }
    };


    beforeEach(() => {
        jest.clearAllMocks();

        // Initialize mockReq
        mockReq = {
            json: jest.fn().mockResolvedValue({
                error: 'dummy error'
            })
        };

        // baseline happy schema
        mockGetDatabaseSchema.mockResolvedValue(mockSchema);
        mockParseDbError.mockResolvedValue(mockParsedError);
    });

    // Helper: check that console.error was invoked with at least one non-empty string argument
    const expectConsoleErrorHasNonEmptyString = (spy) => {
        expect(spy).toHaveBeenCalled();
        // Find any call that contains a non-empty string argument
        const found = spy.mock.calls.some(callArgs =>
            callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
        );
        expect(found).toBe(true);
    };

    it('logs a non-empty message when getDatabaseSchema fails (mutation killer)', async () => {
        const schemaError = new Error('schema connection failed');
        mockGetDatabaseSchema.mockRejectedValueOnce(schemaError);

        const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        mockReq.json.mockResolvedValue({
            error: 'relation "users" does not exist'
        });

        const response = await POST(mockReq, mockContext, mockUser, mockProject);
        const data = await response.json();

        // route should still return success 200 and attempt parse (schema was null)
        expect(response.status).toBe(200);
        expect(mockParseDbError).toHaveBeenCalledWith('relation "users" does not exist', undefined, null);

        // detect mutations that empty the string literal passed to console.warn
        expect(spy).toHaveBeenCalled();
        const found = spy.mock.calls.some(callArgs =>
            callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
        );
        expect(found).toBe(true);

        spy.mockRestore();
    });

    it('logs a non-empty message when parseDbError rejects (mutation killer)', async () => {
        const aiError = new Error('AI service down');
        mockParseDbError.mockRejectedValueOnce(aiError);

        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockReq.json.mockResolvedValue({
            error: 'some db error'
        });

        const response = await POST(mockReq, mockContext, mockUser, mockProject);
        const data = await response.json();

        // on parse failure the route should respond 500 and include details
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to parse database error');
        expect(typeof data.details).toBe('string');

        // detect mutated/empty console.error message
        expectConsoleErrorHasNonEmptyString(spy);

        spy.mockRestore();
    });

    it('logs a non-empty message when request.json() throws (JSON parse error)', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const badRequest = {
            json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
        };

        const response = await POST(badRequest, mockContext, mockUser, mockProject);
        const data = await response.json();

        // ensure route returns 500 + failure shape
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to parse database error');

        // logging must include a non-empty string argument (kills console.error string -> "")
        expectConsoleErrorHasNonEmptyString(spy);

        spy.mockRestore();
    });

    it('ensures console.error messages are non-empty across other error branches', async () => {
        // Trigger DB schema load (ok), then trigger parseDbError rejection again to cover additional path
        const aiError = new Error('Another AI fail');
        mockParseDbError.mockRejectedValueOnce(aiError);

        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockReq.json.mockResolvedValue({
            error: 'duplicate key value violates unique constraint',
            sql: 'INSERT INTO x VALUES (1)'
        });

        const response = await POST(mockReq, mockContext, mockUser, mockProject);

        // Should be server error and log present
        expect(response.status).toBe(500);

        // Assert that at least one console.error call contained a non-empty string
        expectConsoleErrorHasNonEmptyString(spy);

        spy.mockRestore();
    });
});
