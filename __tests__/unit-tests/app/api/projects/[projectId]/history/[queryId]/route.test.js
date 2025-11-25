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

const { PUT } = require('@/app/api/projects/[projectId]/history/[queryId]/route');

describe('Project Query History Item API Route', () => {
  const mockProject = { id: 'proj-123' };
  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123', queryId: 'query-1' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
  });

  describe('PUT - Update query history item', () => {
    it('should update natural language input successfully', async () => {
      const updatedItem = {
        id: 'query-1',
        natural_language_input: 'Updated title',
        is_favorite: false,
        query_text: 'SELECT * FROM users',
        success: true,
        created_at: '2024-01-01',
        execution_time_ms: 100,
        error_message: null,
        query_type: 'SELECT',
      };

      mockPoolQuery.mockResolvedValue({ rows: [updatedItem] });

      const request = {
        json: async () => ({
          naturalLanguageInput: 'Updated title',
        }),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toBe('Query item updated successfully');
      expect(data.updatedItem).toEqual(updatedItem);
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE query_history'),
        expect.arrayContaining(['Updated title', 'query-1', 'proj-123', 'user-123'])
      );
    });

    it('should update favorite status successfully', async () => {
      const updatedItem = {
        id: 'query-1',
        is_favorite: true,
        natural_language_input: 'Test query',
        query_text: 'SELECT * FROM users',
        success: true,
      };

      mockPoolQuery.mockResolvedValue({ rows: [updatedItem] });

      const request = {
        json: async () => ({
          is_favorite: true,
        }),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.updatedItem.is_favorite).toBe(true);
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_favorite = $1'),
        expect.arrayContaining([true, 'query-1', 'proj-123', 'user-123'])
      );
    });

    it('should update both title and favorite status', async () => {
      const updatedItem = {
        id: 'query-1',
        natural_language_input: 'Updated title',
        is_favorite: true,
        query_text: 'SELECT * FROM users',
      };

      mockPoolQuery.mockResolvedValue({ rows: [updatedItem] });

      const request = {
        json: async () => ({
          naturalLanguageInput: 'Updated title',
          is_favorite: true,
        }),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('natural_language_input = $1'),
        expect.arrayContaining(['Updated title', true, 'query-1', 'proj-123', 'user-123'])
      );
    });

    it('should return error if no fields provided', async () => {
      const request = {
        json: async () => ({}),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('should return error if query item not found', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          naturalLanguageInput: 'Updated title',
        }),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return error if user does not own the query item', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          naturalLanguageInput: 'Updated title',
        }),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not allowed to edit');
    });

    it('should handle database errors', async () => {
      mockPoolQuery.mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => ({
          naturalLanguageInput: 'Updated title',
        }),
      };

      const response = await PUT(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
