/**
 * @jest-environment node
 */

// Mock modules before imports
const mockGetDatabaseSchema = jest.fn();
const mockGenerateTitleFromSql = jest.fn();
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
    generateTitleFromSql: mockGenerateTitleFromSql
}));

jest.mock('@/lib/api-helpers', () => ({
    withAuth: mockWithAuth,
    withProjectAuth: mockWithProjectAuth
}));

jest.mock('@/lib/rate-limitter', () => ({
    withRateLimit: mockWithRateLimit
}));

// Import after mocks
const { POST } = require('@/app/api/ai/generate-title/[projectId]/route');
const { NextResponse } = require('next/server');

describe('POST /api/ai/generate-title/[projectId]', () => {
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
                { name: 'name', type: 'VARCHAR', nullable: false },
                { name: 'email', type: 'VARCHAR', nullable: false }
            ]
        },
        {
            name: 'posts',
            columns: [
                { name: 'id', type: 'INTEGER', nullable: false },
                { name: 'title', type: 'VARCHAR', nullable: false },
                { name: 'user_id', type: 'INTEGER', nullable: false }
            ]
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDatabaseSchema.mockResolvedValue(mockSchema);
        mockGenerateTitleFromSql.mockResolvedValue('Get all users from database');
    });

    describe('Input Validation', () => {
        it('should reject missing sql', async () => {
            const request = mockRequest({});
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject null sql', async () => {
            const request = mockRequest({ sql: null });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject undefined sql', async () => {
            const request = mockRequest({ sql: undefined });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject empty string sql', async () => {
            const request = mockRequest({ sql: '' });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject non-string sql - number', async () => {
            const request = mockRequest({ sql: 123 });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject non-string sql - array', async () => {
            const request = mockRequest({ sql: ['SELECT * FROM users'] });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject non-string sql - object', async () => {
            const request = mockRequest({ sql: { query: 'SELECT * FROM users' } });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });

        it('should reject non-string sql - boolean', async () => {
            const request = mockRequest({ sql: true });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL query is required');
        });
    });

    describe('Empty Schema Validation', () => {
        it('should reject when database schema is empty', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Cannot generate title, database schema is empty');
        });

        it('should call getDatabaseSchema before checking schema', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });
            
            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should not call generateTitleFromSql when schema is empty', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });
            
            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGenerateTitleFromSql).not.toHaveBeenCalled();
        });
    });

    describe('Successful Title Generation', () => {
        it('should generate title successfully', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.naturalLanguageTitle).toBe('Get all users from database');
        });

        it('should call getDatabaseSchema with correct connection string', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
        });

        it('should call generateTitleFromSql with sql and schema', async () => {
            const sql = 'SELECT name, email FROM users WHERE active = true';
            const request = mockRequest({ sql });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGenerateTitleFromSql).toHaveBeenCalledWith(sql, mockSchema);
            expect(mockGenerateTitleFromSql).toHaveBeenCalledTimes(1);
        });

        it('should return title from AI response', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Find all active users');

            const request = mockRequest({
                sql: 'SELECT * FROM users WHERE active = true'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBe('Find all active users');
        });

        it('should handle complex SQL queries', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Get user posts with join');

            const request = mockRequest({
                sql: 'SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should handle SQL with WHERE clause', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Find users in HR department');

            const request = mockRequest({
                sql: 'SELECT * FROM users WHERE department = \'HR\''
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBe('Find users in HR department');
        });

        it('should handle INSERT queries', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Add new user to database');

            const request = mockRequest({
                sql: 'INSERT INTO users (name, email) VALUES (\'John\', \'john@example.com\')'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBe('Add new user to database');
        });

        it('should handle UPDATE queries', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Update user email address');

            const request = mockRequest({
                sql: 'UPDATE users SET email = \'new@example.com\' WHERE id = 1'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBe('Update user email address');
        });

        it('should handle DELETE queries', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Remove inactive users');

            const request = mockRequest({
                sql: 'DELETE FROM users WHERE active = false'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBe('Remove inactive users');
        });

        it('should handle aggregate queries', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('Count total users');

            const request = mockRequest({
                sql: 'SELECT COUNT(*) FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBe('Count total users');
        });
    });

    describe('Schema Loading', () => {
        it('should load schema before generating title', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            await POST(request, mockContext, mockUser, mockProject);

            // getDatabaseSchema should be called before generateTitleFromSql
            expect(mockGetDatabaseSchema).toHaveBeenCalled();
            expect(mockGenerateTitleFromSql).toHaveBeenCalled();
            
            const getSchemaCallOrder = mockGetDatabaseSchema.mock.invocationCallOrder[0];
            const generateTitleCallOrder = mockGenerateTitleFromSql.mock.invocationCallOrder[0];
            
            expect(getSchemaCallOrder).toBeLessThan(generateTitleCallOrder);
        });

        it('should pass schema to generateTitleFromSql', async () => {
            const customSchema = [
                {
                    name: 'products',
                    columns: [
                        { name: 'id', type: 'INTEGER', nullable: false },
                        { name: 'name', type: 'VARCHAR', nullable: false }
                    ]
                }
            ];

            mockGetDatabaseSchema.mockResolvedValueOnce(customSchema);

            const request = mockRequest({
                sql: 'SELECT * FROM products'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGenerateTitleFromSql).toHaveBeenCalledWith(
                'SELECT * FROM products',
                customSchema
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle getDatabaseSchema errors', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Database connection failed'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate title');
            expect(data.details).toBe('Database connection failed');
        });

        it('should handle generateTitleFromSql errors', async () => {
            mockGenerateTitleFromSql.mockRejectedValueOnce(new Error('AI service unavailable'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate title');
            expect(data.details).toBe('AI service unavailable');
        });

        it('should handle network timeout errors', async () => {
            mockGenerateTitleFromSql.mockRejectedValueOnce(new Error('Request timeout'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.details).toBe('Request timeout');
        });

        it('should handle JSON parsing errors in request', async () => {
            const request = {
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate title');
        });

        it('should handle API key errors', async () => {
            mockGenerateTitleFromSql.mockRejectedValueOnce(new Error('Invalid API key'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBe('Invalid API key');
        });

        it('should handle rate limit errors from AI', async () => {
            mockGenerateTitleFromSql.mockRejectedValueOnce(new Error('Rate limit exceeded'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBe('Rate limit exceeded');
        });
    });

    describe('Response Format', () => {
        it('should include success field in response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('success');
        });

        it('should include naturalLanguageTitle in success response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('naturalLanguageTitle');
        });

        it('should include error field in error response', async () => {
            const request = mockRequest({
                sql: null
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('error');
        });

        it('should include details field in server error response', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('details');
        });

        it('should not include details in validation errors', async () => {
            const request = mockRequest({
                sql: ''
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle SQL with whitespace', async () => {
            const request = mockRequest({
                sql: '  SELECT * FROM users  '
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should handle very long SQL queries', async () => {
            const longSql = 'SELECT * FROM users WHERE ' + 'id = 1 OR '.repeat(100) + 'id = 1';
            const request = mockRequest({ sql: longSql });

            mockGenerateTitleFromSql.mockResolvedValueOnce('Complex user query');

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(mockGenerateTitleFromSql).toHaveBeenCalledWith(longSql, mockSchema);
        });

        it('should handle SQL with special characters', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users WHERE name = \'O\'\'Reilly\''
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle SQL with line breaks', async () => {
            const request = mockRequest({
                sql: 'SELECT *\nFROM users\nWHERE active = true'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle multiline SQL with comments', async () => {
            const request = mockRequest({
                sql: '-- Get all users\nSELECT * FROM users\n-- End query'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle schema with many tables', async () => {
            const largeSchema = Array.from({ length: 50 }, (_, i) => ({
                name: `table${i}`,
                columns: [{ name: 'id', type: 'INTEGER', nullable: false }]
            }));

            mockGetDatabaseSchema.mockResolvedValueOnce(largeSchema);

            const request = mockRequest({
                sql: 'SELECT * FROM table0'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(mockGenerateTitleFromSql).toHaveBeenCalledWith('SELECT * FROM table0', largeSchema);
        });

        it('should handle schema with complex column types', async () => {
            const complexSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'UUID', nullable: false },
                        { name: 'data', type: 'JSONB', nullable: true },
                        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false }
                    ]
                }
            ];

            mockGetDatabaseSchema.mockResolvedValueOnce(complexSchema);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle empty title from AI', async () => {
            mockGenerateTitleFromSql.mockResolvedValueOnce('');

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.naturalLanguageTitle).toBe('');
        });
    });

    describe('Mutation Resistance', () => {
        it('should not accept status 201 for successful generation', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for successful generation', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate validation error status is exactly 400', async () => {
            const request = mockRequest({
                sql: null
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(422);
        });

        it('should validate empty schema error status is exactly 400', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(404);
        });

        it('should validate server error status is exactly 500', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
        });

        it('should validate success is strictly boolean true', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should ensure naturalLanguageTitle is a string', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.naturalLanguageTitle).toBe('string');
        });

        it('should ensure error is a string', async () => {
            const request = mockRequest({
                sql: null
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should ensure details is a string when present', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Test error'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.details).toBe('string');
        });

        it('should not include naturalLanguageTitle in error response', async () => {
            const request = mockRequest({
                sql: null
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageTitle).toBeUndefined();
        });

        it('should not include success in validation error response', async () => {
            const request = mockRequest({
                sql: ''
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBeUndefined();
        });

        it('should not include success in empty schema error response', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBeUndefined();
        });

        it('should not include error in success response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBeUndefined();
        });

        it('should call getDatabaseSchema exactly once', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should call generateTitleFromSql exactly once on success', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGenerateTitleFromSql).toHaveBeenCalledTimes(1);
        });

        it('should not call generateTitleFromSql on validation error', async () => {
            const request = mockRequest({
                sql: null
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGenerateTitleFromSql).not.toHaveBeenCalled();
        });

        it('should validate exact error message for missing sql', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('SQL query is required');
            expect(data.error).not.toBe('SQL is required');
        });

        it('should validate exact error message for empty schema', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Cannot generate title, database schema is empty');
            expect(data.error).not.toBe('Database schema is empty');
        });

        it('should validate exact error message for server errors', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Failed to generate title');
            expect(data.error).not.toBe('Failed');
        });
    });
});
