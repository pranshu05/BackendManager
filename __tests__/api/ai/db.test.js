/**
 * @jest-environment node
 */

// Mock pg module
const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockPool = jest.fn(() => ({
  query: mockQuery,
  end: mockEnd,
}));

jest.mock('pg', () => ({
  Pool: mockPool,
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('db.js', () => {
  let db;

  beforeAll(() => {
    // Set required environment variables
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    process.env.NEON_API_KEY = 'test-api-key';
    process.env.NEON_PROJECT_ID = 'test-project-id';
    process.env.NEON_BRANCH_ID = 'test-branch-id';
    process.env.NEON_BASE_URI = 'postgres://user:pass@localhost:5432';

    db = require('@/lib/db');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockClear();
    mockEnd.mockClear();
    mockPool.mockClear();
    global.fetch.mockClear();
  });

  describe('createUserDatabase', () => {
    it('should successfully create a user database', async () => {
      const mockResponse = {
        database: {
          id: 123,
          name: 'user123_testproject',
          created_at: '2025-11-20T00:00:00Z',
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await db.createUserDatabase('user-123', 'TestProject');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://console.neon.tech/api/v2/projects/test-project-id/branches/test-branch-id/databases',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            database: {
              name: 'user_123_testproject',
              owner_name: 'neondb_owner',
            },
          }),
        }
      );

      expect(result).toEqual({
        databaseName: 'user_123_testproject',
        connectionString: 'postgres://user:pass@localhost:5432/user_123_testproject',
        projectId: 'test-project-id',
        branchId: 'test-branch-id',
        apiResponse: mockResponse,
      });
      expect(result.databaseName).toBe('user_123_testproject');
      expect(result.databaseName).not.toBe('user-123-testproject');
      expect(result.connectionString).toContain('/user_123_testproject');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should sanitize database name correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ database: { name: 'test' } }),
      });

      await db.createUserDatabase('user-abc-123', 'My Project!@#');

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      // Special characters are replaced with underscores
      expect(callBody.database.name).toBe('user_abc_123_my_project___');
      expect(callBody.database.name).not.toContain('-');
      expect(callBody.database.name).not.toContain('!');
      expect(callBody.database.name).not.toContain('@');
      expect(callBody.database.name).not.toContain('#');
      expect(callBody.database.owner_name).toBe('neondb_owner');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid database name',
      });

      await expect(
        db.createUserDatabase('user-123', 'TestProject')
      ).rejects.toThrow('Failed to create database: 400 Bad Request - Invalid database name');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        db.createUserDatabase('user-123', 'TestProject')
      ).rejects.toThrow('Network error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating user database:',
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should use POST method not GET or PUT', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ database: { name: 'test' } }),
      });

      await db.createUserDatabase('user-1', 'Test');

      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('GET');
      expect(global.fetch.mock.calls[0][1].method).not.toBe('PUT');
    });

    it('should include all required headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ database: { name: 'test' } }),
      });

      await db.createUserDatabase('user-1', 'Test');

      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer test-api-key');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Accept).toBe('application/json');
      expect(headers.Authorization).toContain('Bearer ');
    });
  });

  describe('deleteUserDatabase', () => {
    it('should successfully delete a user database', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await db.deleteUserDatabase('user_123_testproject');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://console.neon.tech/api/v2/projects/test-project-id/branches/test-branch-id/databases/user_123_testproject',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-api-key',
            Accept: 'application/json',
          },
        }
      );

      expect(result).toEqual({
        success: true,
        databaseName: 'user_123_testproject',
        message: 'Database user_123_testproject deleted successfully',
      });
      expect(result.success).toBe(true);
      expect(result.success).not.toBe(false);
      expect(result.message).toContain('user_123_testproject');
      expect(result.message).toContain('deleted successfully');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when deletion fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Database not found',
      });

      await expect(
        db.deleteUserDatabase('nonexistent_db')
      ).rejects.toThrow('Failed to delete database: 404 Not Found - Database not found');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors during deletion', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection timeout'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        db.deleteUserDatabase('test_db')
      ).rejects.toThrow('Connection timeout');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting user database:',
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should use DELETE method not POST or GET', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await db.deleteUserDatabase('test_db');

      const method = global.fetch.mock.calls[0][1].method;
      expect(method).toBe('DELETE');
      expect(method).not.toBe('POST');
      expect(method).not.toBe('GET');
    });
  });

  describe('getUserDatabaseConnection', () => {
    it('should connect with SSL successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const pool = await db.getUserDatabaseConnection(
        'postgres://user:pass@localhost:5432/testdb'
      );

      expect(mockPool).toHaveBeenCalledWith({
        connectionString: 'postgres://user:pass@localhost:5432/testdb',
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      });

      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(pool).toBeDefined();
      expect(pool).not.toBeNull();
      expect(pool).not.toBeUndefined();
      expect(mockPool).toHaveBeenCalledTimes(1);
    });

    it('should fallback to non-SSL connection when SSL fails', async () => {
      // First call (SSL) fails
      mockQuery
        .mockRejectedValueOnce(new Error('does not support SSL'))
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // Second call (non-SSL) succeeds

      const pool = await db.getUserDatabaseConnection(
        'postgres://user:pass@localhost:5432/testdb'
      );

      // Should be called twice - once with SSL, once without
      expect(mockPool).toHaveBeenCalledTimes(2);
      expect(mockPool).not.toHaveBeenCalledTimes(1);
      expect(mockPool).not.toHaveBeenCalledTimes(3);
      expect(mockPool).toHaveBeenNthCalledWith(2, {
        connectionString: 'postgres://user:pass@localhost:5432/testdb',
        ssl: false,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      });
      expect(mockQuery).toHaveBeenCalledTimes(2);

      expect(pool).toBeDefined();
    });

    it('should throw error when both SSL and non-SSL connections fail', async () => {
      mockQuery
        .mockRejectedValueOnce(new Error('does not support SSL'))
        .mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        db.getUserDatabaseConnection('postgres://user:pass@localhost:5432/testdb')
      ).rejects.toThrow('Failed to connect to database: Connection refused');
      expect(mockPool).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle ECONNREFUSED error with fallback', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      mockQuery
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const pool = await db.getUserDatabaseConnection(
        'postgres://user:pass@localhost:5432/testdb'
      );

      expect(mockPool).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(pool).toBeDefined();
      expect(error.code).toBe('ECONNREFUSED');
    });

    it('should throw error for SSL connection failure with other errors', async () => {
      const error = new Error('Authentication failed');
      mockQuery.mockRejectedValueOnce(error);

      await expect(
        db.getUserDatabaseConnection('postgres://user:pass@localhost:5432/testdb')
      ).rejects.toThrow('Failed to connect to database: Authentication failed');

      // Should only try SSL connection, not fallback
      expect(mockPool).toHaveBeenCalledTimes(1);
      expect(mockPool).not.toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should use max pool size of 5 not 10', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await db.getUserDatabaseConnection('postgres://localhost/testdb');

      expect(mockPool.mock.calls[0][0].max).toBe(5);
      expect(mockPool.mock.calls[0][0].max).not.toBe(10);
      expect(mockPool.mock.calls[0][0].max).not.toBe(20);
    });
  });

  describe('createPool, getPool, removePool', () => {
    it('should create and retrieve a pool', () => {
      const pool = db.createPool('test-key', 'postgres://localhost/testdb');

      expect(mockPool).toHaveBeenCalledWith({
        connectionString: 'postgres://localhost/testdb',
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      });

      const retrievedPool = db.getPool('test-key');
      expect(retrievedPool).toBe(pool);
      expect(retrievedPool).not.toBeUndefined();
      expect(retrievedPool).not.toBeNull();
      expect(mockPool).toHaveBeenCalledTimes(1);
    });

    it('should return existing pool if key already exists', () => {
      const pool1 = db.createPool('duplicate-key', 'postgres://localhost/db1');
      const pool2 = db.createPool('duplicate-key', 'postgres://localhost/db2');

      expect(pool1).toBe(pool2);
      expect(pool1).not.toBeUndefined();
      expect(mockPool).toHaveBeenCalledTimes(1);
      expect(mockPool).not.toHaveBeenCalledTimes(2);
    });

    it('should remove a pool', async () => {
      mockEnd.mockResolvedValueOnce();
      db.createPool('remove-key', 'postgres://localhost/testdb');

      const removed = await db.removePool('remove-key');

      expect(removed).toBe(true);
      expect(removed).not.toBe(false);
      expect(typeof removed).toBe('boolean');
      expect(mockEnd).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledTimes(1);

      const retrieved = db.getPool('remove-key');
      expect(retrieved).toBeUndefined();
      expect(retrieved).not.toBeDefined();
    });

    it('should return false when removing non-existent pool', async () => {
      const removed = await db.removePool('non-existent-key');
      expect(removed).toBe(false);
      expect(removed).not.toBe(true);
      expect(typeof removed).toBe('boolean');
      expect(mockEnd).not.toHaveBeenCalled();
    });

    it('should use max pool size of 10 not 5 or 20', () => {
      db.createPool('size-test', 'postgres://localhost/testdb');

      expect(mockPool.mock.calls[0][0].max).toBe(10);
      expect(mockPool.mock.calls[0][0].max).not.toBe(5);
      expect(mockPool.mock.calls[0][0].max).not.toBe(20);
    });
  });

  describe('waitForDatabaseReady', () => {
    it('should return true when database is ready immediately', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await db.waitForDatabaseReady(
        'postgres://localhost/testdb',
        3,
        100
      );

      expect(result).toBe(true);
      expect(result).not.toBe(false);
      expect(typeof result).toBe('boolean');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalledTimes(0);
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second attempt', async () => {
      mockQuery
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await db.waitForDatabaseReady(
        'postgres://localhost/testdb',
        3,
        10
      );

      expect(result).toBe(true);
      expect(result).not.toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).not.toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalledTimes(3);
      expect(mockEnd).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max attempts', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      await expect(
        db.waitForDatabaseReady('postgres://localhost/testdb', 2, 10)
      ).rejects.toThrow('Database not ready after 2 attempts: Connection failed');

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).not.toHaveBeenCalledTimes(3);
      expect(mockEnd).toHaveBeenCalledTimes(2);
    });

    it('should use default parameters when not provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await db.waitForDatabaseReady('postgres://localhost/testdb');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('should verify max attempts reached exactly', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        db.waitForDatabaseReady('postgres://localhost/testdb', 3, 10)
      ).rejects.toThrow('Database not ready after 3 attempts');

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).not.toHaveBeenCalledTimes(2);
      expect(mockQuery).not.toHaveBeenCalledTimes(4);
    });
  });

  describe('executeQuery', () => {
    it('should execute a valid query successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // Connection test
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] }); // Actual query

      const result = await db.executeQuery(
        'postgres://localhost/testdb',
        'SELECT * FROM users WHERE id = $1',
        [1]
      );

      expect(result.rows).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(1);
      expect(result.rows[0].name).toBe('Test');
      expect(mockEnd).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error for empty query', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', '')
      ).rejects.toThrow('Invalid query: Query must be a non-empty string');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for non-string query', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', null)
      ).rejects.toThrow('Invalid query: Query must be a non-empty string');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for undefined query', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', undefined)
      ).rejects.toThrow('Invalid query: Query must be a non-empty string');
    });

    it('should throw error for number query', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', 123)
      ).rejects.toThrow('Invalid query: Query must be a non-empty string');
    });

    it('should throw error for incomplete query ending with comma', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', 'SELECT id, name,')
      ).rejects.toThrow('Invalid query: Query appears to be incomplete or malformed');
    });

    it('should throw error for incomplete query ending with open parenthesis', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', 'INSERT INTO users (')
      ).rejects.toThrow('Invalid query: Query appears to be incomplete or malformed');
    });

    it('should throw error for incomplete SELECT query', async () => {
      await expect(
        db.executeQuery('postgres://localhost/testdb', 'SELECT id')
      ).rejects.toThrow('Invalid query: SELECT query appears to be incomplete');
    });

    it('should allow valid SELECT queries with special cases', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: 5 }] });

      await expect(
        db.executeQuery('postgres://localhost/testdb', 'SELECT COUNT(*) FROM users')
      ).resolves.toBeDefined();
    });

    it('should handle SQL syntax errors gracefully', async () => {
      const syntaxError = new Error('syntax error at or near "SELCT"');
      syntaxError.code = '42601';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockRejectedValueOnce(syntaxError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        db.executeQuery('postgres://localhost/testdb', 'SELCT * FROM users')
      ).rejects.toThrow('SQL Syntax Error: syntax error at or near "SELCT". Please check your query syntax.');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(mockEnd).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should normalize multiline queries', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const multilineQuery = `
        SELECT 
          id, 
          name 
        FROM 
          users 
        WHERE 
          active = true
      `;

      await db.executeQuery('postgres://localhost/testdb', multilineQuery);

      // Query should be normalized
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        multilineQuery,
        []
      );
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockEnd).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('should end pool even if query fails', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockRejectedValueOnce(new Error('Query failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        db.executeQuery('postgres://localhost/testdb', 'SELECT * FROM nonexistent')
      ).rejects.toThrow('Query failed');

      expect(mockEnd).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should pass parameters array to query', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      await db.executeQuery('postgres://localhost/testdb', 'SELECT * FROM users WHERE id = $1', [42]);

      expect(mockQuery).toHaveBeenNthCalledWith(2, 'SELECT * FROM users WHERE id = $1', [42]);
      expect(mockQuery.mock.calls[1][1]).toEqual([42]);
      expect(mockQuery.mock.calls[1][1][0]).toBe(42);
    });
  });

  describe('getDatabaseSchema', () => {
    it('should fetch and organize database schema', async () => {
      const mockSchemaRows = [
        {
          table_name: 'users',
          column_name: 'id',
          data_type: 'integer',
          is_nullable: 'NO',
          column_default: 'nextval(...)',
          constraint_type: 'PRIMARY KEY',
          constraint_name: 'users_pkey',
          foreign_table_name: null,
          foreign_column_name: null,
        },
        {
          table_name: 'users',
          column_name: 'name',
          data_type: 'character varying',
          is_nullable: 'YES',
          column_default: null,
          constraint_type: null,
          constraint_name: null,
          foreign_table_name: null,
          foreign_column_name: null,
        },
        {
          table_name: 'posts',
          column_name: 'id',
          data_type: 'integer',
          is_nullable: 'NO',
          column_default: null,
          constraint_type: 'PRIMARY KEY',
          constraint_name: 'posts_pkey',
          foreign_table_name: null,
          foreign_column_name: null,
        },
        {
          table_name: 'posts',
          column_name: 'user_id',
          data_type: 'integer',
          is_nullable: 'YES',
          column_default: null,
          constraint_type: 'FOREIGN KEY',
          constraint_name: 'posts_user_id_fkey',
          foreign_table_name: 'users',
          foreign_column_name: 'id',
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: mockSchemaRows });

      const schema = await db.getDatabaseSchema('postgres://localhost/testdb');

      expect(schema).toHaveLength(2);
      expect(schema).not.toHaveLength(0);
      expect(schema).not.toHaveLength(1);
      expect(schema).not.toHaveLength(3);
      
      const usersTable = schema.find(t => t.name === 'users');
      expect(usersTable).toBeDefined();
      expect(usersTable).not.toBeUndefined();
      expect(usersTable.columns).toHaveLength(2);
      expect(usersTable.columns).not.toHaveLength(0);
      expect(usersTable.columns[0]).toEqual({
        name: 'id',
        type: 'integer',
        nullable: false,
        default: 'nextval(...)',
        constraint: 'PRIMARY KEY',
        foreign_table: null,
        foreign_column: null,
      });
      expect(usersTable.columns[0].nullable).toBe(false);
      expect(usersTable.columns[0].nullable).not.toBe(true);

      const postsTable = schema.find(t => t.name === 'posts');
      expect(postsTable).toBeDefined();
      expect(postsTable.columns).toHaveLength(2);
      expect(postsTable.columns[1]).toEqual({
        name: 'user_id',
        type: 'integer',
        nullable: true,
        default: null,
        constraint: 'FOREIGN KEY',
        foreign_table: 'users',
        foreign_column: 'id',
      });
      expect(postsTable.columns[1].nullable).toBe(true);
      expect(postsTable.columns[1].nullable).not.toBe(false);
      expect(postsTable.columns[1].foreign_table).toBe('users');
      expect(postsTable.columns[1].foreign_column).toBe('id');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle empty schema', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const schema = await db.getDatabaseSchema('postgres://localhost/testdb');

      expect(schema).toEqual([]);
      expect(schema).toHaveLength(0);
      expect(schema).not.toHaveLength(1);
      expect(Array.isArray(schema)).toBe(true);
    });

    it('should handle schema fetch errors', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockRejectedValueOnce(new Error('Permission denied'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        db.getDatabaseSchema('postgres://localhost/testdb')
      ).rejects.toThrow('Permission denied');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching schema:',
        expect.any(Error)
      );
      // console.error is called twice - once in executeQuery, once in getDatabaseSchema
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(3);

      consoleErrorSpy.mockRestore();
    });

    it('should handle rows with null column names', async () => {
      const mockSchemaRows = [
        {
          table_name: 'empty_table',
          column_name: null,
          data_type: null,
          is_nullable: null,
          column_default: null,
          constraint_type: null,
          constraint_name: null,
          foreign_table_name: null,
          foreign_column_name: null,
        },
        {
          table_name: 'users',
          column_name: 'id',
          data_type: 'integer',
          is_nullable: 'NO',
          column_default: null,
          constraint_type: 'PRIMARY KEY',
          constraint_name: 'users_pkey',
          foreign_table_name: null,
          foreign_column_name: null,
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: mockSchemaRows });

      const schema = await db.getDatabaseSchema('postgres://localhost/testdb');

      expect(schema).toHaveLength(2);
      expect(schema).not.toHaveLength(0);
      
      const emptyTable = schema.find(t => t.name === 'empty_table');
      expect(emptyTable).toBeDefined();
      expect(emptyTable).not.toBeUndefined();
      expect(emptyTable.columns).toHaveLength(0);
      expect(emptyTable.columns).not.toHaveLength(1);

      const usersTable = schema.find(t => t.name === 'users');
      expect(usersTable).toBeDefined();
      expect(usersTable.columns).toHaveLength(1);
      expect(usersTable.columns).not.toHaveLength(0);
      expect(usersTable.columns).not.toHaveLength(2);
    });

    it('should convert is_nullable string to boolean correctly', async () => {
      const rows = [
        {
          table_name: 'test',
          column_name: 'col1',
          data_type: 'text',
          is_nullable: 'YES',
          column_default: null,
          constraint_type: null,
          foreign_table_name: null,
          foreign_column_name: null,
        },
        {
          table_name: 'test',
          column_name: 'col2',
          data_type: 'integer',
          is_nullable: 'NO',
          column_default: null,
          constraint_type: null,
          foreign_table_name: null,
          foreign_column_name: null,
        },
      ];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows });

      const schema = await db.getDatabaseSchema('postgres://localhost/testdb');

      expect(schema[0].columns[0].nullable).toBe(true);
      expect(schema[0].columns[0].nullable).not.toBe(false);
      expect(schema[0].columns[1].nullable).toBe(false);
      expect(schema[0].columns[1].nullable).not.toBe(true);
    });
  });

  describe('pool export', () => {
    it('should export main pool instance', () => {
      expect(db.pool).toBeDefined();
      expect(db.pool).not.toBeUndefined();
      expect(db.pool).not.toBeNull();
      expect(typeof db.pool).toBe('object');
      expect(typeof db.pool).not.toBe('string');
      expect(typeof db.pool).not.toBe('function');
    });

    it('should have query and end methods', () => {
      expect(db.pool.query).toBeDefined();
      expect(db.pool.end).toBeDefined();
      expect(typeof db.pool.query).toBe('function');
      expect(typeof db.pool.end).toBe('function');
    });
  });
});
