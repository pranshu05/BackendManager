/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
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
      headers: init?.headers || {},
    })),
  },
}));

const { GET } = require('@/app/api/projects/[projectId]/export/route');

describe('Project Export API Route', () => {
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
  });

  describe('GET - Export data', () => {
    it('should export all tables as JSON by default', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      const mockUsersData = [{ id: 1, name: 'User 1' }];
      const mockPostsData = [{ id: 1, title: 'Post 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: mockUsersData })
        .mockResolvedValueOnce({ rows: mockPostsData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.users).toEqual(mockUsersData);
      expect(data.posts).toEqual(mockPostsData);
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
    });

    it('should export specific table when table parameter is provided', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1, name: 'User 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.users).toEqual(mockData);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM "users"'
      );
    });

    it('should return error for non-existent table', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        nextUrl: { searchParams: new URLSearchParams('table=nonexistent') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not found');
    });

    it('should handle database query errors', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
