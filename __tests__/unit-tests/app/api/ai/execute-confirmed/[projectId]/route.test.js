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
const { POST } = require('@/app/api/ai/execute-confirmed/[projectId]/route');
const { NextResponse } = require('next/server');

describe('POST /api/ai/execute-confirmed/[projectId]', () => {
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
        mockTimerInstance.elapsed.mockReturnValue(timerElapsedValue);

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
        it('should reject missing sql', async () => {
            const request = mockRequest({});
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });

        it('should reject null sql', async () => {
            const request = mockRequest({ sql: null });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });

        it('should reject empty string sql', async () => {
            const request = mockRequest({ sql: '' });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });

        it('should reject whitespace-only sql', async () => {
            const request = mockRequest({ sql: '   \n\t   ' });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });

        it('should reject non-string sql', async () => {
            const request = mockRequest({ sql: 123 });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });

        it('should reject array sql', async () => {
            const request = mockRequest({ sql: ['SELECT * FROM users'] });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });

        it('should reject object sql', async () => {
            const request = mockRequest({ sql: { query: 'SELECT * FROM users' } });
            
            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('SQL statement must be a non-empty string');
        });
    });

    describe('Successful Query Execution', () => {
        it('should execute valid SQL successfully', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [{ id: 1, name: 'John' }],
                rowCount: 1
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Query executed successfully');
        });

        it('should call executeQuery with correct parameters', async () => {
            const sql = 'SELECT * FROM users WHERE id = 1';
            const request = mockRequest({ sql });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockExecuteQuery).toHaveBeenCalledWith(
                mockProject.connection_string,
                sql
            );
            expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
        });

        it('should return query results in data field', async () => {
            const mockRows = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ];

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: mockRows,
                rowCount: 2
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.data).toEqual(mockRows);
        });

        it('should include execution time in response', async () => {
            timerElapsedValue = 250;
            mockTimerInstance.elapsed.mockReturnValue(250);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.executionTime).toBe(250);
        });

        it('should include query in response', async () => {
            const sql = 'SELECT * FROM users WHERE active = true';
            const request = mockRequest({ sql });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.query).toBe(sql);
        });

        it('should include queryType in response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('SELECT');
        });

        it('should handle empty result set', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users WHERE 1=0'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.data).toEqual([]);
        });
    });

    describe('Query Type Detection', () => {
        it('should detect SELECT queries', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(mockDetectQueryType).toHaveBeenCalledWith('SELECT * FROM users');
            expect(data.queryType).toBe('SELECT');
        });

        it('should detect INSERT queries', async () => {
            const request = mockRequest({
                sql: 'INSERT INTO users (name) VALUES (\'Alice\')'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('INSERT');
        });

        it('should detect UPDATE queries', async () => {
            const request = mockRequest({
                sql: 'UPDATE users SET name = \'Bob\' WHERE id = 1'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('UPDATE');
        });

        it('should detect DELETE queries', async () => {
            const request = mockRequest({
                sql: 'DELETE FROM users WHERE id = 1'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('DELETE');
        });

        it('should detect CREATE TABLE queries', async () => {
            const request = mockRequest({
                sql: 'CREATE TABLE test (id INT)'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('CREATE');
        });

        it('should detect ALTER TABLE queries', async () => {
            const request = mockRequest({
                sql: 'ALTER TABLE users ADD COLUMN age INT'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('ALTER');
        });

        it('should detect DROP TABLE queries', async () => {
            const request = mockRequest({
                sql: 'DROP TABLE users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('DROP');
        });

        it('should use provided queryType if available', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users',
                queryType: 'CUSTOM_SELECT'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(mockDetectQueryType).not.toHaveBeenCalled();
            expect(data.queryType).toBe('CUSTOM_SELECT');
        });

        it('should detect query type when not provided', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockDetectQueryType).toHaveBeenCalledTimes(1);
        });
    });

    describe('Query History Logging', () => {
        it('should log successful query to history', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users',
                naturalLanguageInput: 'Show me all users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith({
                projectId: mockProject.id,
                userId: mockUser.id,
                queryText: 'SELECT * FROM users',
                queryType: 'SELECT',
                naturalLanguageInput: 'Show me all users',
                executionTime: 100,
                success: true
            });
        });

        it('should log query without naturalLanguageInput', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    naturalLanguageInput: null
                })
            );
        });

        it('should log with null for undefined naturalLanguageInput', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users',
                naturalLanguageInput: undefined
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    naturalLanguageInput: null
                })
            );
        });

        it('should log query with correct execution time', async () => {
            timerElapsedValue = 350;
            mockTimerInstance.elapsed.mockReturnValue(350);

            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionTime: 350
                })
            );
        });

        it('should log with user and project IDs', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-456',
                    userId: 'user-123'
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle query execution errors', async () => {
            const request = mockRequest({
                sql: 'INVALID SQL'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Syntax error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Query execution failed');
        });

        it('should include error details in response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM nonexistent_table'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Table does not exist'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBe('Table does not exist');
        });

        it('should include query in error response', async () => {
            const sql = 'INVALID SQL';
            const request = mockRequest({ sql });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.query).toBe(sql);
        });

        it('should include queryType in error response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.queryType).toBe('SELECT');
        });

        it('should include executionTime in error response', async () => {
            timerElapsedValue = 150;
            mockTimerInstance.elapsed.mockReturnValue(150);

            const request = mockRequest({
                sql: 'INVALID SQL'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.executionTime).toBe(150);
        });

        it('should log failed query to history', async () => {
            const request = mockRequest({
                sql: 'INVALID SQL',
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
                executionTime: 100,
                success: false,
                errorMessage: 'Syntax error'
            });
        });

        it('should log failed query without naturalLanguageInput', async () => {
            const request = mockRequest({
                sql: 'INVALID SQL'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    naturalLanguageInput: null,
                    success: false
                })
            );
        });

        it('should handle connection errors', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Connection refused'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.details).toBe('Connection refused');
        });

        it('should handle timeout errors', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Query timeout'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBe('Query timeout');
        });

        it('should handle permission errors', async () => {
            const request = mockRequest({
                sql: 'DROP TABLE users'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Permission denied'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBe('Permission denied');
        });
    });

    describe('Response Format', () => {
        it('should include all required fields in success response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('success');
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('data');
            expect(data).toHaveProperty('executionTime');
            expect(data).toHaveProperty('query');
            expect(data).toHaveProperty('queryType');
        });

        it('should include all required fields in error response', async () => {
            const request = mockRequest({
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data).toHaveProperty('success');
            expect(data).toHaveProperty('error');
            expect(data).toHaveProperty('details');
            expect(data).toHaveProperty('executionTime');
            expect(data).toHaveProperty('query');
            expect(data).toHaveProperty('queryType');
        });

        it('should return data as array', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({
                rows: [{ id: 1 }, { id: 2 }],
                rowCount: 2
            });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.data)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle SQL with leading/trailing whitespace', async () => {
            const request = mockRequest({
                sql: '  SELECT * FROM users  '
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should handle very long SQL statements', async () => {
            const longSql = 'SELECT * FROM users WHERE ' + 'id = 1 OR '.repeat(100) + 'id = 1';
            const request = mockRequest({ sql: longSql });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.query).toBe(longSql);
        });

        it('should handle SQL with special characters', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users WHERE name = \'O\'\'Reilly\''
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle SQL with line breaks', async () => {
            const request = mockRequest({
                sql: 'SELECT *\nFROM users\nWHERE id = 1'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle SQL with tabs', async () => {
            const request = mockRequest({
                sql: 'SELECT *\tFROM users\tWHERE id = 1'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle undefined naturalLanguageInput', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users',
                naturalLanguageInput: undefined
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle null naturalLanguageInput', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users',
                naturalLanguageInput: null
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });

        it('should handle empty string naturalLanguageInput', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users',
                naturalLanguageInput: ''
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(response.status).toBe(200);
        });
    });

    describe('Mutation Resistance', () => {
        it('should not accept status 201 for successful execution', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for successful execution', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate error status is exactly 400', async () => {
            const request = mockRequest({
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(500);
        });

        it('should validate validation error status is exactly 400', async () => {
            const request = mockRequest({
                sql: ''
            });

            const response = await POST(request, mockContext, mockUser, mockProject);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(422);
        });

        it('should validate success is strictly boolean true', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
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
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.success).toBe(false);
            expect(data.success).not.toBe(0);
            expect(data.success).not.toBe('false');
        });

        it('should ensure message is a string', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.message).toBe('string');
            expect(data.message).toBe('Query executed successfully');
        });

        it('should ensure error is a string', async () => {
            const request = mockRequest({
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.error).toBe('string');
            expect(data.error).toBe('Query execution failed');
        });

        it('should ensure executionTime is a number', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.executionTime).toBe('number');
        });

        it('should ensure query is a string', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.query).toBe('string');
        });

        it('should ensure queryType is a string', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(typeof data.queryType).toBe('string');
        });

        it('should ensure data is always an array on success', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(Array.isArray(data.data)).toBe(true);
        });

        it('should not include data field in error response', async () => {
            const request = mockRequest({
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.data).toBeUndefined();
        });

        it('should not include message field in error response', async () => {
            const request = mockRequest({
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.message).toBeUndefined();
        });

        it('should not include error field in success response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.error).toBeUndefined();
        });

        it('should not include details field in success response', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await POST(request, mockContext, mockUser, mockProject);
            const data = await response.json();

            expect(data.details).toBeUndefined();
        });

        it('should log exactly once for successful query', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledTimes(1);
        });

        it('should log exactly once for failed query', async () => {
            const request = mockRequest({
                sql: 'INVALID'
            });

            mockExecuteQuery.mockRejectedValueOnce(new Error('Error'));

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockLogQueryHistory).toHaveBeenCalledTimes(1);
        });

        it('should call executeQuery exactly once', async () => {
            const request = mockRequest({
                sql: 'SELECT * FROM users'
            });

            mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await POST(request, mockContext, mockUser, mockProject);

            expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
        });
    });
});
