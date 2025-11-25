/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockPoolQuery = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/db', () => ({
  pool: { query: mockPoolQuery },
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

const { GET } = require('@/app/api/projects/[projectId]/history/route');

describe('Project History API Route', () => {
  const mockProject = { id: 'proj-123' };
  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
  });

  describe('GET - Fetch query history', () => {
    it('should fetch query history with default pagination', async () => {
      const mockHistory = [
        {
          id: 'query-1',
          query_text: 'SELECT * FROM users',
          success: true,
          created_at: '2024-01-01',
        },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: mockHistory })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history',
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.history).toEqual(mockHistory);
      expect(data.total).toBe(1);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should apply status filter for success queries', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?status=success',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('success = true'),
        expect.any(Array)
      );
    });

    it('should apply status filter for error queries', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?status=error',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('success = false'),
        expect.any(Array)
      );
    });

    it('should apply query type filter', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?type=SELECT',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('query_type = $3'),
        expect.arrayContaining(['SELECT'])
      );
    });

    it('should apply date range filter - today', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?dateRange=today',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CAST(NOW() AS DATE)'),
        expect.any(Array)
      );
    });

    it('should apply date range filter - last 7 days', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?dateRange=last7days',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining("interval '7 days'"),
        expect.any(Array)
      );
    });

    it('should filter favorites only', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?favoritesOnly=true',
      };

      await GET(request, mockContext, mockUser, mockProject);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_favorite = true'),
        expect.any(Array)
      );
    });

    it('should respect custom pagination parameters', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const request = {
        url: 'http://localhost/api/projects/proj-123/history?limit=10&offset=20',
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
    });
  });
});
