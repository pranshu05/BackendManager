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
  });
});
