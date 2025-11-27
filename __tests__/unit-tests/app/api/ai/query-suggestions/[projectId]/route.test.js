/**
 * @jest-environment node
 */

// Mock modules before imports
const mockGetDatabaseSchema = jest.fn();
const mockGenerateQuerySuggestions = jest.fn();
const mockPool = {
    query: jest.fn()
};

const mockWithAuth = jest.fn();
const mockWithProjectAuth = jest.fn((handler) => handler);

jest.mock('@/lib/db', () => ({
    getDatabaseSchema: mockGetDatabaseSchema,
    pool: mockPool
}));

jest.mock('@/lib/ai', () => ({
    generatequerysuggestions: mockGenerateQuerySuggestions
}));

jest.mock('@/lib/api-helpers', () => ({
    withAuth: mockWithAuth,
    withProjectAuth: mockWithProjectAuth
}));

// Import after mocks
const { GET } = require('@/app/api/ai/query-suggestions/[projectId]/route');
const { NextResponse } = require('next/server');

describe('GET /api/ai/query-suggestions/[projectId]', () => {
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

    const mockRequest = {};

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

    const mockSuggestions = [
        'Show all users in the database',
        'Find posts by a specific user',
        'Count the total number of posts',
        'Get users who have written posts'
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDatabaseSchema.mockResolvedValue(mockSchema);
        mockGenerateQuerySuggestions.mockResolvedValue(mockSuggestions);
    });

    it('logs a non-empty message on failure (mutation killer)', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Schema error'));

        const response = await GET(mockRequest, mockContext, mockUser, mockProject);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to generate suggestions');

        // Ensure console.error received at least one non-empty string argument
        expect(spy).toHaveBeenCalled();
        const found = spy.mock.calls.some(callArgs =>
            callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
        );
        expect(found).toBe(true);

        spy.mockRestore();
    });

    describe('Successful Suggestion Generation', () => {
        it('should generate suggestions successfully', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions).toEqual(mockSuggestions);
        });

        it('should call getDatabaseSchema with correct connection string', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should call generatequerysuggestions with schema', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGenerateQuerySuggestions).toHaveBeenCalledWith(mockSchema);
            expect(mockGenerateQuerySuggestions).toHaveBeenCalledTimes(1);
        });

        it('should return suggestions as array', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.suggestions)).toBe(true);
        });

        it('should handle empty suggestions array', async () => {
            mockGenerateQuerySuggestions.mockResolvedValueOnce([]);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions).toEqual([]);
            expect(data.suggestions.length).toBe(0);
        });

        it('should handle single suggestion', async () => {
            const singleSuggestion = ['Show all users'];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(singleSuggestion);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions).toEqual(singleSuggestion);
            expect(data.suggestions.length).toBe(1);
        });

        it('should handle multiple suggestions', async () => {
            const multipleSuggestions = Array(10).fill(null).map((_, i) => `Suggestion ${i + 1}`);
            mockGenerateQuerySuggestions.mockResolvedValueOnce(multipleSuggestions);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions.length).toBe(10);
        });

        it('should preserve suggestion text exactly', async () => {
            const specificSuggestions = [
                'SELECT * FROM users WHERE id = 1',
                'Complex query with "quotes" and special chars: !@#$%',
                'Query with newlines\nand tabs\t here'
            ];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(specificSuggestions);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.suggestions).toEqual(specificSuggestions);
        });
    });

    describe('Schema Loading', () => {
        it('should load schema before generating suggestions', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalled();
            const schemaCall = mockGetDatabaseSchema.mock.invocationCallOrder[0];
            const suggestionsCall = mockGenerateQuerySuggestions.mock.invocationCallOrder[0];
            expect(schemaCall).toBeLessThan(suggestionsCall);
        });

        it('should handle empty schema', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(mockGenerateQuerySuggestions).toHaveBeenCalledWith([]);
        });

        it('should handle large schema', async () => {
            const largeSchema = Array(50).fill(null).map((_, i) => ({
                name: `table_${i}`,
                columns: [
                    { name: 'id', type: 'INTEGER' },
                    { name: 'data', type: 'TEXT' }
                ]
            }));
            mockGetDatabaseSchema.mockResolvedValueOnce(largeSchema);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(mockGenerateQuerySuggestions).toHaveBeenCalledWith(largeSchema);
        });

        it('should handle schema with complex relationships', async () => {
            const complexSchema = [
                {
                    name: 'users',
                    columns: [{ name: 'id', type: 'INTEGER' }],
                    foreignKeys: [{ column: 'role_id', references: 'roles.id' }]
                }
            ];
            mockGetDatabaseSchema.mockResolvedValueOnce(complexSchema);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(mockGenerateQuerySuggestions).toHaveBeenCalledWith(complexSchema);
        });
    });

    describe('Response Format', () => {
        it('should include suggestions field in response', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('suggestions');
        });

        it('should not include error field on success', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBeUndefined();
        });

        it('should return JSON response', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data).toBe('object');
        });

        it('should ensure suggestions are strings', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            data.suggestions.forEach(suggestion => {
                expect(typeof suggestion).toBe('string');
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle getDatabaseSchema failure', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate suggestions');
        });

        it('should handle generatequerysuggestions failure', async () => {
            mockGenerateQuerySuggestions.mockRejectedValueOnce(new Error('AI service unavailable'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate suggestions');
        });

        it('should handle network timeout', async () => {
            mockGenerateQuerySuggestions.mockRejectedValueOnce(new Error('Network timeout'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate suggestions');
        });

        it('should handle AI parsing errors', async () => {
            mockGenerateQuerySuggestions.mockRejectedValueOnce(new Error('Failed to parse AI response'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to generate suggestions');
        });

        it('should handle invalid API key', async () => {
            mockGenerateQuerySuggestions.mockRejectedValueOnce(new Error('Invalid API key'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
        });

        it('should not expose sensitive error details', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Password: secret123'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Failed to generate suggestions');
            expect(data.error).not.toContain('secret123');
        });

        it('should include error field on failure', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('error');
        });

        it('should not include suggestions on error', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.suggestions).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle suggestions with very long text', async () => {
            const longSuggestion = 'Get all data from users ' + 'where condition '.repeat(100);
            mockGenerateQuerySuggestions.mockResolvedValueOnce([longSuggestion]);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions[0]).toBe(longSuggestion);
        });

        it('should handle suggestions with special characters', async () => {
            const specialChars = [
                'Query with "quotes"',
                "Query with 'apostrophes'",
                'Query with <tags>',
                'Query with & ampersands',
                'Query with unicode: 你好 مرحبا'
            ];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(specialChars);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions).toEqual(specialChars);
        });

        it('should handle suggestions with newlines', async () => {
            const suggestions = ['Line 1\nLine 2', 'Another\nMultiline\nSuggestion'];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(suggestions);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions).toEqual(suggestions);
        });

        it('should handle empty string suggestions', async () => {
            const suggestions = ['', 'Valid suggestion', ''];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(suggestions);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.suggestions).toEqual(suggestions);
        });

        it('should handle null in schema', async () => {
            const schemaWithNull = [
                {
                    name: 'users',
                    columns: null
                }
            ];
            mockGetDatabaseSchema.mockResolvedValueOnce(schemaWithNull);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle schema with no columns', async () => {
            const schemaNoColumns = [{ name: 'users', columns: [] }];
            mockGetDatabaseSchema.mockResolvedValueOnce(schemaNoColumns);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
        });
    });

    describe('Mutation Resistance', () => {
        it('should not accept status 201 for success', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for success', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate error status is exactly 500', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(503);
        });

        it('should ensure suggestions is an array type', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.suggestions)).toBe(true);
            expect(data.suggestions).not.toBeNull();
            expect(typeof data.suggestions).not.toBe('string');
        });

        it('should ensure error is a string type', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
            expect(data.error).not.toBeNull();
            expect(Array.isArray(data.error)).toBe(false);
        });

        it('should validate exact error message', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Failed to generate suggestions');
            expect(data.error).not.toBe('Failed to generate suggestion');
            expect(data.error).not.toBe('failed to generate suggestions');
        });

        it('should call getDatabaseSchema exactly once', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
            expect(mockGetDatabaseSchema.mock.calls.length).toBe(1);
        });

        it('should call generatequerysuggestions exactly once', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGenerateQuerySuggestions).toHaveBeenCalledTimes(1);
            expect(mockGenerateQuerySuggestions.mock.calls.length).toBe(1);
        });

        it('should not call generatequerysuggestions on schema error', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGenerateQuerySuggestions).not.toHaveBeenCalled();
        });

        it('should ensure suggestions field exists only on success', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect('suggestions' in data).toBe(true);
            expect('error' in data).toBe(false);
        });

        it('should ensure error field exists only on failure', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect('error' in data).toBe(true);
            expect('suggestions' in data).toBe(false);
        });

        it('should validate suggestions array length preservation', async () => {
            const exactSuggestions = ['one', 'two', 'three'];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(exactSuggestions);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.suggestions.length).toBe(3);
            expect(data.suggestions.length).not.toBe(2);
            expect(data.suggestions.length).not.toBe(4);
        });

        it('should preserve exact suggestion order', async () => {
            const orderedSuggestions = ['first', 'second', 'third', 'fourth'];
            mockGenerateQuerySuggestions.mockResolvedValueOnce(orderedSuggestions);

            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.suggestions[0]).toBe('first');
            expect(data.suggestions[1]).toBe('second');
            expect(data.suggestions[2]).toBe('third');
            expect(data.suggestions[3]).toBe('fourth');
        });

        it('should ensure string elements in suggestions array', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            data.suggestions.forEach((suggestion, index) => {
                expect(typeof suggestion).toBe('string');
                expect(typeof suggestion).not.toBe('number');
                expect(typeof suggestion).not.toBe('object');
            });
        });

        it('should validate response is NextResponse instance', async () => {
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(response).toBeDefined();
            expect(response.json).toBeDefined();
            expect(typeof response.json).toBe('function');
        });

        it('should ensure consistent response structure', async () => {
            const response1 = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data1 = await response1.json();

            const response2 = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data2 = await response2.json();

            expect(Object.keys(data1)).toEqual(Object.keys(data2));
        });

        it('should validate connection string passed correctly', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledWith(
                'postgresql://test:test@localhost:5432/testdb'
            );
            expect(mockGetDatabaseSchema).not.toHaveBeenCalledWith('');
            expect(mockGetDatabaseSchema).not.toHaveBeenCalledWith(null);
        });

        it('should validate schema passed to suggestions generator', async () => {
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockGenerateQuerySuggestions).toHaveBeenCalledWith(mockSchema);
            expect(mockGenerateQuerySuggestions.mock.calls[0][0]).toBe(mockSchema);
        });

        it('should not mutate schema object', async () => {
            const originalSchema = JSON.parse(JSON.stringify(mockSchema));
            
            await GET(mockRequest, mockContext, mockUser, mockProject);

            expect(mockSchema).toEqual(originalSchema);
        });

        it('should not mutate suggestions array', async () => {
            const originalSuggestions = [...mockSuggestions];
            
            const response = await GET(mockRequest, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(mockSuggestions).toEqual(originalSuggestions);
        });
    });
});
