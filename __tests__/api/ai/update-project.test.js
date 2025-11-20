/**
 * @jest-environment node
 */

// Mock modules before imports
const mockGetDatabaseSchema = jest.fn();
const mockAnalyzeProjectUpdateRequest = jest.fn();
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
    analyzeProjectUpdateRequest: mockAnalyzeProjectUpdateRequest
}));

jest.mock('@/lib/api-helpers', () => ({
    withAuth: mockWithAuth,
    withProjectAuth: mockWithProjectAuth
}));

jest.mock('@/lib/rate-limitter', () => ({
    withRateLimit: mockWithRateLimit
}));

// Import after mocks
const { POST } = require('@/app/api/ai/update-project/[projectId]/route');
const { NextResponse } = require('next/server');

describe('POST /api/ai/update-project/[projectId]', () => {
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
                { name: 'id', type: 'UUID', nullable: false, constraint: 'PRIMARY KEY' },
                { name: 'name', type: 'VARCHAR', nullable: false },
                { name: 'email', type: 'VARCHAR', nullable: false }
            ]
        },
        {
            name: 'posts',
            columns: [
                { name: 'id', type: 'UUID', nullable: false, constraint: 'PRIMARY KEY' },
                { name: 'title', type: 'VARCHAR', nullable: false },
                { name: 'user_id', type: 'UUID', nullable: false }
            ]
        }
    ];

    const mockAnalysisResult = {
        operations: [
            {
                type: 'create_table',
                target: 'comments',
                sql: 'CREATE TABLE comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), content TEXT, post_id UUID)',
                explaination: 'Create a new comments table',
                risk_level: 'low',
                is_idempotent: false
            },
            {
                type: 'alter_table',
                target: 'users',
                sql: 'ALTER TABLE users ADD COLUMN age INTEGER',
                explaination: 'Add age column to users table',
                risk_level: 'medium',
                is_idempotent: false
            }
        ],
        summary: 'Adding comments table and age field to users',
        requires_confirmation: true,
        estimated_impact: 'Will create 1 new table and modify 1 existing table'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDatabaseSchema.mockResolvedValue(mockSchema);
        mockAnalyzeProjectUpdateRequest.mockResolvedValue(mockAnalysisResult);
    });

    describe('Input Validation', () => {
        it('should reject missing naturalLanguageInput', async () => {
            const request = mockRequest({});

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject null naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: null });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject undefined naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: undefined });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject empty string naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject whitespace-only naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: '   ' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject number as naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: 123 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject object as naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: { text: 'update' } });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should reject array as naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: ['update'] });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Natural language update description must be a non-empty string');
        });

        it('should accept valid string naturalLanguageInput', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add a comments table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });
    });

    describe('Schema Validation', () => {
        it('should reject empty schema', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({ naturalLanguageInput: 'Add a table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Database schema is empty. Use /api/ai/create-project to initialize the database first.');
        });

        it('should handle schema fetch errors', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Connection failed'));

            const request = mockRequest({ naturalLanguageInput: 'Add a table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Failed to fetch current database schema');
            expect(data.details).toBe('Connection failed');
        });

        it('should call getDatabaseSchema with correct connection string', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add a table' });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should pass schema to analysis function', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add a table' });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockAnalyzeProjectUpdateRequest).toHaveBeenCalledWith(
                'Add a table',
                mockSchema,
                mockProject.project_name
            );
        });
    });

    describe('Successful Update Analysis', () => {
        it('should analyze update request successfully', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add comments table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should call analyzeProjectUpdateRequest with correct parameters', async () => {
            const input = 'Add a comments table with text content';
            const request = mockRequest({ naturalLanguageInput: input });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockAnalyzeProjectUpdateRequest).toHaveBeenCalledWith(
                input,
                mockSchema,
                mockProject.project_name
            );
            expect(mockAnalyzeProjectUpdateRequest).toHaveBeenCalledTimes(1);
        });

        it('should include operations in response', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis).toBeDefined();
            expect(data.updateAnalysis.operations).toEqual(mockAnalysisResult.operations);
        });

        it('should include summary in response', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis.summary).toBe(mockAnalysisResult.summary);
        });

        it('should include estimatedImpact in response', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis.estimatedImpact).toBe(mockAnalysisResult.estimated_impact);
        });

        it('should include requiresConfirmation in response', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis.requiresConfirmation).toBe(true);
        });

        it('should handle missing estimated_impact', async () => {
            const resultWithoutImpact = { ...mockAnalysisResult };
            delete resultWithoutImpact.estimated_impact;
            mockAnalyzeProjectUpdateRequest.mockResolvedValueOnce(resultWithoutImpact);

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis.estimatedImpact).toBe('Impact assessment not available');
        });
    });

    describe('Risk Assessment', () => {
        it('should include risk assessment in response', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment).toBeDefined();
        });

        it('should calculate total operations count', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment.totalOperations).toBe(2);
        });

        it('should calculate risk breakdown correctly', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment.riskBreakdown.low).toBe(1);
            expect(data.riskAssessment.riskBreakdown.medium).toBe(1);
            expect(data.riskAssessment.riskBreakdown.high).toBe(0);
        });

        it('should filter high risk operations', async () => {
            const highRiskResult = {
                operations: [
                    {
                        type: 'drop_table',
                        target: 'old_table',
                        sql: 'DROP TABLE old_table',
                        explaination: 'Remove old table',
                        risk_level: 'high',
                        is_idempotent: false
                    }
                ],
                summary: 'Drop old table',
                requires_confirmation: true,
                estimated_impact: 'Will drop 1 table'
            };
            mockAnalyzeProjectUpdateRequest.mockResolvedValueOnce(highRiskResult);

            const request = mockRequest({ naturalLanguageInput: 'Remove old_table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment.highRiskOperations).toHaveLength(1);
            expect(data.riskAssessment.highRiskOperations[0].type).toBe('drop_table');
            expect(data.riskAssessment.highRiskOperations[0].target).toBe('old_table');
            expect(data.riskAssessment.highRiskOperations[0].explaination).toBe('Remove old table');
        });

        it('should handle operations with only low risk', async () => {
            const lowRiskResult = {
                operations: [
                    {
                        type: 'create_index',
                        target: 'users_email_idx',
                        sql: 'CREATE INDEX users_email_idx ON users(email)',
                        explaination: 'Index for faster email lookups',
                        risk_level: 'low',
                        is_idempotent: true
                    }
                ],
                summary: 'Add index',
                requires_confirmation: true,
                estimated_impact: 'Will create 1 index'
            };
            mockAnalyzeProjectUpdateRequest.mockResolvedValueOnce(lowRiskResult);

            const request = mockRequest({ naturalLanguageInput: 'Add index on email' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment.riskBreakdown.low).toBe(1);
            expect(data.riskAssessment.riskBreakdown.medium).toBe(0);
            expect(data.riskAssessment.riskBreakdown.high).toBe(0);
            expect(data.riskAssessment.highRiskOperations).toHaveLength(0);
        });

        it('should handle mixed risk levels', async () => {
            const mixedRiskResult = {
                operations: [
                    { type: 'create_table', target: 'table1', sql: 'CREATE TABLE table1', explaination: 'New table', risk_level: 'low', is_idempotent: false },
                    { type: 'alter_table', target: 'table2', sql: 'ALTER TABLE table2', explaination: 'Modify table', risk_level: 'medium', is_idempotent: false },
                    { type: 'drop_column', target: 'table3', sql: 'ALTER TABLE table3 DROP COLUMN old_col', explaination: 'Remove column', risk_level: 'high', is_idempotent: false }
                ],
                summary: 'Mixed operations',
                requires_confirmation: true,
                estimated_impact: 'Multiple changes'
            };
            mockAnalyzeProjectUpdateRequest.mockResolvedValueOnce(mixedRiskResult);

            const request = mockRequest({ naturalLanguageInput: 'Multiple changes' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment.riskBreakdown.low).toBe(1);
            expect(data.riskAssessment.riskBreakdown.medium).toBe(1);
            expect(data.riskAssessment.riskBreakdown.high).toBe(1);
            expect(data.riskAssessment.totalOperations).toBe(3);
        });
    });

    describe('Response Format', () => {
        it('should include success field', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('success');
            expect(data.success).toBe(true);
        });

        it('should include updateAnalysis field', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('updateAnalysis');
        });

        it('should include riskAssessment field', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('riskAssessment');
        });

        it('should include naturalLanguageInput in response', async () => {
            const input = 'Add a comments table';
            const request = mockRequest({ naturalLanguageInput: input });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageInput).toBe(input);
        });

        it('should have correct updateAnalysis structure', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis).toHaveProperty('operations');
            expect(data.updateAnalysis).toHaveProperty('summary');
            expect(data.updateAnalysis).toHaveProperty('estimatedImpact');
            expect(data.updateAnalysis).toHaveProperty('requiresConfirmation');
        });

        it('should have correct riskAssessment structure', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment).toHaveProperty('totalOperations');
            expect(data.riskAssessment).toHaveProperty('riskBreakdown');
            expect(data.riskAssessment).toHaveProperty('highRiskOperations');
        });

        it('should have correct riskBreakdown structure', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment.riskBreakdown).toHaveProperty('low');
            expect(data.riskAssessment.riskBreakdown).toHaveProperty('medium');
            expect(data.riskAssessment.riskBreakdown).toHaveProperty('high');
        });
    });

    describe('Error Handling', () => {
        it('should handle AI analysis errors', async () => {
            mockAnalyzeProjectUpdateRequest.mockRejectedValueOnce(new Error('AI service unavailable'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Failed to analyze update request');
            expect(data.details).toBe('AI service unavailable');
        });

        it('should handle invalid AI response', async () => {
            mockAnalyzeProjectUpdateRequest.mockRejectedValueOnce(new Error('Invalid response format'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Failed to analyze update request');
        });

        it('should handle network errors', async () => {
            mockAnalyzeProjectUpdateRequest.mockRejectedValueOnce(new Error('Network timeout'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.details).toBe('Network timeout');
        });

        it('should handle JSON parsing errors', async () => {
            const request = {
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };

            try {
                await POST(request, mockContext, mockUser, mockProject);
            } catch (error) {
                expect(error.message).toBe('Invalid JSON');
            }
        });

        it('should not include success on error', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBeUndefined();
        });

        it('should include error details on schema fetch failure', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Database connection timeout'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Failed to fetch current database schema');
            expect(data.details).toBe('Database connection timeout');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long naturalLanguageInput', async () => {
            const longInput = 'Add a table with many columns ' + 'and more details '.repeat(100);
            const request = mockRequest({ naturalLanguageInput: longInput });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.naturalLanguageInput).toBe(longInput);
        });

        it('should handle special characters in input', async () => {
            const specialInput = 'Add table with "quotes" and \'apostrophes\' & symbols';
            const request = mockRequest({ naturalLanguageInput: specialInput });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle unicode characters', async () => {
            const unicodeInput = 'Add table for users: 你好 مرحبا';
            const request = mockRequest({ naturalLanguageInput: unicodeInput });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle input with newlines', async () => {
            const multilineInput = 'Add a table\nWith multiple lines\nOf description';
            const request = mockRequest({ naturalLanguageInput: multilineInput });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle empty operations array', async () => {
            const emptyOpsResult = {
                operations: [],
                summary: 'No operations needed',
                requires_confirmation: true,
                estimated_impact: 'No changes'
            };
            mockAnalyzeProjectUpdateRequest.mockResolvedValueOnce(emptyOpsResult);

            const request = mockRequest({ naturalLanguageInput: 'No changes needed' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.riskAssessment.totalOperations).toBe(0);
            expect(data.riskAssessment.highRiskOperations).toHaveLength(0);
        });

        it('should handle complex schema with many tables', async () => {
            const largeSchema = Array(50).fill(null).map((_, i) => ({
                name: `table_${i}`,
                columns: [
                    { name: 'id', type: 'UUID', nullable: false },
                    { name: 'data', type: 'TEXT', nullable: true }
                ]
            }));
            mockGetDatabaseSchema.mockResolvedValueOnce(largeSchema);

            const request = mockRequest({ naturalLanguageInput: 'Add index' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle operations with missing optional fields', async () => {
            const minimalResult = {
                operations: [
                    {
                        type: 'create_table',
                        target: 'new_table',
                        sql: 'CREATE TABLE new_table',
                        explaination: 'Create table',
                        risk_level: 'low',
                        is_idempotent: false
                    }
                ],
                summary: 'Create table',
                requires_confirmation: true
            };
            mockAnalyzeProjectUpdateRequest.mockResolvedValueOnce(minimalResult);

            const request = mockRequest({ naturalLanguageInput: 'Create table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.updateAnalysis.estimatedImpact).toBe('Impact assessment not available');
        });
    });

    describe('Mutation Resistance', () => {
        it('should not accept status 201 for success', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for success', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate validation error status is exactly 400', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(422);
        });

        it('should validate schema error status is exactly 500', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(400);
        });

        it('should validate AI error status is exactly 400', async () => {
            mockAnalyzeProjectUpdateRequest.mockRejectedValueOnce(new Error('Error'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(500);
        });

        it('should validate success is strictly boolean true', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should validate requiresConfirmation is boolean', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.updateAnalysis.requiresConfirmation).toBe('boolean');
        });

        it('should validate error is a string', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
        });

        it('should validate details is a string when present', async () => {
            mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Error message'));

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.details).toBe('string');
        });

        it('should validate exact validation error message', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Natural language update description must be a non-empty string');
            expect(data.error).not.toBe('Natural language update description must be a string');
        });

        it('should validate exact empty schema error message', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBe('Database schema is empty. Use /api/ai/create-project to initialize the database first.');
        });

        it('should call getDatabaseSchema exactly once', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should call analyzeProjectUpdateRequest exactly once', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockAnalyzeProjectUpdateRequest).toHaveBeenCalledTimes(1);
        });

        it('should not call analyzeProjectUpdateRequest on validation error', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockAnalyzeProjectUpdateRequest).not.toHaveBeenCalled();
        });

        it('should not call analyzeProjectUpdateRequest on empty schema', async () => {
            mockGetDatabaseSchema.mockResolvedValueOnce([]);

            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockAnalyzeProjectUpdateRequest).not.toHaveBeenCalled();
        });

        it('should validate operations is an array', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.updateAnalysis.operations)).toBe(true);
        });

        it('should validate totalOperations is a number', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.riskAssessment.totalOperations).toBe('number');
        });

        it('should validate risk breakdown values are numbers', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.riskAssessment.riskBreakdown.low).toBe('number');
            expect(typeof data.riskAssessment.riskBreakdown.medium).toBe('number');
            expect(typeof data.riskAssessment.riskBreakdown.high).toBe('number');
        });

        it('should validate highRiskOperations is an array', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.riskAssessment.highRiskOperations)).toBe(true);
        });

        it('should validate summary is a string', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.updateAnalysis.summary).toBe('string');
        });

        it('should validate estimatedImpact is a string', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.updateAnalysis.estimatedImpact).toBe('string');
        });

        it('should validate naturalLanguageInput in response matches input', async () => {
            const input = 'Add a specific table';
            const request = mockRequest({ naturalLanguageInput: input });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.naturalLanguageInput).toBe(input);
            expect(data.naturalLanguageInput).not.toBe('Add a table');
        });

        it('should not include updateAnalysis on error', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis).toBeUndefined();
        });

        it('should not include riskAssessment on error', async () => {
            const request = mockRequest({ naturalLanguageInput: '' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.riskAssessment).toBeUndefined();
        });

        it('should preserve operation risk levels', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.updateAnalysis.operations[0].risk_level).toBe('low');
            expect(data.updateAnalysis.operations[1].risk_level).toBe('medium');
        });

        it('should calculate risk counts correctly', async () => {
            const request = mockRequest({ naturalLanguageInput: 'Add table' });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            const total = data.riskAssessment.riskBreakdown.low + 
                         data.riskAssessment.riskBreakdown.medium + 
                         data.riskAssessment.riskBreakdown.high;
            
            expect(total).toBe(data.riskAssessment.totalOperations);
        });
    });
});
