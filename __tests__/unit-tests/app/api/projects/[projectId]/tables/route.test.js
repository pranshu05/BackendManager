/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn(() => 'CREATE');
const mockCreateTimer = jest.fn(() => ({ elapsed: () => 100 }));
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();

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

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      body,
    })),
  },
}));

const { POST, GET } = require('@/app/api/projects/[projectId]/tables/route');

describe('Project Tables API Route', () => {
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

  describe('POST - Create table', () => {
    it('should create a new table successfully', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'users',
          columns: [
            { name: 'id', type: 'integer', primaryKey: true },
            { name: 'name', type: 'varchar', notNull: true },
            { name: 'email', type: 'varchar', unique: true },
          ],
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.message).toContain('created successfully');
      expect(data.tableName).toBe('users');
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('CREATE TABLE users')
      );
      expect(mockLogQueryHistory).toHaveBeenCalled();
    });

    it('should return error if tableName or columns are missing', async () => {
      const request = {
        json: async () => ({ tableName: 'users' }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should handle table creation errors', async () => {
      mockExecuteQuery.mockRejectedValue(new Error('Table already exists'));

      const request = {
        json: async () => ({
          tableName: 'users',
          columns: [{ name: 'id', type: 'integer' }],
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Failed to create table');
    });
  });

  describe('GET - Fetch table information', () => {
    it('should return all tables when no table parameter is provided', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables',
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.tables).toEqual(mockSchema);
    });

    it('should return specific table data with rows', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
          ],
        },
      ];

      const mockRows = [{ id: 1, name: 'User 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockRows });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users',
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.table).toBe('users');
      expect(data.rows).toEqual(mockRows);
      expect(data.columns).toBeDefined();
    });

    it('should respect limit parameter when fetching table data', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users&limit=10',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM "users" LIMIT $1;',
        [10]
      );
    });
  });
});
