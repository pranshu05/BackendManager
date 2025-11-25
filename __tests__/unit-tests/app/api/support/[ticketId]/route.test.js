/**
 * @jest-environment node
 */

// Mock dependencies
const mockQuery = jest.fn();
const mockWithAuth = jest.fn((handler) => handler);

jest.mock('@/lib/db', () => ({
  pool: {
    query: (...args) => mockQuery(...args),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  withAuth: (...args) => mockWithAuth(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, options = {}) => ({
      json: async () => data,
      status: options.status || 200,
      ...options,
    }),
  },
}));

describe('Support Ticket Detail API Route', () => {
  let GET, DELETE;

  beforeEach(() => {
    jest.clearAllMocks();
    const route = require('@/app/api/support/[ticketId]/route');
    GET = route.GET;
    DELETE = route.DELETE;
  });

  describe('GET /api/support/[ticketId]', () => {
    const mockUser = { id: 'user-123' };

    it('should return ticket when found and belongs to user', async () => {
      const mockTicket = {
        id: 1,
        subject: 'Test Issue',
        message: 'This is a test',
        category: 'general',
        status: 'open',
        priority: 'medium',
        created_at: new Date(),
        updated_at: new Date(),
        resolved_at: null,
        admin_notes: null,
      };

      mockQuery.mockResolvedValue({ rows: [mockTicket] });

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await GET({}, context, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['1', mockUser.id]
      );
      expect(data.ticket).toEqual(mockTicket);
    });

    it('should return 404 when ticket not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const context = { params: Promise.resolve({ ticketId: '999' }) };
      const response = await GET({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Support ticket not found');
    });

    it('should return 404 when ticket belongs to another user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await GET({}, context, mockUser);

      expect(response.status).toBe(404);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await GET({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch support ticket');
    });
  });

  describe('DELETE /api/support/[ticketId]', () => {
    const mockUser = { id: 'user-123' };

    it('should delete ticket when it exists and belongs to user', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'open', user_id: mockUser.id }],
        }) // Check ticket
        .mockResolvedValueOnce({ rows: [] }); // Delete ticket

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(data.message).toBeDefined();
    });

    it('should return 404 when ticket not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const context = { params: Promise.resolve({ ticketId: '999' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should prevent deletion of resolved tickets', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, status: 'solved', user_id: mockUser.id }],
      });

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Cannot delete solved tickets');
    });

    it('should allow deletion of active tickets', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'active', user_id: mockUser.id }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Support ticket deleted successfully');
    });

    it('should allow deletion of inactive tickets', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'inactive', user_id: mockUser.id }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Support ticket deleted successfully');
    });

    it('should allow deletion of in_progress tickets', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'in_progress', user_id: mockUser.id }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Support ticket deleted successfully');
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const context = { params: Promise.resolve({ ticketId: '1' }) };
      const response = await DELETE({}, context, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete support ticket');
    });
  });
});
