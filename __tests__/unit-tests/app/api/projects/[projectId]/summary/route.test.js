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

    it('should verify empty DB returns specific quickStats values', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.quickStats.totalTables).toBe(0);
      expect(data.summary.quickStats.totalColumns).toBe(0);
      expect(data.summary.quickStats.totalRelationships).toBe(0);
      expect(data.summary.quickStats.estimatedRows).toBe('0 records');
      expect(data.summary.quickStats.estimatedRows).not.toBe('');
    });

    it('should verify empty DB returns specific description and techSpecs', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.description).toContain('This database is currently empty');
      expect(data.summary.techSpecs).toBe('PostgreSQL database. No schema defined.');
      expect(data.summary.techSpecs).not.toBe('');
    });

    it('should execute COUNT query for each table', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id', type: 'integer' }] },
        { name: 'posts', columns: [{ name: 'id', type: 'integer' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '10' }] });

      await GET({}, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT COUNT(*) as count FROM "users"'
      );
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT COUNT(*) as count FROM "posts"'
      );
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle COUNT query errors gracefully', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id', type: 'integer' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Table access denied'));

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      // When COUNT fails, totalRows should be 0, resulting in schema-only response
      expect(data.summary.quickStats.estimatedRows).toBe('0 records');
      expect(data.summary.quickStats.totalTables).toBe(1);
      expect(data.summary.description).toContain('no data yet');
    });

    it('should calculate totalRows correctly with addition', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id', type: 'integer' }] },
        { name: 'posts', columns: [{ name: 'id', type: 'integer' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] });

      const mockSummary = {
        quickStats: {
          totalTables: 2,
          totalColumns: 2,
          totalRelationships: 0,
          estimatedRows: '30 records',
        },
        description: 'Database with user and post data',
        techSpecs: 'PostgreSQL with 2 tables',
      };

      mockGenerateDatabaseSummary.mockResolvedValue(mockSummary);

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      // Verify totalRows = 10 + 20 = 30 triggered AI summary (not schema-only)
      expect(mockGenerateDatabaseSummary).toHaveBeenCalled();
      expect(data.summary).toEqual(mockSummary);
      expect(data.summary.description).toBe('Database with user and post data');
    });

    it('should calculate totalColumns using reduce with addition', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id' }, { name: 'name' }] },
        { name: 'posts', columns: [{ name: 'id' }, { name: 'title' }, { name: 'body' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.quickStats.totalColumns).toBe(5);
    });

    it('should calculate totalRelationships using flatMap and filter', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
          ],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'user_id', foreign_table: 'users' },
            { name: 'title', type: 'varchar' },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.quickStats.totalRelationships).toBe(1);
    });

    it('should include table names in description using slice and map', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id' }] },
        { name: 'posts', columns: [{ name: 'id' }] },
        { name: 'comments', columns: [{ name: 'id' }] },
        { name: 'tags', columns: [{ name: 'id' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.description).toContain('users, posts, comments');
      expect(data.summary.description).not.toContain('tags');
    });

    it('should join table names with comma separator', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id' }] },
        { name: 'posts', columns: [{ name: 'id' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.description).toContain('users, posts');
      expect(data.summary.description).toMatch(/users,\s+posts/);
    });

    it('should include techSpecs for schema-only DB', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id' }] },
        { name: 'posts', columns: [{ name: 'id' }] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.summary.techSpecs).toBe(
        'PostgreSQL database with 2 empty tables. Schema defined, awaiting data.'
      );
      expect(data.summary.techSpecs).not.toBe('');
    });

    it('should log error with proper message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');
      mockGetDatabaseSchema.mockRejectedValue(testError);

      await GET({}, mockContext, mockUser, mockProject);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Summary error:', testError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), testError);

      consoleErrorSpy.mockRestore();
    });
  });
});
