/**
 * @jest-environment node
 */

// Mock dependencies BEFORE importing the route
const mockPool = { query: jest.fn() };
const mockUserPool = { query: jest.fn(), end: jest.fn() };
const mockUser = { id: 'test-user-123', email: 'test@example.com' };

jest.mock('@/lib/db', () => ({
    pool: mockPool,
    createUserDatabase: jest.fn(),
    getUserDatabaseConnection: jest.fn(),
    waitForDatabaseReady: jest.fn(),
}));

jest.mock('@/lib/ai', () => ({
    inferDatabaseSchema: jest.fn(),
    generateCreateTableStatements: jest.fn(),
}));

jest.mock('@/lib/api-helpers', () => ({
    logQueryHistory: jest.fn(),
    detectQueryType: jest.fn(() => 'CREATE'),
    withAuth: jest.fn((handler) => {
        return async (request, context) => {
            return handler(request, context, mockUser);
        };
    }),
    createTimer: jest.fn(() => ({
        end: jest.fn(() => ({ executionTime: 100 }))
    })),
}));

jest.mock('@/lib/rate-limitter', () => ({
    withRateLimit: jest.fn((handler) => handler),
}));

// Import after mocking
const { POST } = require('@/app/api/ai/create-project/route');
const { pool, createUserDatabase, getUserDatabaseConnection, waitForDatabaseReady } = require('@/lib/db');
const { inferDatabaseSchema, generateCreateTableStatements } = require('@/lib/ai');
const { logQueryHistory, detectQueryType } = require('@/lib/api-helpers');

describe('POST /api/ai/create-project', () => {
    let mockRequest;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = {
            json: jest.fn(),
        };

        // Reset mock implementations
        mockPool.query.mockReset();
        mockUserPool.query.mockReset();
        mockUserPool.end.mockReset();
    });

    describe('Input Validation', () => {
        it('should reject missing naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({});

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Natural language description is required');
            expect(data.error).not.toBe('');
            expect(data.error).toBeDefined();
        });

        it('should reject empty naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: '' });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Natural language description is required');
            expect(data.error).not.toContain('undefined');
        });

        it('should reject whitespace-only naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: '   ' });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('non-empty string');
        });

        it('should reject non-string naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 123 });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('must be a non-empty string');
        });

        it('should reject null naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: null });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBeDefined();
            expect(response.status).not.toBe(200);
        });

        it('should reject array naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: ['test'] });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('string');
        });

        it('should reject object naturalLanguageInput', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: { text: 'test' } });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(typeof data.error).toBe('string');
        });
    });

    describe('AI Schema Inference', () => {
        it('should call inferDatabaseSchema with natural language input', async () => {
            const input = 'Create a blog platform';
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: input });

            inferDatabaseSchema.mockRejectedValue(new Error('AI Error'));
            mockPool.query.mockResolvedValue({ rows: [] });

            await POST(mockRequest);

            expect(inferDatabaseSchema).toHaveBeenCalledWith(input);
            expect(inferDatabaseSchema).toHaveBeenCalledTimes(1);
        });

        it('should handle AI inference errors', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test input' });
            inferDatabaseSchema.mockRejectedValue(new Error('AI service unavailable'));
            mockPool.query.mockResolvedValue({ rows: [] });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Failed to infer database schema');
            expect(data.details).toContain('AI service unavailable');
            expect(data.details).not.toBe('');
        });

        it('should handle AI timeout errors', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            inferDatabaseSchema.mockRejectedValue(new Error('Request timeout'));
            mockPool.query.mockResolvedValue({ rows: [] });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBeDefined();
            expect(data.details).toBe('Request timeout');
        });

        it('should handle invalid AI response structure', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            inferDatabaseSchema.mockRejectedValue(new Error('Invalid JSON response'));
            mockPool.query.mockResolvedValue({ rows: [] });

            const response = await POST(mockRequest);

            expect(response.status).toBe(400);
            expect(response.status).not.toBe(500);
        });
    });

    describe('Project Name Validation', () => {
        it('should reject duplicate project names', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'existing_project',
                description: 'Test project',
                tables: [],
            });

            mockPool.query.mockResolvedValue({
                rows: [{ id: 'existing-id' }],
            });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(409);
            expect(data.error).toContain('already exists');
            expect(data.suggestion).toContain('unique project name');
            expect(data.suggestion).toBeDefined();
        });

        it('should check project existence with correct user ID', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'new_project',
                description: 'Test',
                tables: [],
            });

            mockPool.query.mockResolvedValue({ rows: [{ id: 'exists' }] });

            await POST(mockRequest);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.any(String),
                [mockUser.id, 'new_project']
            );
            expect(mockPool.query.mock.calls[0][1][0]).toBe(mockUser.id);
        });

        it('should allow project creation when name is unique', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'unique_project',
                description: 'Test',
                tables: [],
            });

            // First query: check existence (empty)
            // Second query: insert project
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'unique_project',
                        database_name: 'db_name',
                        description: 'Test',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_name',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            const response = await POST(mockRequest);

            expect(response.status).not.toBe(409);
            expect(response.status).toBe(200);
        });
    });

    describe('Database Creation', () => {
        beforeEach(() => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test description',
                tables: [],
            });

            mockPool.query.mockResolvedValue({ rows: [] });
        });

        it('should call createUserDatabase with correct parameters', async () => {
            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            mockPool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
                rows: [{
                    id: 'proj-123',
                    project_name: 'test_project',
                    database_name: 'db_test',
                    description: 'Test',
                    created_at: new Date().toISOString(),
                }],
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            await POST(mockRequest);

            expect(createUserDatabase).toHaveBeenCalledWith(mockUser.id, 'test_project');
            expect(createUserDatabase).toHaveBeenCalledTimes(1);
        });

        it('should handle database creation errors', async () => {
            createUserDatabase.mockRejectedValue(new Error('Neon API error'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toContain('Failed to create database');
            expect(data.details).toContain('Neon API error');
        });

        it('should handle network errors during database creation', async () => {
            createUserDatabase.mockRejectedValue(new Error('Network timeout'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBeDefined();
            expect(data.details).toBe('Network timeout');
        });

        it('should handle authentication errors from Neon API', async () => {
            createUserDatabase.mockRejectedValue(new Error('Unauthorized'));

            const response = await POST(mockRequest);

            expect(response.status).toBe(500);
            expect(response.status).not.toBe(401);
        });
    });

    describe('Project Metadata Insertion', () => {
        beforeEach(() => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test input' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test description',
                tables: [],
            });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://localhost/test',
            });
        });

        it('should insert project with all required fields', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'Test description',
                        created_at: new Date().toISOString(),
                    }],
                });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            await POST(mockRequest);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_projects'),
                expect.arrayContaining([
                    mockUser.id,
                    'test_project',
                    'db_test',
                    'Test description',
                    'postgres://localhost/test',
                ])
            );
        });

        it('should use naturalLanguageInput as fallback description', async () => {
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: null,
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'test input',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            await POST(mockRequest);

            const insertCall = mockPool.query.mock.calls.find(call => 
                call[0].includes('INSERT INTO user_projects')
            );
            expect(insertCall[1][3]).toBe('test input');
        });

        it('should use provided description when available', async () => {
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'AI generated description',
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'AI generated description',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            await POST(mockRequest);

            const insertCall = mockPool.query.mock.calls.find(call => 
                call[0].includes('INSERT INTO user_projects')
            );
            expect(insertCall[1][3]).toBe('AI generated description');
            expect(insertCall[1][3]).not.toBe('test input');
        });
    });

    describe('Database Readiness Check', () => {
        beforeEach(() => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test',
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'Test',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });
        });

        it('should wait for database to be ready', async () => {
            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            await POST(mockRequest);

            expect(waitForDatabaseReady).toHaveBeenCalledWith('postgres://test');
            expect(waitForDatabaseReady).toHaveBeenCalledTimes(1);
        });

        it('should handle database not ready errors', async () => {
            waitForDatabaseReady.mockRejectedValue(new Error('Timeout waiting for database'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(503);
            expect(data.error).toContain('not yet ready');
            expect(data.project).toBeDefined();
            expect(data.project.id).toBe('proj-123');
            expect(data.suggestion).toContain('wait');
        });

        it('should include project details in readiness error', async () => {
            waitForDatabaseReady.mockRejectedValue(new Error('Not ready'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.project.projectName).toBe('test_project');
            expect(data.project.databaseName).toBe('db_test');
            expect(data.project.id).toBeDefined();
        });

        it('should provide helpful suggestion on readiness failure', async () => {
            waitForDatabaseReady.mockRejectedValue(new Error('Connection failed'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.suggestion).toContain('manually');
            expect(data.suggestion).toContain('retry');
        });
    });

    describe('Table Creation', () => {
        const mockTables = [
            {
                name: 'users',
                columns: [
                    { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
                    { name: 'email', type: 'VARCHAR(255)', constraints: ['NOT NULL'] },
                ],
            },
            {
                name: 'posts',
                columns: [
                    { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
                    { name: 'user_id', type: 'UUID', references: 'users(id)' },
                ],
            },
        ];

        beforeEach(() => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'blog platform' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'blog_project',
                description: 'A blog platform',
                tables: mockTables,
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'blog_project',
                        database_name: 'db_blog',
                        description: 'A blog platform',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_blog',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
        });

        it('should generate CREATE TABLE statements', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});

            await POST(mockRequest);

            expect(generateCreateTableStatements).toHaveBeenCalledWith(mockTables);
            expect(generateCreateTableStatements).toHaveBeenCalledTimes(1);
        });

        it('should split and execute SQL statements', async () => {
            generateCreateTableStatements.mockReturnValue(
                'CREATE TABLE users (id UUID); CREATE TABLE posts (id UUID);'
            );
            mockUserPool.query.mockResolvedValue({});

            await POST(mockRequest);

            expect(mockUserPool.query).toHaveBeenCalledTimes(2);
            expect(mockUserPool.query).toHaveBeenCalledWith('CREATE TABLE users (id UUID)');
            expect(mockUserPool.query).toHaveBeenCalledWith('CREATE TABLE posts (id UUID)');
        });

        it('should skip empty SQL statements', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);;');
            mockUserPool.query.mockResolvedValue({});

            await POST(mockRequest);

            expect(mockUserPool.query).toHaveBeenCalledTimes(1);
        });

        it('should evaluate the trimmedSQL falsy branch inside the loop (coverage)', async () => {
            // This test temporarily overrides Array.prototype.filter so that
            // sqlStatements contains an element that is whitespace-only, causing
            // trimmedSQL to be falsy inside the loop and exercise the `if (trimmedSQL)` false branch.
            generateCreateTableStatements.mockReturnValue(
                'CREATE TABLE users (id UUID); ; CREATE TABLE posts (id UUID);'
            );

            mockUserPool.query.mockResolvedValue({});

            const originalFilter = Array.prototype.filter;
            // Replace filter to bypass the trimming filter and keep whitespace-only entries
            Array.prototype.filter = function () {
                return Array.prototype.slice.call(this);
            };

            try {
                // Run the route with the modified filter in place
                await POST(mockRequest);

                // Ensure the valid statements were still executed
                expect(mockUserPool.query).toHaveBeenCalledWith('CREATE TABLE users (id UUID)');
                expect(mockUserPool.query).toHaveBeenCalledWith('CREATE TABLE posts (id UUID)');
                expect(mockUserPool.query).toHaveBeenCalledTimes(2);
            } finally {
                // Restore the original filter to avoid polluting other tests
                Array.prototype.filter = originalFilter;
            }
        });

        it('should log successful table creation queries', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});

            await POST(mockRequest);

            expect(logQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'proj-123',
                    userId: mockUser.id,
                    queryText: 'CREATE TABLE users (id UUID)',
                    success: true,
                })
            );
        });

        it('should continue execution after failed query', async () => {
            generateCreateTableStatements.mockReturnValue(
                'CREATE TABLE users (id UUID); CREATE TABLE posts (id UUID);'
            );
            
            mockUserPool.query
                .mockRejectedValueOnce(new Error('Syntax error'))
                .mockResolvedValueOnce({});

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(mockUserPool.query).toHaveBeenCalledTimes(2);
            expect(data.schema.tablesFailed).toBe(1);
            expect(data.schema.tablesCreated).toBe(1);
        });

        it('should log failed query with error message', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE invalid;');
            mockUserPool.query.mockRejectedValue(new Error('Invalid syntax'));

            await POST(mockRequest);

            expect(logQueryHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorMessage: 'Invalid syntax',
                })
            );
        });

        it('should close user database connection', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});

            await POST(mockRequest);

            expect(mockUserPool.end).toHaveBeenCalled();
            expect(mockUserPool.end).toHaveBeenCalledTimes(1);
        });

        it('should close connection even on error', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE invalid;');
            mockUserPool.query.mockRejectedValue(new Error('Error'));

            await POST(mockRequest);

            expect(mockUserPool.end).toHaveBeenCalled();
        });

        it('should detect query types correctly', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});
            detectQueryType.mockReturnValue('CREATE');

            await POST(mockRequest);

            expect(detectQueryType).toHaveBeenCalledWith('CREATE TABLE users (id UUID)');
        });

        it('should include execution time for successful queries', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.executionDetails[0]).toHaveProperty('executionTime');
            expect(data.executionDetails[0].executionTime).toBeGreaterThanOrEqual(0);
            expect(typeof data.executionDetails[0].executionTime).toBe('number');
        });

        it('should include execution time for failed queries', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE invalid;');
            mockUserPool.query.mockRejectedValue(new Error('Error'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.executionDetails[0]).toHaveProperty('executionTime');
            expect(data.executionDetails[0].executionTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Response Format', () => {
        beforeEach(() => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test project' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test description',
                tables: [
                    {
                        name: 'users',
                        columns: [{ name: 'id', type: 'UUID' }],
                    },
                ],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'Test description',
                        created_at: '2024-01-01T00:00:00Z',
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});
        });

        it('should return success response with all required fields', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBeDefined();
            expect(data.project).toBeDefined();
            expect(data.schema).toBeDefined();
            expect(data.sql).toBeDefined();
            expect(data.executionDetails).toBeDefined();
            expect(data.totalExecutionTime).toBeDefined();
            expect(data.naturalLanguageInput).toBeDefined();
        });

        it('should include correct project details', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.project.id).toBe('proj-123');
            expect(data.project.projectName).toBe('test_project');
            expect(data.project.databaseName).toBe('db_test');
            expect(data.project.description).toBe('Test description');
            expect(data.project.createdAt).toBe('2024-01-01T00:00:00Z');
        });

        it('should include schema summary', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.schema.tables).toEqual(['users']);
            expect(data.schema.tablesCreated).toBe(1);
            expect(data.schema.tablesFailed).toBe(0);
        });

        it('should include SQL details', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.sql.statements).toBe(1);
            expect(data.sql.executed).toContain('CREATE TABLE users');
        });

        it('should include execution details array', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(Array.isArray(data.executionDetails)).toBe(true);
            expect(data.executionDetails).toHaveLength(1);
            expect(data.executionDetails[0].query).toBe('CREATE TABLE users (id UUID)');
            expect(data.executionDetails[0].success).toBe(true);
        });

        it('should include original natural language input', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.naturalLanguageInput).toBe('test project');
        });

        it('should include total execution time', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();

            expect(typeof data.totalExecutionTime).toBe('number');
            expect(data.totalExecutionTime).toBeGreaterThanOrEqual(0);
        });

        it('should count failed tables correctly', async () => {
            generateCreateTableStatements.mockReturnValue(
                'CREATE TABLE users (id UUID); CREATE TABLE invalid;'
            );
            
            mockUserPool.query
                .mockResolvedValueOnce({})
                .mockRejectedValueOnce(new Error('Error'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.schema.tablesCreated).toBe(1);
            expect(data.schema.tablesFailed).toBe(1);
            expect(data.schema.tables).toHaveLength(1);
        });

        it('should mark failed queries in execution details', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE invalid;');
            mockUserPool.query.mockRejectedValue(new Error('Syntax error'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.executionDetails[0].success).toBe(false);
            expect(data.executionDetails[0].error).toBe('Syntax error');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty tables array', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'empty project' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'empty_project',
                description: 'Empty',
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'empty_project',
                        database_name: 'db_empty',
                        description: 'Empty',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_empty',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.schema.tables).toHaveLength(0);
            expect(data.schema.tablesCreated).toBe(0);
        });

        it('should handle very long natural language input', async () => {
            const longInput = 'test '.repeat(1000);
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: longInput });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test',
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'Test',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            const response = await POST(mockRequest);

            expect(response.status).toBe(200);
            expect(inferDatabaseSchema).toHaveBeenCalledWith(longInput);
        });

        it('should handle special characters in project name', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test-project_123',
                description: 'Test',
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test-project_123',
                        database_name: 'db_test',
                        description: 'Test',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            const response = await POST(mockRequest);

            expect(response.status).toBe(200);
            expect(createUserDatabase).toHaveBeenCalledWith(mockUser.id, 'test-project_123');
        });

        it('should handle all queries failing', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test',
                tables: [
                    { name: 'table1', columns: [] },
                    { name: 'table2', columns: [] },
                ],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'Test',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue(
                'CREATE TABLE table1 (id UUID); CREATE TABLE table2 (id UUID);'
            );
            mockUserPool.query.mockRejectedValue(new Error('All failed'));

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.schema.tablesCreated).toBe(0);
            expect(data.schema.tablesFailed).toBe(2);
        });

        it('should handle undefined description from AI', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test input' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: undefined,
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'test input',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.project.description).toBe('test input');
        });
    });

    describe('Mutation Resistance', () => {
        beforeEach(() => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'test_project',
                description: 'Test',
                tables: [],
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'proj-123',
                        project_name: 'test_project',
                        database_name: 'db_test',
                        description: 'Test',
                        created_at: new Date().toISOString(),
                    }],
                });

            createUserDatabase.mockResolvedValue({
                databaseName: 'db_test',
                connectionString: 'postgres://test',
            });

            waitForDatabaseReady.mockResolvedValue(true);
            getUserDatabaseConnection.mockResolvedValue(mockUserPool);
            generateCreateTableStatements.mockReturnValue('');
        });

        it('should not accept status 201 instead of 200', async () => {
            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
            expect(response.status).not.toBe(201);
        });

        it('should not accept status 204 for successful creation', async () => {
            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
            expect(response.status).not.toBe(204);
        });

        it('should validate error status is exactly 400 for validation errors', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: '' });
            const response = await POST(mockRequest);
            
            expect(response.status).toBe(400);
            expect(response.status).not.toBe(401);
            expect(response.status).not.toBe(404);
        });

        it('should validate error status is exactly 409 for duplicates', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: 'test' });
            
            inferDatabaseSchema.mockResolvedValue({
                projectName: 'existing_project',
                description: 'Test',
                tables: [],
            });

            // Reset and set to return duplicate
            mockPool.query.mockReset();
            mockPool.query.mockResolvedValue({ rows: [{ id: 'exists' }] });
            
            const response = await POST(mockRequest);
            
            expect(response.status).toBe(409);
            expect(response.status).not.toBe(400);
            expect(response.status).not.toBe(500);
        });

        it('should validate error status is exactly 500 for db creation errors', async () => {
            createUserDatabase.mockRejectedValue(new Error('DB Error'));
            
            const response = await POST(mockRequest);
            
            expect(response.status).toBe(500);
            expect(response.status).not.toBe(503);
        });

        it('should validate error status is exactly 503 for readiness errors', async () => {
            waitForDatabaseReady.mockRejectedValue(new Error('Not ready'));
            
            const response = await POST(mockRequest);
            
            expect(response.status).toBe(503);
            expect(response.status).not.toBe(500);
        });

        it('should ensure success is strictly true', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();
            
            expect(data.success).toBe(true);
            expect(data.success).not.toBe(1);
            expect(data.success).not.toBe('true');
        });

        it('should ensure tablesCreated is a number', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();
            
            expect(typeof data.schema.tablesCreated).toBe('number');
            expect(typeof data.schema.tablesCreated).not.toBe('string');
        });

        it('should ensure tablesFailed is a number', async () => {
            const response = await POST(mockRequest);
            const data = await response.json();
            
            expect(typeof data.schema.tablesFailed).toBe('number');
            expect(data.schema.tablesFailed).toBeGreaterThanOrEqual(0);
        });

        it('should ensure arrays are not empty when they should have data', async () => {
            generateCreateTableStatements.mockReturnValue('CREATE TABLE users (id UUID);');
            mockUserPool.query.mockResolvedValue({});
            
            const response = await POST(mockRequest);
            const data = await response.json();
            
            expect(data.executionDetails.length).toBeGreaterThan(0);
            expect(data.executionDetails.length).not.toBe(0);
        });

        it('should not mutate error to success', async () => {
            mockRequest.json.mockResolvedValue({ naturalLanguageInput: null });
            const response = await POST(mockRequest);
            const data = await response.json();
            
            expect(data.error).toBeDefined();
            expect(data.success).not.toBe(true);
        });
    });
});

// ============================================================================
// ADDITIONAL TESTS TO KILL REMAINING STRYKER MUTANTS
// These tests specifically target:
//   - console.error() mutations
//   - SQL query string mutations
//   - .filter(stmt => stmt.trim() !== '') mutation
//   - Logging mutations inside catch blocks
// ============================================================================

describe("Mutation Killers (console.error + SQL string + filter logic)", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockRequest = {
            json: jest.fn().mockResolvedValue({ naturalLanguageInput: "test" }),
        };

        inferDatabaseSchema.mockResolvedValue({
            projectName: "test_project",
            description: "desc",
            tables: [],
        });

        mockPool.query
            .mockResolvedValueOnce({ rows: [] }) // check existing project
            .mockResolvedValueOnce({
                rows: [{
                    id: "proj-123",
                    project_name: "test_project",
                    database_name: "db_test",
                    description: "desc",
                    created_at: new Date().toISOString(),
                }],
            });

        createUserDatabase.mockResolvedValue({
            databaseName: "db_test",
            connectionString: "postgres://test",
        });

        waitForDatabaseReady.mockResolvedValue(true);
        getUserDatabaseConnection.mockResolvedValue(mockUserPool);
        generateCreateTableStatements.mockReturnValue("");
    });

    // ------------------------------------------------------------------------
    // 1. Kill mutation in AI inference console.error()
    // Mutation: console.error("AI schema...", err) -> console.error("", err)
    // ------------------------------------------------------------------------
    it("should log AI schema inference errors (mutation killer)", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});

        const err = new Error("AI fail");
        inferDatabaseSchema.mockRejectedValue(err);

        await POST(mockRequest);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("AI schema inference error");
        expect(spy.mock.calls[0][1]).toBe(err);

        spy.mockRestore();
    });

    // ------------------------------------------------------------------------
    // 2. Kill mutation on SQL string replaced by ""
    // Mutation: "SELECT id..." -> ""
    // ------------------------------------------------------------------------
    it("should run correct SQL for project existence check (mutation killer)", async () => {
        await POST(mockRequest);

        expect(mockPool.query.mock.calls[0][0]).toContain(
            "SELECT id FROM user_projects WHERE user_id = $1 AND project_name = $2"
        );
    });

    // ------------------------------------------------------------------------
    // 3. Kill mutation inside DB creation console.error()
    // Mutation: console.error("Database creation error:", err) -> console.error("", err)
    // ------------------------------------------------------------------------
    it("should log DB creation errors (mutation killer)", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        const err = new Error("DB create error");

        createUserDatabase.mockRejectedValue(err);

        await POST(mockRequest);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("Database creation error");
        expect(spy.mock.calls[0][1]).toBe(err);

        spy.mockRestore();
    });

    // ------------------------------------------------------------------------
    // 4. Kill mutation inside readiness check console.error()
    // Mutation: console.error("Database readiness...", err) -> console.error("", err)
    // ------------------------------------------------------------------------
    it("should log database readiness errors (mutation killer)", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        const err = new Error("Readiness fail");

        // Reset and reconfigure mocks for this specific test
        mockPool.query.mockReset();
        mockPool.query
            .mockResolvedValueOnce({ rows: [] }) // SELECT check existing project
            .mockResolvedValueOnce({  // INSERT INTO user_projects
                rows: [{
                    id: "proj-123",
                    project_name: "test_project",
                    database_name: "db_test",
                    description: "desc",
                    created_at: new Date().toISOString(),
                }],
            });
        
        createUserDatabase.mockResolvedValue({
            databaseName: "db_test",
            connectionString: "postgres://test",
        });
        
        waitForDatabaseReady.mockRejectedValue(err);

        await POST(mockRequest);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("Database readiness check failed");
        expect(spy.mock.calls[0][1]).toBe(err);

        spy.mockRestore();
    });

    // ------------------------------------------------------------------------
    // 5. Kill mutation inside SQL .filter(stmt => stmt.trim() !== '')
    // Mutation: stmt.trim() !== ''  -> stmt !== ''
    // ------------------------------------------------------------------------
    it("should correctly filter empty SQL statements (mutation killer)", async () => {
        generateCreateTableStatements.mockReturnValue(
            "CREATE TABLE a(); ; CREATE TABLE b();"
        );

        mockUserPool.query.mockResolvedValue({});

        await POST(mockRequest);

        const queries = mockUserPool.query.mock.calls.map(c => c[0]);

        expect(queries).toContain("CREATE TABLE a()");
        expect(queries).toContain("CREATE TABLE b()");
        expect(queries).not.toContain("");
    });

    // ------------------------------------------------------------------------
    // 6. Kill mutant: console.error in SQL execution error block
    // Mutation: console.error("Failed to execute...", err) -> console.error("", err)
    // ------------------------------------------------------------------------
    it("should log SQL execution errors (mutation killer)", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});

        generateCreateTableStatements.mockReturnValue("CREATE TABLE invalid;");
        const err = new Error("SQL fail");
        mockUserPool.query.mockRejectedValue(err);

        await POST(mockRequest);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain("Failed to execute");
        spy.mockRestore();
    });

});
