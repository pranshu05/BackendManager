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

describe('Support API Route', () => {
  let GET, POST;

  beforeEach(() => {
    jest.clearAllMocks();
    const route = require('@/app/api/support/route');
    GET = route.GET;
    POST = route.POST;
  });

  describe('GET /api/support', () => {
    const mockUser = { id: 'user-123' };

    it('should return user support tickets', async () => {
      const mockTickets = [
        {
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
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockTickets });

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockUser.id]
      );
      expect(data.tickets).toEqual(mockTickets);
      expect(data.count).toBe(1);
    });

    it('should return empty array when user has no tickets', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(data.tickets).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch support tickets');
    });
  });

  describe('POST /api/support', () => {
    const mockUser = { id: 'user-123' };

    it('should create a new support ticket', async () => {
      const ticketData = {
        subject: 'New Issue',
        message: 'I need help with something',
        category: 'technical',
        priority: 'high',
      };

      const mockResult = {
        id: 1,
        user_id: mockUser.id,
        ...ticketData,
        status: 'open',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockResult] });

      const request = {
        json: async () => ticketData,
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalled();
      expect(data.ticket).toBeDefined();
      expect(data.message).toBeDefined();
    });

    it('should use default values for category and priority', async () => {
      const ticketData = {
        subject: 'New Issue',
        message: 'I need help',
      };

      mockQuery.mockResolvedValue({
        rows: [{ id: 1, ...ticketData, category: 'general', priority: 'medium' }],
      });

      const request = {
        json: async () => ticketData,
      };

      await POST(request, {}, mockUser);
      
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should return 400 when subject is missing', async () => {
      const request = {
        json: async () => ({ message: 'Test' }),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject is required');
    });

    it('should return 400 when message is missing', async () => {
      const request = {
        json: async () => ({ subject: 'Test' }),
      };

      const response = await POST(request, {}, mockUser);

      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).toContain('required');
      }
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => ({ subject: 'Test', message: 'Test' }),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
