/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockWithRateLimit = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn();
const mockCreateTimer = jest.fn(() => ({ elapsed: () => 100 }));
const mockExecuteQuery = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
  logQueryHistory: mockLogQueryHistory,
  detectQueryType: mockDetectQueryType,
  createTimer: mockCreateTimer,
}));

jest.mock('@/lib/rate-limitter', () => ({
  withRateLimit: mockWithRateLimit,
}));

jest.mock('@/lib/db', () => ({
  executeQuery: mockExecuteQuery,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      body,
    })),
  },
}));

const { POST } = require('@/app/api/projects/[projectId]/query/route');

describe('Project Query API Route', () => {
  const mockProject = {
    id: 'proj-123',
    connection_string: 'postgresql://localhost/test',
  };

  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
    mockWithRateLimit.mockImplementation((handler) => handler);
    mockDetectQueryType.mockReturnValue('SELECT');
  });

  describe('POST - Execute SQL query', () => {
    it('should execute a SELECT query successfully', async () => {
      const mockRows = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];

      mockExecuteQuery.mockResolvedValue({ rows: mockRows });

      const request = {
        json: async () => ({
          query: 'SELECT * FROM users',
          naturalLanguageInput: 'Get all users',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRows);
      expect(data.executionTime).toBeDefined();
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM users'
      );
      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProject.id,
          userId: mockUser.id,
          success: true,
        })
      );
    });

    it('should return error if query is missing', async () => {
      const request = {
        json: async () => ({}),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('SQL query is required');
    });

    it('should block dangerous DROP operations', async () => {
      const request = {
        json: async () => ({
          query: 'DROP TABLE users',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('dangerous');
      expect(mockExecuteQuery).not.toHaveBeenCalled();
    });

    it('should block dangerous DELETE operations', async () => {
      const request = {
        json: async () => ({
          query: 'DELETE FROM users WHERE 1=1',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('dangerous');
    });

    it('should block dangerous TRUNCATE operations', async () => {
      const request = {
        json: async () => ({
          query: 'TRUNCATE TABLE users',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('dangerous');
    });

    it('should allow CREATE TABLE operations', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          query: 'CREATE TABLE test (id INTEGER)',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalled();
    });

    it('should allow CREATE INDEX operations', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          query: 'CREATE INDEX idx_users_email ON users(email)',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalled();
    });

    it('should handle query execution errors', async () => {
      mockExecuteQuery.mockRejectedValue(new Error('Syntax error'));

      const request = {
        json: async () => ({
          query: 'SELECT * FROM nonexistent',
          naturalLanguageInput: 'Get data',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Syntax error');
      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Syntax error',
        })
      );
    });

    it('should execute INSERT queries successfully', async () => {
      mockDetectQueryType.mockReturnValue('INSERT');
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'New User' }] });

      const request = {
        json: async () => ({
          query: "INSERT INTO users (name) VALUES ('New User') RETURNING *",
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should execute UPDATE queries successfully', async () => {
      mockDetectQueryType.mockReturnValue('UPDATE');
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Updated' }] });

      const request = {
        json: async () => ({
          query: "UPDATE users SET name = 'Updated' WHERE id = 1 RETURNING *",
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should use request.body.query fallback when error logging occurs', async () => {
      const request = {
        json: async () => ({
          query: 'SELECT * FROM test',
        }),
        body: {
          query: 'SELECT * FROM test',
          naturalLanguageInput: 'test input',
        },
      };

      mockExecuteQuery.mockRejectedValue(new Error('Execution failed'));

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          queryText: 'SELECT * FROM test',
          success: false,
        })
      );
    });

    it('should handle missing request.body gracefully in error logging', async () => {
      const request = {
        json: async () => ({
          query: 'SELECT 1',
        }),
        body: undefined,
      };

      mockExecuteQuery.mockRejectedValue(new Error('Error'));

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          queryText: '',
          success: false,
        })
      );
    });

    it('should pass naturalLanguageInput from request.body in error case', async () => {
      const request = {
        json: async () => ({
          query: 'SELECT test',
        }),
        body: {
          query: 'SELECT test',
          naturalLanguageInput: 'find test data',
        },
      };

      mockExecuteQuery.mockRejectedValue(new Error('Failed'));

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          naturalLanguageInput: 'find test data',
        })
      );
    });

    it('should call detectQueryType with request.body.query when logging errors', async () => {
      const request = {
        json: async () => ({
          query: 'INSERT INTO users VALUES (1)',
        }),
        body: {
          query: 'INSERT INTO users VALUES (1)',
        },
      };

      mockExecuteQuery.mockRejectedValue(new Error('Insert failed'));
      mockDetectQueryType.mockReturnValue('INSERT');

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockDetectQueryType).toHaveBeenCalledWith('INSERT INTO users VALUES (1)');
      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: 'INSERT',
        })
      );
    });

    it('should call detectQueryType with empty string when request.body.query is missing', async () => {
      const request = {
        json: async () => ({
          query: 'SELECT 1',
        }),
        body: {},
      };

      mockExecuteQuery.mockRejectedValue(new Error('Error'));
      mockDetectQueryType.mockClear();

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockDetectQueryType).toHaveBeenCalledWith('');
    });

    it('should verify queryText uses empty string fallback when body.query is undefined', async () => {
      const request = {
        json: async () => ({
          query: 'SELECT COUNT(*)',
        }),
        body: {
          naturalLanguageInput: 'count records',
        },
      };

      mockExecuteQuery.mockRejectedValue(new Error('Failed'));

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          queryText: '',
        })
      );
    });

    it('should use actual request.body.query value when present in error logging', async () => {
      const queryText = 'SELECT * FROM logs WHERE date < NOW()';
      const request = {
        json: async () => ({
          query: queryText,
        }),
        body: {
          query: queryText,
        },
      };

      mockExecuteQuery.mockRejectedValue(new Error('Permission denied'));

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          queryText: queryText,
        })
      );
    });

    it('should include query text in successful response data', async () => {
      const testQuery = 'SELECT id, email FROM users LIMIT 5';
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({
          query: testQuery,
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.query).toBe(testQuery);
      expect(data.success).toBe(true);
    });

    it('should execute INSERT statement successfully', async () => {
      mockDetectQueryType.mockReturnValue('INSERT');
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 5 }] });

      const request = {
        json: async () => ({
          query: "INSERT INTO products (name, price) VALUES ('Widget', 9.99) RETURNING *",
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual([{ id: 5 }]);
    });

    it('should execute UPDATE statement with RETURNING clause', async () => {
      mockDetectQueryType.mockReturnValue('UPDATE');
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, status: 'active' }] });

      const request = {
        json: async () => ({
          query: "UPDATE users SET status = 'active' WHERE id = 1 RETURNING *",
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.query).toContain('UPDATE');
    });

    it('should allow CREATE TABLE statement to execute', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          query: 'CREATE TABLE employees (id SERIAL PRIMARY KEY, name TEXT NOT NULL)',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'CREATE TABLE employees (id SERIAL PRIMARY KEY, name TEXT NOT NULL)'
      );
    });

    it('should allow CREATE INDEX statement to execute', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          query: 'CREATE INDEX idx_user_email ON users (email)',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalled();
    });

    it('should block DELETE statement', async () => {
      const request = {
        json: async () => ({
          query: 'DELETE FROM users WHERE inactive = true',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('dangerous');
      expect(mockExecuteQuery).not.toHaveBeenCalled();
    });

    it('should block TRUNCATE statement', async () => {
      const request = {
        json: async () => ({
          query: 'TRUNCATE TABLE sessions',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('dangerous');
    });

    it('should return execution time in all successful responses', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });
      mockCreateTimer.mockReturnValue({ elapsed: () => 250 });

      const request = {
        json: async () => ({
          query: 'SELECT COUNT(*) FROM orders',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.executionTime).toBe(250);
    });

    it('should return execution time in all error responses', async () => {
      mockExecuteQuery.mockRejectedValue(new Error('Timeout'));
      mockCreateTimer.mockReturnValue({ elapsed: () => 5000 });

      const request = {
        json: async () => ({
          query: 'SELECT * FROM huge_table',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.executionTime).toBe(5000);
      expect(data.success).toBe(false);
    });
  });
});
