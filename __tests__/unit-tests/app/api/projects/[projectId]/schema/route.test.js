/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockGetDatabaseSchema = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/db', () => ({
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

const { GET } = require('@/app/api/projects/[projectId]/schema/route');

describe('Project Schema API Route', () => {
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

  describe('GET - Fetch database schema', () => {
    it('should return complete database schema', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'email', type: 'varchar', nullable: false },
          ],
          foreign_keys: [],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'user_id', type: 'integer', foreign_table: 'users' },
            { name: 'title', type: 'varchar', nullable: false },
            { name: 'content', type: 'text', nullable: true },
          ],
          foreign_keys: [
            { column: 'user_id', foreign_table: 'users', foreign_column: 'id' },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.schema).toEqual(mockSchema);
      expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
    });

    it('should return empty schema for database with no tables', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.schema).toEqual([]);
    });

    it('should handle schema fetch errors', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Connection failed'));

      const request = {};

      try {
        await GET(request, mockContext, mockUser, mockProject);
      } catch (error) {
        expect(error.message).toBe('Connection failed');
      }
    });
  });
});
