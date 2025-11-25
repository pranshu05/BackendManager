/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockWithRateLimit = jest.fn((handler) => handler);
const mockGetDatabaseSchema = jest.fn();
const mockExecuteQuery = jest.fn();
const mockGenerateDatabaseSummary = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/rate-limitter', () => ({
  withRateLimit: mockWithRateLimit,
}));

jest.mock('@/lib/db', () => ({
  getDatabaseSchema: mockGetDatabaseSchema,
  executeQuery: mockExecuteQuery,
}));

jest.mock('@/lib/ai', () => ({
  generateDatabaseSummary: mockGenerateDatabaseSummary,
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

const { GET } = require('@/app/api/projects/[projectId]/summary/route');

describe('Project Summary API Route', () => {
  const mockProject = {
    id: 'proj-123',
    connection_string: 'postgresql://localhost/test',
    project_name: 'Test Project',
  };

  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
    mockWithRateLimit.mockImplementation((handler) => handler);
  });

  describe('GET - Generate database summary', () => {
    it('should return empty database message when no tables exist', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.quickStats.totalTables).toBe(0);
      expect(data.summary.description).toContain('empty');
    });

    it('should return schema-only message when tables exist but no data', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'id', type: 'integer' }],
        },
        {
          name: 'posts',
          columns: [{ name: 'id', type: 'integer' }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.quickStats.totalTables).toBe(2);
      expect(data.summary.quickStats.estimatedRows).toBe('0 records');
      expect(data.summary.description).toContain('no data yet');
    });

    it('should generate AI summary when database has data', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
          ],
        },
      ];

      const mockSummary = {
        quickStats: {
          totalTables: 1,
          totalColumns: 2,
          totalRelationships: 0,
          estimatedRows: '50 records',
        },
        description: 'This database contains user information.',
        techSpecs: 'PostgreSQL database with 1 table.',
      };

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '50' }] });
      mockGenerateDatabaseSummary.mockResolvedValue(mockSummary);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary).toEqual(mockSummary);
      expect(mockGenerateDatabaseSummary).toHaveBeenCalledWith(
        mockSchema,
        { users: 50 },
        mockProject.project_name
      );
    });

    it('should handle errors during summary generation', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Connection failed'));

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate summary');
    });
  });
});
