/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn(() => 'CREATE INDEX');
const mockCreateTimer = jest.fn(() => ({ elapsed: () => 100 }));
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();
const mockGenerateOptimizationSuggestions = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
  logQueryHistory: mockLogQueryHistory,
  detectQueryType: mockDetectQueryType,
  createTimer: mockCreateTimer,
}));

jest.mock('@/lib/db', () => ({
  executeQuery: mockExecuteQuery,
  getDatabaseSchema: mockGetDatabaseSchema,
}));

jest.mock('@/lib/ai', () => ({
  generateOptimizationSuggestions: mockGenerateOptimizationSuggestions,
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

const { GET, POST } = require('@/app/api/projects/[projectId]/optimization/route');

describe('Project Optimization API Route', () => {
  const mockProject = {
    id: 'proj-123',
    connection_string: 'postgresql://localhost/test',
  };

  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
  });

  describe('GET - Fetch optimization suggestions', () => {
    it('should return AI-generated optimization suggestions', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'email', type: 'varchar' },
          ],
        },
      ];

      const mockSuggestions = {
        totalSuggestions: 3,
        queryPerformance: ['Use prepared statements'],
        missingIndexes: [{ table: 'users', column: 'email' }],
        schemaImprovements: ['Add foreign key constraints'],
        potentialIssues: [],
      };

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockGenerateOptimizationSuggestions.mockResolvedValue(mockSuggestions);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.source).toBe('ai');
      expect(data.totalSuggestions).toBe(3);
      expect(data.missingIndexes).toBeDefined();
      expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
    });

    it('should handle empty database gracefully', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.totalSuggestions).toBe(0);
      expect(data.warning).toContain('No tables found');
    });

    it('should handle schema fetch errors', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Connection failed'));

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate optimization suggestions');
    });
  });

  describe('POST - Apply optimization', () => {
    it('should apply optimization SQL successfully', async () => {
      const mockResult = { rows: [] };
      mockExecuteQuery.mockResolvedValue(mockResult);

      const request = {
        json: async () => ({
          action: 'create_index',
          sql: 'CREATE INDEX idx_users_email ON users(email)',
          description: 'Add index on users.email',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.action).toBe('create_index');
      expect(data.message).toBe('Optimization applied successfully');
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'CREATE INDEX idx_users_email ON users(email)'
      );
      expect(mockLogQueryHistory).toHaveBeenCalled();
    });

    it('should return error if action or sql is missing', async () => {
      const request = {
        json: async () => ({ action: 'create_index' }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing action or SQL statement');
    });

    it('should handle SQL execution errors', async () => {
      mockExecuteQuery.mockRejectedValue(new Error('Index already exists'));

      const request = {
        json: async () => ({
          action: 'create_index',
          sql: 'CREATE INDEX idx_users_email ON users(email)',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to apply optimization');
      expect(data.details).toBe('Index already exists');
      expect(mockLogQueryHistory).toHaveBeenCalled();
    });
  });
});
