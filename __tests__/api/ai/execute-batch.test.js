/**
 * @jest-environment node
 */

// Mock modules before imports
const mockExecuteQuery = jest.fn();
const mockPool = {
    query: jest.fn()
};

const mockWithAuth = jest.fn();
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn();
const mockCreateTimer = jest.fn();

const mockWithRateLimit = jest.fn((handler) => handler);

jest.mock('@/lib/db', () => ({
    executeQuery: mockExecuteQuery,
    pool: mockPool
}));

jest.mock('@/lib/api-helpers', () => ({
    withAuth: mockWithAuth,
    withProjectAuth: mockWithProjectAuth,
    logQueryHistory: mockLogQueryHistory,
    detectQueryType: mockDetectQueryType,
    createTimer: mockCreateTimer
}));

jest.mock('@/lib/rate-limitter', () => ({
    withRateLimit: mockWithRateLimit
}));

// Import after mocks
const { POST } = require('@/app/api/ai/execute-batch/[projectId]/route');
const { NextResponse } = require('next/server');

describe('POST /api/ai/execute-batch/[projectId]', () => {
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

    let timerElapsedValue = 100;
    const mockTimerInstance = {
        elapsed: jest.fn(() => timerElapsedValue)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default timer mock
        timerElapsedValue = 100;
        mockCreateTimer.mockReturnValue(mockTimerInstance);
        mockTimerInstance.elapsed.mockImplementation(() => {
            const value = timerElapsedValue;
            timerElapsedValue += 50; // Increment for next call
            return value;
        });

        // Setup default detectQueryType behavior
        mockDetectQueryType.mockImplementation((sql) => {
            const upperSQL = sql.trim().toUpperCase();
            if (upperSQL.startsWith('SELECT')) return 'SELECT';
            if (upperSQL.startsWith('INSERT')) return 'INSERT';
            if (upperSQL.startsWith('UPDATE')) return 'UPDATE';
            if (upperSQL.startsWith('DELETE')) return 'DELETE';
            if (upperSQL.startsWith('CREATE TABLE')) return 'CREATE';
            if (upperSQL.startsWith('ALTER TABLE')) return 'ALTER';
            if (upperSQL.startsWith('DROP TABLE')) return 'DROP';
            return 'OTHER';
        });

        // Setup default logQueryHistory mock
        mockLogQueryHistory.mockResolvedValue(undefined);
    });

    describe('Input Validation', () => {
        it('should reject missing operations', async () => {
            const request = mockRequest({});
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operations must be a non-empty array');
        });

        it('should reject null operations', async () => {
            const request = mockRequest({ operations: null });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operations must be a non-empty array');
        });

        it('should reject empty operations array', async () => {
            const request = mockRequest({ operations: [] });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operations must be a non-empty array');
        });

        it('should reject non-array operations', async () => {
            const request = mockRequest({ operations: 'not an array' });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operations must be a non-empty array');
        });

        it('should reject operations with missing sql at index 0', async () => {
            const request = mockRequest({
                operations: [{ target: 'users' }]
            });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operation at index 0 missing valid SQL statement');
        });

        it('should reject operations with null sql', async () => {
            const request = mockRequest({
                operations: [{ sql: null, target: 'users' }]
            });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operation at index 0 missing valid SQL statement');
        });

        it('should reject operations with non-string sql', async () => {
            const request = mockRequest({
                operations: [{ sql: 123, target: 'users' }]
            });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operation at index 0 missing valid SQL statement');
        });

        it('should reject operations with empty string sql', async () => {
            const request = mockRequest({
                operations: [{ sql: '', target: 'users' }]
            });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operation at index 0 missing valid SQL statement');
        });

        it('should identify missing sql at correct index', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' },
                    { target: 'comments' }, // Missing sql at index 2
                ]
            });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Operation at index 2 missing valid SQL statement');
        });
    });

    describe('Single Operation Execution', () => {
        it('should execute single operation successfully', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [{ id: 1, name: 'John' }],
                rowCount: 1
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('All operations executed successfully');
            expect(data.totalOperations).toBe(1);
            expect(data.successfulOperations).toBe(1);
            expect(data.failedOperations).toBe(0);
            expect(data.results).toHaveLength(1);
            expect(data.errors).toHaveLength(0);
        });

        it('should call executeQuery with correct parameters', async () => {
            const sql = 'INSERT INTO users (name) VALUES (\'Alice\')';
            const request = mockRequest({
                operations: [{ sql, target: 'users' }]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 1
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockExecuteQuery).toHaveBeenCalledWith(
                mockProject.connection_string,
                sql
            );
        });

        it('should detect query type correctly', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'UPDATE users SET name = \'Bob\' WHERE id = 1', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 1
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockDetectQueryType).toHaveBeenCalledWith('UPDATE users SET name = \'Bob\' WHERE id = 1');
        });

        it('should use provided operation type if available', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users', type: 'CUSTOM_SELECT' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('CUSTOM_SELECT');
            expect(mockDetectQueryType).not.toHaveBeenCalled();
        });

        it('should log successful query to history', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ],
                naturalLanguageInput: 'Show me all users'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith({
                projectId: mockProject.id,
                userId: mockUser.id,
                queryText: 'SELECT * FROM users',
                queryType: 'SELECT',
                naturalLanguageInput: 'Show me all users',
                executionTime: expect.any(Number),
                success: true
            });
        });

        it('should include execution time in result', async () => {
            timerElapsedValue = 250;
            mockTimerInstance.elapsed.mockReturnValueOnce(250);

            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].executionTime).toBe(250);
        });

        it('should include row count in result', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
                rowCount: 3
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].rowsAffected).toBe(3);
        });

        it('should include query results in response', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            const mockRows = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ];

            mockExecuteQuery.mockResolvedValueOnce({
                rows: mockRows,
                rowCount: 2
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].queryResult).toEqual(mockRows);
        });
    });

    describe('Multiple Operations Execution', () => {
        it('should execute multiple operations sequentially', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' },
                    { sql: 'SELECT * FROM comments', target: 'comments' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.totalOperations).toBe(3);
            expect(data.successfulOperations).toBe(3);
            expect(data.failedOperations).toBe(0);
            expect(data.results).toHaveLength(3);
            expect(mockExecuteQuery).toHaveBeenCalledTimes(3);
        });

        it('should include correct index for each result', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].index).toBe(0);
            expect(data.results[1].index).toBe(1);
        });

        it('should include sql and target in each result', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'INSERT INTO posts (title) VALUES (\'Test\')', target: 'posts' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].sql).toBe('SELECT * FROM users');
            expect(data.results[0].target).toBe('users');
            expect(data.results[1].sql).toBe('INSERT INTO posts (title) VALUES (\'Test\')');
            expect(data.results[1].target).toBe('posts');
        });

        it('should accumulate total execution time', async () => {
            timerElapsedValue = 100;
            let callCount = 0;
            mockTimerInstance.elapsed.mockImplementation(() => {
                callCount++;
                if (callCount === 1) return 100; // First operation elapsed
                if (callCount === 2) return 150; // Second operation elapsed
                return 250; // Overall elapsed
            });

            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.totalExecutionTime).toBe(250); // 100 + 150
        });

        it('should log each query to history', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling', () => {
        it('should stop execution on first error', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'INVALID SQL', target: 'invalid' },
                    { sql: 'SELECT * FROM posts', target: 'posts' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockRejectedValueOnce(new Error('Syntax error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.successfulOperations).toBe(1);
            expect(data.failedOperations).toBe(1);
            expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
        });

        it('should include error details in response', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID SQL', target: 'invalid' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Syntax error near INVALID'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors).toHaveLength(1);
            expect(data.errors[0].error).toBe('Syntax error near INVALID');
            expect(data.errors[0].success).toBe(false);
        });

        it('should include error index in response', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'INVALID SQL', target: 'invalid' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors[0].index).toBe(1);
        });

        it('should include sql and target in error', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID SQL', target: 'test_table' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors[0].sql).toBe('INVALID SQL');
            expect(data.errors[0].target).toBe('test_table');
        });

        it('should log failed query to history', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID SQL', target: 'invalid' }
                ],
                naturalLanguageInput: 'Do something invalid'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Syntax error'));

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith({
                projectId: mockProject.id,
                userId: mockUser.id,
                queryText: 'INVALID SQL',
                queryType: 'OTHER',
                naturalLanguageInput: 'Do something invalid',
                executionTime: expect.any(Number),
                success: false,
                errorMessage: 'Syntax error'
            });
        });

        it('should include execution time for failed operation', async () => {
            timerElapsedValue = 300;
            let callCount = 0;
            mockTimerInstance.elapsed.mockImplementation(() => {
                callCount++;
                return callCount === 1 ? 300 : 300;
            });

            const request = mockRequest({
                operations: [
                    { sql: 'INVALID SQL', target: 'invalid' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors[0].executionTime).toBe(300);
        });

        it('should provide helpful error message on failure', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'INVALID', target: 'invalid' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.message).toBe('Execution stopped at operation 1 due to error');
        });

        it('should handle connection errors', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Connection refused'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.errors[0].error).toBe('Connection refused');
        });

        it('should handle timeout errors', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Query timeout'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors[0].error).toBe('Query timeout');
        });

        it('should handle permission errors', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'DROP TABLE users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Permission denied'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors[0].error).toBe('Permission denied');
        });
    });

    describe('Natural Language Input', () => {
        it('should accept operations without naturalLanguageInput', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should log null for naturalLanguageInput when not provided', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    naturalLanguageInput: null
                })
            );
        });

        it('should pass naturalLanguageInput to logging', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ],
                naturalLanguageInput: 'Get all users from the database'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    naturalLanguageInput: 'Get all users from the database'
                })
            );
        });
    });

    describe('Response Format', () => {
        it('should include all required fields in success response', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('success');
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('totalOperations');
            expect(data).toHaveProperty('successfulOperations');
            expect(data).toHaveProperty('failedOperations');
            expect(data).toHaveProperty('results');
            expect(data).toHaveProperty('errors');
            expect(data).toHaveProperty('totalExecutionTime');
            expect(data).toHaveProperty('overallExecutionTime');
        });

        it('should include correct counts in response', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.totalOperations).toBe(2);
            expect(data.successfulOperations).toBe(2);
            expect(data.failedOperations).toBe(0);
        });

        it('should include overallExecutionTime', async () => {
            timerElapsedValue = 500;
            let callCount = 0;
            mockTimerInstance.elapsed.mockImplementation(() => {
                callCount++;
                return callCount === 1 ? 100 : 500;
            });

            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.overallExecutionTime).toBe(500);
        });

        it('should format each result with required fields', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            const result = data.results[0];
            expect(result).toHaveProperty('index');
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('sql');
            expect(result).toHaveProperty('target');
            expect(result).toHaveProperty('type');
            expect(result).toHaveProperty('executionTime');
            expect(result).toHaveProperty('rowsAffected');
            expect(result).toHaveProperty('queryResult');
        });

        it('should format each error with required fields', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID', target: 'test' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Test error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            const error = data.errors[0];
            expect(error).toHaveProperty('index');
            expect(error).toHaveProperty('success');
            expect(error).toHaveProperty('sql');
            expect(error).toHaveProperty('target');
            expect(error).toHaveProperty('type');
            expect(error).toHaveProperty('executionTime');
            expect(error).toHaveProperty('error');
        });
    });

    describe('Query Type Detection', () => {
        it('should detect SELECT queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('SELECT');
        });

        it('should detect INSERT queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INSERT INTO users (name) VALUES (\'Test\')', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('INSERT');
        });

        it('should detect UPDATE queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'UPDATE users SET name = \'Updated\'', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('UPDATE');
        });

        it('should detect DELETE queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'DELETE FROM users WHERE id = 1', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('DELETE');
        });

        it('should detect CREATE TABLE queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'CREATE TABLE test (id INT)', target: 'test' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('CREATE');
        });

        it('should detect ALTER TABLE queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'ALTER TABLE users ADD COLUMN age INT', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('ALTER');
        });

        it('should detect DROP TABLE queries', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'DROP TABLE users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].type).toBe('DROP');
        });
    });

    describe('Edge Cases', () => {
        it('should handle operations with undefined target', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT 1' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.results[0].target).toBeUndefined();
        });

        it('should handle very long SQL statements', async () => {
            const longSql = 'SELECT * FROM users WHERE ' + 'id = 1 OR '.repeat(100) + 'id = 1';
            const request = mockRequest({
                operations: [
                    { sql: longSql, target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.results[0].sql).toBe(longSql);
        });

        it('should handle operations with special characters', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users WHERE name = \'O\'\'Reilly\'', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle zero rowCount', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'UPDATE users SET name = \'Test\' WHERE id = 999', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].rowsAffected).toBe(0);
        });

        it('should handle empty result rows', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users WHERE 1=0', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].queryResult).toEqual([]);
        });

        it('should handle mixed success and failure', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'SELECT * FROM posts', target: 'posts' },
                    { sql: 'INVALID', target: 'invalid' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.successfulOperations).toBe(2);
            expect(data.failedOperations).toBe(1);
            expect(data.results).toHaveLength(2);
            expect(data.errors).toHaveLength(1);
        });
    });

    describe('Mutation Resistance', () => {
        it('should not accept status 201 for successful execution', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for successful execution', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate error status is exactly 400', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID', target: 'test' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(500);
        });

        it('should validate success is strictly boolean true', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should validate success is strictly boolean false on error', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID', target: 'test' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(false);
            expect(data.success).not.toBe(0);
            expect(data.success).not.toBe('false');
        });

        it('should ensure totalOperations is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.totalOperations).toBe('number');
            expect(data.totalOperations).toBe(1);
        });

        it('should ensure successfulOperations is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.successfulOperations).toBe('number');
            expect(data.successfulOperations).toBe(1);
        });

        it('should ensure failedOperations is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID', target: 'test' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.failedOperations).toBe('number');
            expect(data.failedOperations).toBe(1);
        });

        it('should ensure results is always an array', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.results)).toBe(true);
        });

        it('should ensure errors is always an array', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.errors)).toBe(true);
        });

        it('should not mutate operation counts', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' },
                    { sql: 'INVALID', target: 'test' }
                ]
            });

            mockExecuteQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.totalOperations).toBe(2);
            expect(data.successfulOperations).toBe(1);
            expect(data.failedOperations).toBe(1);
            expect(data.successfulOperations + data.failedOperations).not.toBe(data.totalOperations + 1);
        });

        it('should validate each result has success true', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.results[0].success).toBe(true);
        });

        it('should validate each error has success false', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'INVALID', target: 'test' }
                ]
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.errors[0].success).toBe(false);
        });

        it('should ensure rowsAffected is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 5 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.results[0].rowsAffected).toBe('number');
        });

        it('should ensure executionTime is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.results[0].executionTime).toBe('number');
        });

        it('should ensure totalExecutionTime is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.totalExecutionTime).toBe('number');
        });

        it('should ensure overallExecutionTime is a number', async () => {
            const request = mockRequest({
                operations: [
                    { sql: 'SELECT * FROM users', target: 'users' }
                ]
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.overallExecutionTime).toBe('number');
        });
    });
});
