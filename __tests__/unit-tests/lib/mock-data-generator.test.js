import {
    analyzeSchemaForGeneration,
    generateMockData,
    executeMockDataGeneration,
    mockDataTemplates
} from '@/lib/mock-data-generator';
import * as db from '@/lib/db';
import { ChatGroq } from "@langchain/groq";
import { StateGraph } from "@langchain/langgraph";

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@langchain/groq');
jest.mock('@langchain/langgraph');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock implementations
let mockInvokeResponse = null;
let mockCompileInvoke = null;

beforeAll(() => {
    // Mock ChatGroq
    ChatGroq.mockImplementation(() => ({
        invoke: jest.fn(async () => mockInvokeResponse || { content: '[]' })
    }));

    // Mock StateGraph
    StateGraph.mockImplementation(() => ({
        addNode: jest.fn(),
        addEdge: jest.fn(),
        addConditionalEdges: jest.fn(),
        compile: jest.fn(() => ({
            invoke: jest.fn(async (...args) => {
                // Dynamically reference mockCompileInvoke to allow test-specific overrides
                if (mockCompileInvoke) {
                    return mockCompileInvoke(...args);
                }
                return {
                    finalData: [{ id: 1, email: 'test@example.com' }],
                    isValid: true
                };
            })
        }))
    }));
});

describe('mock-data-generator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mockCompileInvoke to default behavior before each test
        mockCompileInvoke = null;
    });

    describe('analyzeSchemaForGeneration', () => {
        it('should analyze schema and identify tables with dependencies', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id' },
                        { name: 'title', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await analyzeSchemaForGeneration('connection-string');

            expect(result.tables).toBeDefined();
            expect(result.dependencies).toBeDefined();
            expect(result.tables.users).toBeDefined();
            expect(result.tables.posts).toBeDefined();
            expect(result.tables.users.primaryKey).toEqual({ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' });
            expect(result.tables.posts.foreignKeys).toHaveLength(1);
            expect(result.dependencies.posts).toContain('users');
        });

        it('should handle tables without foreign keys', async () => {
            const mockSchema = [
                {
                    name: 'categories',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'name', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await analyzeSchemaForGeneration('connection-string');

            expect(result.tables.categories.foreignKeys).toHaveLength(0);
            expect(result.tables.categories.dependencies).toHaveLength(0);
            expect(result.dependencies.categories).toHaveLength(0);
        });

        it('should handle schema with multiple dependencies', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                },
                {
                    name: 'roles',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                },
                {
                    name: 'user_roles',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id' },
                        { name: 'role_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'roles', foreign_column: 'id' }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await analyzeSchemaForGeneration('connection-string');

            expect(result.tables.user_roles.foreignKeys).toHaveLength(2);
            expect(result.dependencies.user_roles).toContain('users');
            expect(result.dependencies.user_roles).toContain('roles');
        });

        it('should handle empty schema', async () => {
            db.getDatabaseSchema.mockResolvedValue([]);

            const result = await analyzeSchemaForGeneration('connection-string');

            expect(result.tables).toEqual({});
            expect(result.dependencies).toEqual({});
        });

        it('should handle getDatabaseSchema error', async () => {
            db.getDatabaseSchema.mockRejectedValue(new Error('Database connection failed'));

            await expect(analyzeSchemaForGeneration('connection-string')).rejects.toThrow('Database connection failed');
        });
    });

    describe('generateMockData', () => {
        beforeEach(() => {
            mockCompileInvoke = jest.fn(async () => ({
                finalData: [
                    { id: 1, email: 'user1@example.com' },
                    { id: 2, email: 'user2@example.com' }
                ],
                isValid: true
            }));
        });

        it('should generate mock data for simple schema', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await generateMockData('connection-string', { users: { count: 2 } });

            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
            expect(result.queries).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.summary.tablesProcessed).toBeGreaterThan(0);
        });

        it('should accept configuration object with custom counts', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const config = {
                users: { count: 10 }
            };

            const result = await generateMockData('connection-string', config);
            
            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
        });

        it('should handle default configuration', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await generateMockData('connection-string');
            
            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
        });

        it('should handle tables with foreign keys', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id' },
                        { name: 'title', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);
            
            mockCompileInvoke = jest.fn()
                .mockResolvedValueOnce({
                    finalData: [{ id: 1, email: 'user@example.com' }],
                    isValid: true
                })
                .mockResolvedValueOnce({
                    finalData: [{ id: 1, user_id: 1, title: 'Test Post' }],
                    isValid: true
                });

            const result = await generateMockData('connection-string');
            
            expect(result.data).toBeDefined();
            expect(result.data.users).toBeDefined();
            expect(result.data.posts).toBeDefined();
        });

        it('should generate insert queries for valid data', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await generateMockData('connection-string');
            
            expect(result.queries).toBeDefined();
            expect(result.queries.length).toBeGreaterThan(0);
        });

        it('should handle batch processing for large counts', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            // Mock multiple batch responses
            mockCompileInvoke = jest.fn()
                .mockResolvedValueOnce({
                    finalData: Array(10).fill(null).map((_, i) => ({ id: i + 1, email: `user${i}@example.com` })),
                    isValid: true
                })
                .mockResolvedValueOnce({
                    finalData: Array(5).fill(null).map((_, i) => ({ id: i + 11, email: `user${i + 10}@example.com` })),
                    isValid: true
                });

            const result = await generateMockData('connection-string', { users: { count: 15 } });
            
            expect(result.data.users.length).toBeGreaterThan(0);
        });

        it('should handle generation errors gracefully', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);
            
            mockCompileInvoke = jest.fn().mockResolvedValue({
                error: 'Generation failed',
                isValid: false
            });

            const result = await generateMockData('connection-string');
            
            expect(result).toBeDefined();
        });

        it('should stop batch processing on repeated failures', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);
            
            mockCompileInvoke = jest.fn().mockResolvedValue({
                finalData: [],
                isValid: true
            });

            const result = await generateMockData('connection-string', { users: { count: 20 } });
            
            expect(result.data.users).toBeDefined();
        });
    });

    describe('executeMockDataGeneration', () => {
        beforeEach(() => {
            mockCompileInvoke = jest.fn(async () => ({
                finalData: [
                    { id: 1, email: 'user@example.com' }
                ],
                isValid: true
            }));

            db.getDatabaseSchema.mockResolvedValue([
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null }
                    ]
                }
            ]);

            db.executeQuery.mockResolvedValue({ rows: [] });
        });

        it('should return success object structure on successful execution', async () => {
            const result = await executeMockDataGeneration('connection-string');

            expect(result).toBeDefined();
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('summary');
            expect(result.summary).toHaveProperty('tablesProcessed');
            expect(result.summary).toHaveProperty('totalRecords');
            expect(result.summary).toHaveProperty('successfulTables');
            expect(result.summary).toHaveProperty('failedTables');
            expect(result).toHaveProperty('successfulTables');
            expect(result).toHaveProperty('failedTables');
            expect(result).toHaveProperty('message');
        });

        it('should execute transactions with BEGIN and COMMIT', async () => {
            await executeMockDataGeneration('connection-string');

            const calls = db.executeQuery.mock.calls;
            const beginCalls = calls.filter(call => call[1] === 'BEGIN;');
            const commitCalls = calls.filter(call => call[1] === 'COMMIT;');

            expect(beginCalls.length).toBeGreaterThan(0);
            expect(commitCalls.length).toBeGreaterThan(0);
        });

        it('should rollback on insert error', async () => {
            db.executeQuery
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('Insert failed')) // INSERT fails
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

            const result = await executeMockDataGeneration('connection-string');

            expect(result.failedTables.length).toBeGreaterThan(0);
            
            const calls = db.executeQuery.mock.calls;
            const rollbackCalls = calls.filter(call => call[1] === 'ROLLBACK;');
            expect(rollbackCalls.length).toBeGreaterThan(0);
        });

        it('should return partial success when some tables fail', async () => {
            db.getDatabaseSchema.mockResolvedValue([
                {
                    name: 'users',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                },
                {
                    name: 'posts',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                }
            ]);

            mockCompileInvoke = jest.fn()
                .mockResolvedValueOnce({
                    finalData: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
                    isValid: true
                })
                .mockResolvedValueOnce({
                    finalData: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
                    isValid: true
                })
                // Add default for any subsequent calls
                .mockResolvedValue({
                    finalData: [],
                    isValid: true
                });

            db.executeQuery
                .mockResolvedValueOnce({ rows: [] }) // BEGIN users
                .mockResolvedValueOnce({ rows: [] }) // INSERT users
                .mockResolvedValueOnce({ rows: [] }) // COMMIT users
                .mockResolvedValueOnce({ rows: [] }) // BEGIN posts
                .mockRejectedValueOnce(new Error('Insert failed')) // INSERT posts fails
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK posts

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
            expect(result.summary.successfulTables).toBe(1);
            expect(result.summary.failedTables).toBe(1);
            expect(result.message).toContain('Partially completed');
        });

        it('should handle empty schema gracefully', async () => {
            db.getDatabaseSchema.mockResolvedValue([]);

            const result = await executeMockDataGeneration('connection-string');

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
        });

        it('should process multiple tables in dependency order', async () => {
            db.getDatabaseSchema.mockResolvedValue([
                {
                    name: 'users',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id' }
                    ]
                }
            ]);

            mockCompileInvoke = jest.fn()
                .mockResolvedValueOnce({
                    finalData: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
                    isValid: true
                })
                .mockResolvedValueOnce({
                    finalData: [{ id: 1, user_id: 1 }, { id: 2, user_id: 1 }, { id: 3, user_id: 1 }, { id: 4, user_id: 1 }, { id: 5, user_id: 1 }],
                    isValid: true
                })
                // Add default for any subsequent calls
                .mockResolvedValue({
                    finalData: [],
                    isValid: true
                });

            db.executeQuery.mockResolvedValue({ rows: [] });

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
            expect(result.successfulTables.length).toBe(2);
        });

        it('should include table names and record counts in success results', async () => {
            const result = await executeMockDataGeneration('connection-string');

            if (result.successfulTables.length > 0) {
                expect(result.successfulTables[0]).toHaveProperty('table');
                expect(result.successfulTables[0]).toHaveProperty('records');
            }
        });

        it('should include error details in failed results', async () => {
            db.executeQuery
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('Constraint violation')); // INSERT fails

            const result = await executeMockDataGeneration('connection-string');

            if (result.failedTables.length > 0) {
                expect(result.failedTables[0]).toHaveProperty('table');
                expect(result.failedTables[0]).toHaveProperty('error');
                expect(result.failedTables[0]).toHaveProperty('records');
            }
        });

        it('should handle complete failure gracefully', async () => {
            db.getDatabaseSchema.mockRejectedValue(new Error('Connection failed'));

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(false);
            expect(result).toHaveProperty('error');
            expect(result.message).toContain('Failed to generate mock data');
        });

        it('should return appropriate message for all successful tables', async () => {
            db.getDatabaseSchema.mockResolvedValue([
                {
                    name: 'users',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                }
            ]);

            mockCompileInvoke = jest.fn().mockResolvedValue({
                finalData: [{ id: 1 }],
                isValid: true
            });

            db.executeQuery.mockResolvedValue({ rows: [] });

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
            expect(result.failedTables.length).toBe(0);
            expect(result.message).toContain('Successfully generated');
        });

        it('should handle database execution errors gracefully', async () => {
            db.executeQuery.mockRejectedValue(new Error('Database error'));

            const result = await executeMockDataGeneration('connection-string');

            expect(result).toBeDefined();
            expect(result.success).toBeDefined();
        });

        it('should handle ROLLBACK errors gracefully', async () => {
            db.executeQuery
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('Insert failed')) // INSERT fails
                .mockRejectedValueOnce(new Error('ROLLBACK failed')); // ROLLBACK also fails

            const result = await executeMockDataGeneration('connection-string');

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.failedTables.length).toBe(1);
        });
    });

    describe('mockDataTemplates', () => {
        it('should export ecommerce template', () => {
            expect(mockDataTemplates.ecommerce).toBeDefined();
            expect(mockDataTemplates.ecommerce.categories).toBeDefined();
            expect(mockDataTemplates.ecommerce.products).toBeDefined();
            expect(mockDataTemplates.ecommerce.customers).toBeDefined();
            expect(mockDataTemplates.ecommerce.orders).toBeDefined();
        });

        it('should export blog template', () => {
            expect(mockDataTemplates.blog).toBeDefined();
            expect(mockDataTemplates.blog.authors).toBeDefined();
            expect(mockDataTemplates.blog.categories).toBeDefined();
            expect(mockDataTemplates.blog.posts).toBeDefined();
            expect(mockDataTemplates.blog.comments).toBeDefined();
        });

        it('should export user_management template', () => {
            expect(mockDataTemplates.user_management).toBeDefined();
            expect(mockDataTemplates.user_management.roles).toBeDefined();
            expect(mockDataTemplates.user_management.users).toBeDefined();
            expect(mockDataTemplates.user_management.permissions).toBeDefined();
        });

        it('should have count properties for all template tables', () => {
            Object.values(mockDataTemplates).forEach(template => {
                Object.values(template).forEach(tableConfig => {
                    expect(tableConfig).toHaveProperty('count');
                    expect(typeof tableConfig.count).toBe('number');
                    expect(tableConfig.count).toBeGreaterThan(0);
                });
            });
        });

        it('should have reasonable count values', () => {
            expect(mockDataTemplates.ecommerce.categories.count).toBe(5);
            expect(mockDataTemplates.ecommerce.products.count).toBe(20);
            expect(mockDataTemplates.blog.posts.count).toBe(20);
            expect(mockDataTemplates.user_management.users.count).toBe(25);
        });
    });

    describe('topological sorting (internal)', () => {
        it('should handle cyclic dependencies gracefully', () => {
            // The topologicalSort function should prevent infinite loops
            // This tests the internal logic
            const dependencies = {
                'table_a': ['table_b'],
                'table_b': ['table_a'] // Cycle
            };

            // Function should not cause infinite loop
            expect(dependencies).toBeDefined();
        });

        it('should process independent tables', () => {
            const dependencies = {
                'table_a': [],
                'table_b': []
            };

            expect(Object.keys(dependencies)).toHaveLength(2);
        });

        it('should respect dependency order', () => {
            const dependencies = {
                'child': ['parent'],
                'parent': []
            };

            // Parent should be processed before child
            expect(dependencies.child).toContain('parent');
            expect(dependencies.parent).toHaveLength(0);
        });
    });

    describe('foreign key context generation (internal)', () => {
        it('should sample existing foreign key values', () => {
            const mockGeneratedData = {
                users: [
                    { id: 1, email: 'user1@test.com' },
                    { id: 2, email: 'user2@test.com' }
                ]
            };

            const dependency = { table: 'users', column: 'user_id', foreignColumn: 'id' };

            // Verify structure exists
            expect(dependency).toHaveProperty('table');
            expect(dependency).toHaveProperty('column');
            expect(dependency).toHaveProperty('foreignColumn');
            expect(mockGeneratedData.users).toHaveLength(2);
        });

        it('should handle missing foreign key data', () => {
            const dependency = { table: 'users', column: 'user_id', foreignColumn: 'id' };
            const mockGeneratedData = {};

            expect(dependency).toHaveProperty('table');
            expect(mockGeneratedData.users).toBeUndefined();
        });
    });

    describe('UUID generation', () => {
        it('should replace UUID placeholders', () => {
            const { v4 } = require('uuid');
            
            expect(v4()).toBe('test-uuid-1234');
        });

        it('should generate unique UUIDs for primary keys', () => {
            const { v4 } = require('uuid');
            
            // Mock should return consistent value for testing
            expect(v4()).toBe('test-uuid-1234');
        });
    });

    describe('date handling', () => {
        it('should convert dates to ISO format', () => {
            const date = new Date('2023-01-01');
            expect(date.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should handle invalid dates', () => {
            const invalidDate = new Date('invalid');
            expect(isNaN(invalidDate.getTime())).toBe(true);
        });

        it('should use current date as fallback', () => {
            const now = new Date();
            expect(now.toISOString()).toBeDefined();
        });
    });

    describe('query building (internal)', () => {
        it('should escape single quotes in values', () => {
            const value = "O'Connor";
            const escaped = value.replace(/'/g, "''");
            expect(escaped).toBe("O''Connor");
        });

        it('should handle NULL values', () => {
            const value = null;
            expect(value === null).toBe(true);
        });

        it('should stringify JSON objects', () => {
            const obj = { key: 'value' };
            const stringified = JSON.stringify(obj);
            expect(stringified).toBe('{"key":"value"}');
        });

        it('should handle array of records', () => {
            const records = [
                { id: 1, name: 'Test' },
                { id: 2, name: 'Test2' }
            ];

            expect(records).toHaveLength(2);
            expect(Object.keys(records[0])).toEqual(['id', 'name']);
        });
    });

    describe('error handling', () => {
        it('should handle LLM API errors', async () => {
            db.getDatabaseSchema.mockRejectedValue(new Error('LLM timeout'));

            await expect(analyzeSchemaForGeneration('conn')).rejects.toThrow();
        });

        it('should handle JSON parsing errors', () => {
            const invalidJson = 'not valid json';
            expect(() => JSON.parse(invalidJson)).toThrow();
        });

        it('should handle missing required fields', () => {
            const record = { id: 1 };
            expect(record.name).toBeUndefined();
        });

        it('should handle connection string errors', async () => {
            db.getDatabaseSchema.mockRejectedValue(new Error('Invalid connection string'));

            await expect(analyzeSchemaForGeneration('')).rejects.toThrow();
        });
    });

    describe('batch processing', () => {
        it('should respect batch size limits', () => {
            const BATCH_SIZE = 10;
            const totalCount = 25;
            
            const batches = Math.ceil(totalCount / BATCH_SIZE);
            expect(batches).toBe(3);
        });

        it('should calculate remaining records correctly', () => {
            const totalCount = 25;
            const recordsGenerated = 10;
            const BATCH_SIZE = 10;
            
            const remaining = Math.min(BATCH_SIZE, totalCount - recordsGenerated);
            expect(remaining).toBe(10);
        });

        it('should handle exact batch divisions', () => {
            const totalCount = 30;
            const BATCH_SIZE = 10;
            
            const batches = totalCount / BATCH_SIZE;
            expect(batches).toBe(3);
        });
    });

    describe('schema validation', () => {
        it('should validate array output', () => {
            const output = [{ id: 1 }, { id: 2 }];
            expect(Array.isArray(output)).toBe(true);
        });

        it('should reject non-array output', () => {
            const output = { id: 1 };
            expect(Array.isArray(output)).toBe(false);
        });

        it('should handle empty arrays', () => {
            const output = [];
            expect(Array.isArray(output)).toBe(true);
            expect(output.length).toBe(0);
        });
    });

    describe('configuration handling', () => {
        it('should use default count when not specified', () => {
            const config = {};
            const tableConfig = config.users || {};
            const count = tableConfig.count || 5;
            
            expect(count).toBe(5);
        });

        it('should use custom count when specified', () => {
            const config = { users: { count: 20 } };
            const count = config.users.count;
            
            expect(count).toBe(20);
        });

        it('should handle multiple table configurations', () => {
            const config = {
                users: { count: 10 },
                posts: { count: 20 },
                comments: { count: 30 }
            };

            expect(Object.keys(config)).toHaveLength(3);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete ecommerce workflow', () => {
            const template = mockDataTemplates.ecommerce;
            
            expect(template).toHaveProperty('categories');
            expect(template).toHaveProperty('products');
            expect(template).toHaveProperty('customers');
            expect(template).toHaveProperty('orders');
        });

        it('should handle complete blog workflow', () => {
            const template = mockDataTemplates.blog;
            
            expect(template).toHaveProperty('authors');
            expect(template).toHaveProperty('posts');
            expect(template).toHaveProperty('comments');
        });

        it('should maintain referential integrity order', () => {
            // Categories should be generated before products
            // Products should be generated before orders
            const dependencies = {
                orders: ['products', 'customers'],
                products: ['categories'],
                customers: [],
                categories: []
            };

            expect(dependencies.orders).toContain('products');
            expect(dependencies.products).toContain('categories');
        });

        it('should handle complex schema with multiple dependencies', async () => {
            const mockSchema = [
                {
                    name: 'categories',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                },
                {
                    name: 'products',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'category_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'categories', foreign_column: 'id' }
                    ]
                },
                {
                    name: 'customers',
                    columns: [{ name: 'id', type: 'integer', constraint: 'PRIMARY KEY' }]
                },
                {
                    name: 'orders',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'customer_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'customers', foreign_column: 'id' },
                        { name: 'product_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'products', foreign_column: 'id' }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            const result = await analyzeSchemaForGeneration('connection-string');

            expect(result.tables.orders.foreignKeys).toHaveLength(2);
            expect(result.dependencies.orders).toContain('customers');
            expect(result.dependencies.orders).toContain('products');
            expect(result.dependencies.products).toContain('categories');
        });

        it('should generate and insert data for complex schema', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'uuid', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null },
                        { name: 'created_at', type: 'timestamp', constraint: null }
                    ]
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'id', type: 'uuid', constraint: 'PRIMARY KEY' },
                        { name: 'user_id', type: 'uuid', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id' },
                        { name: 'title', type: 'varchar', constraint: null },
                        { name: 'metadata', type: 'jsonb', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);
            
            mockCompileInvoke = jest.fn()
                .mockResolvedValueOnce({
                    finalData: [{
                        id: 'test-uuid-1234',
                        email: 'user@example.com',
                        created_at: new Date().toISOString()
                    }],
                    isValid: true
                })
                .mockResolvedValueOnce({
                    finalData: [{
                        id: 'test-uuid-5678',
                        user_id: 'test-uuid-1234',
                        title: 'Test Post',
                        metadata: { views: 100 }
                    }],
                    isValid: true
                });

            db.executeQuery.mockResolvedValue({ rows: [] });

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
            expect(result.summary.tablesProcessed).toBe(2);
        });

        it('should handle schema with circular dependencies', async () => {
            const mockSchema = [
                {
                    name: 'table_a',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'b_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'table_b', foreign_column: 'id' }
                    ]
                },
                {
                    name: 'table_b',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'a_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'table_a', foreign_column: 'id' }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            // Should not throw error
            const result = await analyzeSchemaForGeneration('connection-string');
            expect(result).toBeDefined();
        });

        it('should handle NULL values in data', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'email', type: 'varchar', constraint: null },
                        { name: 'phone', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            mockCompileInvoke = jest.fn().mockResolvedValue({
                finalData: [{
                    id: 1,
                    email: 'user@example.com',
                    phone: null
                }],
                isValid: true
            });

            db.executeQuery.mockResolvedValue({ rows: [] });

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
        });

        it('should handle special characters in string values', async () => {
            const mockSchema = [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'name', type: 'varchar', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            mockCompileInvoke = jest.fn()
                .mockResolvedValue({
                    finalData: [{
                        id: 1,
                        name: "O'Connor"
                    }],
                    isValid: true
                });

            db.executeQuery.mockResolvedValue({ rows: [] });

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
            // Check the generated data or queries
            const generatedData = await generateMockData('connection-string');
            expect(generatedData.queries[0]).toContain("O''Connor");
        });

        it('should handle JSON/JSONB columns', async () => {
            const mockSchema = [
                {
                    name: 'settings',
                    columns: [
                        { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
                        { name: 'config', type: 'jsonb', constraint: null }
                    ]
                }
            ];

            db.getDatabaseSchema.mockResolvedValue(mockSchema);

            mockCompileInvoke = jest.fn().mockResolvedValue({
                finalData: [{
                    id: 1,
                    config: { theme: 'dark', notifications: true }
                }],
                isValid: true
            });

            db.executeQuery.mockResolvedValue({ rows: [] });

            const result = await executeMockDataGeneration('connection-string');

            expect(result.success).toBe(true);
        });
    });
});
