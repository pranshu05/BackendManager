/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn(() => 'INSERT');
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

const { POST } = require('@/app/api/projects/[projectId]/insert/route');

describe('Project Insert API Route', () => {
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

  describe('POST - Insert data', () => {
    it('should insert data into a table successfully', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'email', type: 'varchar', nullable: false },
          ],
        },
      ];

      const insertedRow = { id: 1, name: 'Test User', email: 'test@test.com' };

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [insertedRow] });

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test User', email: 'test@test.com' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.row).toEqual(insertedRow);
      expect(data.table).toBe('users');
      expect(mockExecuteQuery).toHaveBeenCalled();
      expect(mockLogQueryHistory).toHaveBeenCalled();
    });

    it('should return error if table or insertData is missing', async () => {
      const request = {
        json: async () => ({ table: 'users' }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error if table metadata not found', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {
        json: async () => ({
          table: 'nonexistent',
          insertData: { name: 'Test' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should handle date fields correctly', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'event_date', type: 'timestamp', nullable: false },
            { name: 'title', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ id: 1, event_date: '2024-01-01', title: 'Event' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_date: '2024-01-01', title: 'Event' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.row).toBeDefined();
    });

    it('should return error for missing required columns', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'email', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test User' }, // Missing required email
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required columns');
    });

    it('should handle database insertion errors', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'name', type: 'varchar', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Duplicate key violation'));

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test User' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
