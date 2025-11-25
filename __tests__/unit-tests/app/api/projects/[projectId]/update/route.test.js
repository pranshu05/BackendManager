/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn(() => 'UPDATE');
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

const { POST } = require('@/app/api/projects/[projectId]/update/route');

describe('Project Update API Route', () => {
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

  describe('POST - Update data', () => {
    it('should update a record successfully', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'varchar', nullable: true },
            { name: 'email', type: 'varchar', nullable: true },
          ],
        },
      ];

      const updatedRow = { id: 1, name: 'Updated Name', email: 'updated@test.com' };

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [updatedRow] });

      const request = {
        json: async () => ({
          table: 'users',
          pkColumn: 'id',
          pkValue: 1,
          column: 'name',
          newValue: 'Updated Name',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.message).toBe('Update successful');
      expect(data.row).toEqual(updatedRow);
      expect(mockExecuteQuery).toHaveBeenCalled();
      expect(mockLogQueryHistory).toHaveBeenCalled();
    });

    it('should return error if required fields are missing', async () => {
      const request = {
        json: async () => ({ table: 'users', column: 'name' }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error if project information is missing', async () => {
      const invalidProject = { id: 'proj-123' };

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, invalidProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Project information is missing');
    });

    it('should return error if table not found in schema', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {
        json: async () => ({
          table: 'nonexistent',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Table not found');
    });

    it('should return error if primary key column not found', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'name', type: 'varchar', nullable: true }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Primary key column could not be determined');
    });

    it('should return error if column not found in table', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'varchar', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'nonexistent',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Column not found');
    });

    it('should handle update with oldValue for optimistic locking', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'varchar', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'New Name' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'New Name',
          oldValue: 'Old Name',
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('IS NOT DISTINCT FROM'),
        expect.any(Array)
      );
    });

    it('should handle database update errors', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'email', type: 'varchar', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Unique constraint violation'));

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'email',
          newValue: 'duplicate@test.com',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
