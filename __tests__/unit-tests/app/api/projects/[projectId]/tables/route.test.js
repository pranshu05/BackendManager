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

    // Additional tests to kill surviving mutants
    it('should handle columns array validation', async () => {
      const request = {
        json: async () => ({
          tableName: 'users',
          columns: 'not an array',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    it('should handle missing tableName', async () => {
      const request = {
        json: async () => ({
          columns: [{ name: 'id', type: 'integer' }],
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    it('should handle missing columns', async () => {
      const request = {
        json: async () => ({
          tableName: 'users',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    it('should include PRIMARY KEY in column definition', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [{ name: 'id', type: 'serial', primaryKey: true }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('PRIMARY KEY')
      );
    });

    it('should include NOT NULL for non-primary key columns', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [
            { name: 'id', type: 'integer', primaryKey: true },
            { name: 'email', type: 'varchar', notNull: true },
          ],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('NOT NULL')
      );
    });

    it('should not add NOT NULL for primary key columns even when notNull is true', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [{ name: 'id', type: 'integer', primaryKey: true, notNull: true }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      const call = mockExecuteQuery.mock.calls[0][1];
      expect(call).toContain('PRIMARY KEY');
      expect(call).not.toContain('NOT NULL');
    });

    it('should include UNIQUE constraint', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [{ name: 'email', type: 'varchar', unique: true }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('UNIQUE')
      );
    });

    it('should include DEFAULT value', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [{ name: 'active', type: 'boolean', defaultValue: 'true' }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('DEFAULT')
      );
    });

    it('should convert column type to uppercase', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [{ name: 'id', type: 'varchar' }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('VARCHAR')
      );
    });

    it('should join column definitions with commas', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
          ],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      const call = mockExecuteQuery.mock.calls[0][1];
      expect(call).toContain(', ');
    });

    it('should log successful query history', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'test',
          columns: [{ name: 'id', type: 'integer' }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          projectId: mockProject.id,
          userId: mockUser.id,
        })
      );
    });

    it('should handle invalid limit parameter', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users&limit=invalid',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM "users";',
        []
      );
    });

    it('should handle zero limit parameter', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users&limit=0',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM "users";',
        []
      );
    });

    it('should handle negative limit parameter', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users&limit=-5',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM "users";',
        []
      );
    });

    it('should return empty columns array when table not found in schema', async () => {
      const mockSchema = [{ name: 'other_table', columns: [] }];
      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users',
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.columns).toEqual([]);
    });

    it('should handle table name match in schema', async () => {
      const mockSchema = [
        { name: 'users', columns: [{ name: 'id', type: 'integer' }] },
      ];
      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/tables?table=users',
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.columns).toEqual([{ name: 'id', type: 'integer' }]);
    });

    it('should create column definition without optional fields', async () => {
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          tableName: 'simple',
          columns: [{ name: 'col', type: 'text' }],
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      const call = mockExecuteQuery.mock.calls[0][1];
      expect(call).toContain('col TEXT');
      expect(call).not.toContain('PRIMARY KEY');
      expect(call).not.toContain('NOT NULL');
      expect(call).not.toContain('UNIQUE');
      expect(call).not.toContain('DEFAULT');
    });
  });
});
