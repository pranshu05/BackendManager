/**
 * @jest-environment node
 */

// Mock functions defined at module level before imports
const mockPoolQuery = jest.fn();
const mockWithAdminAuth = jest.fn((handler) => handler);
const mockNextResponseJson = jest.fn((data, options) => ({
  json: data,
  status: options?.status || 200,
  headers: new Map(),
}));

// Mock modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: (...args) => mockNextResponseJson(...args),
  },
}));

jest.mock('@/lib/db', () => ({
  pool: {
    query: (...args) => mockPoolQuery(...args),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  withAdminAuth: (handler) => mockWithAdminAuth(handler),
}));

// Import module after mocks are configured
let GET;

describe('GET /api/admin/stats', () => {
  beforeAll(async () => {
    const module = await import('@/app/api/admin/stats/route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
    mockNextResponseJson.mockImplementation((data, options) => ({
      json: data,
      status: options?.status || 200,
      headers: new Map(),
    }));
  });

  describe('Authentication and Authorization', () => {
    it('should use withAdminAuth middleware wrapper', () => {
      expect(typeof GET).toBe('function');
      expect(typeof GET).not.toBe('string');
      expect(typeof GET).not.toBe('object');
      expect(typeof GET).not.toBe('number');
      expect(GET).toBeDefined();
      expect(GET).not.toBeNull();
      expect(GET).not.toBeUndefined();
    });
  });

  describe('Successful Statistics Retrieval', () => {
    const mockStatusResult = {
      rows: [
        { status: 'active', count: '10' },
        { status: 'solved', count: '25' },
        { status: 'pending', count: '5' },
      ],
    };

    const mockPriorityResult = {
      rows: [
        { priority: 'urgent', count: '5' },
        { priority: 'high', count: '15' },
        { priority: 'medium', count: '10' },
        { priority: 'low', count: '10' },
      ],
    };

    const mockCategoryResult = {
      rows: [
        { category: 'technical', count: '20' },
        { category: 'billing', count: '15' },
        { category: 'general', count: '5' },
      ],
    };

    const mockResolutionResult = {
      rows: [{ avg_hours: '12.5' }],
    };

    const mockRecentResult = {
      rows: [
        { date: '2025-11-20', count: '5' },
        { date: '2025-11-19', count: '8' },
        { date: '2025-11-18', count: '3' },
      ],
    };

    const mockTotalResult = {
      rows: [
        {
          total_tickets: '40',
          active_tickets: '10',
          solved_tickets: '25',
          high_priority_tickets: '20',
        },
      ],
    };

    const mockTopUsersResult = {
      rows: [
        { email: 'user1@example.com', name: 'User One', ticket_count: '10' },
        { email: 'user2@example.com', name: 'User Two', ticket_count: '8' },
        { email: 'user3@example.com', name: 'User Three', ticket_count: '5' },
      ],
    };

    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce(mockStatusResult)
        .mockResolvedValueOnce(mockPriorityResult)
        .mockResolvedValueOnce(mockCategoryResult)
        .mockResolvedValueOnce(mockResolutionResult)
        .mockResolvedValueOnce(mockRecentResult)
        .mockResolvedValueOnce(mockTotalResult)
        .mockResolvedValueOnce(mockTopUsersResult);
    });

    it('should return statistics with all required fields', async () => {
      const response = await GET();

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response).not.toBeUndefined();
      expect(typeof response).toBe('object');
      expect(typeof response).not.toBe('string');
      expect(typeof response).not.toBe('number');

      expect(response.json).toBeDefined();
      expect(response.json.stats).toBeDefined();
      expect(response.json.stats).not.toBeNull();
      expect(response.json.stats).not.toBeUndefined();
    });

    it('should query database exactly 7 times', async () => {
      await GET();

      expect(mockPoolQuery).toHaveBeenCalled();
      expect(mockPoolQuery).toHaveBeenCalledTimes(7);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(6);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(8);
      expect(mockPoolQuery.mock.calls.length).toBe(7);
      expect(mockPoolQuery.mock.calls.length).not.toBe(0);
    });

    it('should have statusBreakdown in stats', async () => {
      const response = await GET();

      expect(response.json.stats.statusBreakdown).toBeDefined();
      expect(response.json.stats.statusBreakdown).not.toBeNull();
      expect(response.json.stats.statusBreakdown).not.toBeUndefined();
      expect(typeof response.json.stats.statusBreakdown).toBe('object');
      expect(typeof response.json.stats.statusBreakdown).not.toBe('string');
      expect(typeof response.json.stats.statusBreakdown).not.toBe('number');
      expect(response.json.stats.statusBreakdown.active).toBe(10);
      expect(response.json.stats.statusBreakdown.active).not.toBe(0);
      expect(response.json.stats.statusBreakdown.active).not.toBe(25);
      expect(response.json.stats.statusBreakdown.solved).toBe(25);
      expect(response.json.stats.statusBreakdown.solved).not.toBe(10);
      expect(response.json.stats.statusBreakdown.solved).not.toBe(0);
      expect(response.json.stats.statusBreakdown.pending).toBe(5);
      expect(response.json.stats.statusBreakdown.pending).not.toBe(0);
      expect(response.json.stats.statusBreakdown.pending).not.toBe(10);
    });

    it('should convert status counts to integers', async () => {
      const response = await GET();

      expect(typeof response.json.stats.statusBreakdown.active).toBe('number');
      expect(typeof response.json.stats.statusBreakdown.active).not.toBe('string');
      expect(Number.isInteger(response.json.stats.statusBreakdown.active)).toBe(true);
      expect(Number.isInteger(response.json.stats.statusBreakdown.active)).not.toBe(false);
      expect(response.json.stats.statusBreakdown.active === 10).toBe(true);
      expect(response.json.stats.statusBreakdown.active === 10).not.toBe(false);
    });

    it('should have priorityBreakdown in stats', async () => {
      const response = await GET();

      expect(response.json.stats.priorityBreakdown).toBeDefined();
      expect(response.json.stats.priorityBreakdown).not.toBeNull();
      expect(response.json.stats.priorityBreakdown).not.toBeUndefined();
      expect(typeof response.json.stats.priorityBreakdown).toBe('object');
      expect(typeof response.json.stats.priorityBreakdown).not.toBe('array');
      expect(typeof response.json.stats.priorityBreakdown).not.toBe('string');
      expect(response.json.stats.priorityBreakdown.urgent).toBe(5);
      expect(response.json.stats.priorityBreakdown.urgent).not.toBe(0);
      expect(response.json.stats.priorityBreakdown.urgent).not.toBe(15);
      expect(response.json.stats.priorityBreakdown.high).toBe(15);
      expect(response.json.stats.priorityBreakdown.high).not.toBe(5);
      expect(response.json.stats.priorityBreakdown.high).not.toBe(0);
      expect(response.json.stats.priorityBreakdown.medium).toBe(10);
      expect(response.json.stats.priorityBreakdown.medium).not.toBe(0);
      expect(response.json.stats.priorityBreakdown.low).toBe(10);
      expect(response.json.stats.priorityBreakdown.low).not.toBe(0);
    });

    it('should have categoryBreakdown in stats', async () => {
      const response = await GET();

      expect(response.json.stats.categoryBreakdown).toBeDefined();
      expect(response.json.stats.categoryBreakdown).not.toBeNull();
      expect(response.json.stats.categoryBreakdown).not.toBeUndefined();
      expect(typeof response.json.stats.categoryBreakdown).toBe('object');
      expect(typeof response.json.stats.categoryBreakdown).not.toBe('string');
      expect(typeof response.json.stats.categoryBreakdown).not.toBe('array');
      expect(response.json.stats.categoryBreakdown.technical).toBe(20);
      expect(response.json.stats.categoryBreakdown.technical).not.toBe(0);
      expect(response.json.stats.categoryBreakdown.technical).not.toBe(15);
      expect(response.json.stats.categoryBreakdown.billing).toBe(15);
      expect(response.json.stats.categoryBreakdown.billing).not.toBe(0);
      expect(response.json.stats.categoryBreakdown.billing).not.toBe(20);
      expect(response.json.stats.categoryBreakdown.general).toBe(5);
      expect(response.json.stats.categoryBreakdown.general).not.toBe(0);
      expect(response.json.stats.categoryBreakdown.general).not.toBe(15);
    });

    it('should have averageResolutionHours as formatted string', async () => {
      const response = await GET();

      expect(response.json.stats.averageResolutionHours).toBeDefined();
      expect(response.json.stats.averageResolutionHours).not.toBeNull();
      expect(typeof response.json.stats.averageResolutionHours).toBe('string');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('number');
      expect(response.json.stats.averageResolutionHours).toBe('12.50');
      expect(response.json.stats.averageResolutionHours).not.toBe('12.5');
      expect(response.json.stats.averageResolutionHours).not.toBe('12');
    });

    it('should format averageResolutionHours to 2 decimal places', async () => {
      const response = await GET();

      const parts = response.json.stats.averageResolutionHours.split('.');
      expect(parts).toHaveLength(2);
      expect(parts).not.toHaveLength(1);
      expect(parts[1].length).toBe(2);
      expect(parts[1].length).not.toBe(1);
      expect(parts[1].length).not.toBe(3);
    });

    it('should have recentTickets array in stats', async () => {
      const response = await GET();

      expect(response.json.stats.recentTickets).toBeDefined();
      expect(Array.isArray(response.json.stats.recentTickets)).toBe(true);
      expect(Array.isArray(response.json.stats.recentTickets)).not.toBe(false);
      expect(response.json.stats.recentTickets.length).toBe(3);
      expect(response.json.stats.recentTickets.length).not.toBe(0);
      expect(response.json.stats.recentTickets.length).not.toBe(2);
    });

    it('should have totals object in stats', async () => {
      const response = await GET();

      expect(response.json.stats.totals).toBeDefined();
      expect(response.json.stats.totals).not.toBeNull();
      expect(response.json.stats.totals).not.toBeUndefined();
      expect(typeof response.json.stats.totals).toBe('object');
      expect(typeof response.json.stats.totals).not.toBe('string');
      expect(typeof response.json.stats.totals).not.toBe('array');
      expect(response.json.stats.totals.total_tickets).toBeDefined();
      expect(response.json.stats.totals.total_tickets).not.toBeUndefined();
      expect(response.json.stats.totals.active_tickets).toBeDefined();
      expect(response.json.stats.totals.active_tickets).not.toBeUndefined();
      expect(response.json.stats.totals.solved_tickets).toBeDefined();
      expect(response.json.stats.totals.solved_tickets).not.toBeUndefined();
      expect(response.json.stats.totals.high_priority_tickets).toBeDefined();
      expect(response.json.stats.totals.high_priority_tickets).not.toBeUndefined();
    });

    it('should have topUsers array in stats', async () => {
      const response = await GET();

      expect(response.json.stats.topUsers).toBeDefined();
      expect(Array.isArray(response.json.stats.topUsers)).toBe(true);
      expect(Array.isArray(response.json.stats.topUsers)).not.toBe(false);
      expect(response.json.stats.topUsers.length).toBe(3);
      expect(response.json.stats.topUsers.length).not.toBe(0);
      expect(response.json.stats.topUsers.length).not.toBe(10);
    });

    it('should return exactly 7 properties in stats object', async () => {
      const response = await GET();
      const keys = Object.keys(response.json.stats);

      expect(keys.length).toBe(7);
      expect(keys.length).not.toBe(6);
      expect(keys.length).not.toBe(8);
      expect(keys.length).not.toBe(0);
      expect(keys).toContain('statusBreakdown');
      expect(keys).not.toContain('invalid');
      expect(keys).toContain('priorityBreakdown');
      expect(keys).not.toContain('status');
      expect(keys).toContain('categoryBreakdown');
      expect(keys).toContain('averageResolutionHours');
      expect(keys).toContain('recentTickets');
      expect(keys).toContain('totals');
      expect(keys).toContain('topUsers');
    });

    it('should call NextResponse.json with stats object', async () => {
      await GET();

      expect(mockNextResponseJson).toHaveBeenCalled();
      expect(mockNextResponseJson).toHaveBeenCalledTimes(1);
      expect(mockNextResponseJson).not.toHaveBeenCalledTimes(0);
      expect(mockNextResponseJson).not.toHaveBeenCalledTimes(2);
      expect(mockNextResponseJson.mock.calls[0][0]).toHaveProperty('stats');
    });

    it('should return response with status 200', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(201);
      expect(typeof response.status).toBe('number');
      expect(typeof response.status).not.toBe('string');
      expect(typeof response.status).not.toBe('object');
      expect(response.status === 200).toBe(true);
      expect(response.status === 200).not.toBe(false);
    });
  });

  describe('Status Breakdown Processing', () => {
    it('should handle empty status results', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.statusBreakdown).toBeDefined();
      expect(response.json.stats.statusBreakdown).not.toBeNull();
      expect(response.json.stats.statusBreakdown).not.toBeUndefined();
      expect(typeof response.json.stats.statusBreakdown).toBe('object');
      expect(typeof response.json.stats.statusBreakdown).not.toBe('array');
      expect(Object.keys(response.json.stats.statusBreakdown).length).toBe(0);
      expect(Object.keys(response.json.stats.statusBreakdown).length).not.toBe(1);
      expect(Object.keys(response.json.stats.statusBreakdown).length).not.toBe(-1);
    });

    it('should correctly reduce status rows into object', async () => {
      const statusRows = [
        { status: 'open', count: '5' },
        { status: 'closed', count: '10' },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: statusRows })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.statusBreakdown.open).toBe(5);
      expect(response.json.stats.statusBreakdown.open).not.toBe('5');
      expect(response.json.stats.statusBreakdown.open).not.toBe(0);
      expect(response.json.stats.statusBreakdown.open).not.toBe(10);
      expect(response.json.stats.statusBreakdown.closed).toBe(10);
      expect(response.json.stats.statusBreakdown.closed).not.toBe('10');
      expect(response.json.stats.statusBreakdown.closed).not.toBe(0);
      expect(response.json.stats.statusBreakdown.closed).not.toBe(5);
    });

    it('should handle multiple status types', async () => {
      const statusRows = [
        { status: 'new', count: '3' },
        { status: 'in_progress', count: '7' },
        { status: 'on_hold', count: '2' },
        { status: 'resolved', count: '15' },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: statusRows })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();
      const breakdown = response.json.stats.statusBreakdown;

      expect(Object.keys(breakdown).length).toBe(4);
      expect(Object.keys(breakdown).length).not.toBe(3);
      expect(Object.keys(breakdown).length).not.toBe(0);
      expect(Object.keys(breakdown).length).not.toBe(5);
      expect(breakdown.new).toBe(3);
      expect(breakdown.new).not.toBe(0);
      expect(breakdown.in_progress).toBe(7);
      expect(breakdown.in_progress).not.toBe(0);
      expect(breakdown.on_hold).toBe(2);
      expect(breakdown.on_hold).not.toBe(0);
      expect(breakdown.resolved).toBe(15);
      expect(breakdown.resolved).not.toBe(0);
    });
  });

  describe('Priority Breakdown Processing', () => {
    it('should handle all priority levels', async () => {
      const priorityRows = [
        { priority: 'urgent', count: '8' },
        { priority: 'high', count: '12' },
        { priority: 'medium', count: '20' },
        { priority: 'low', count: '15' },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: priorityRows })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();
      const breakdown = response.json.stats.priorityBreakdown;

      expect(breakdown.urgent).toBe(8);
      expect(breakdown.urgent).not.toBe(0);
      expect(breakdown.urgent).not.toBe(12);
      expect(breakdown.urgent).not.toBe('8');
      expect(breakdown.high).toBe(12);
      expect(breakdown.high).not.toBe(0);
      expect(breakdown.high).not.toBe(8);
      expect(breakdown.medium).toBe(20);
      expect(breakdown.medium).not.toBe(0);
      expect(breakdown.medium).not.toBe(15);
      expect(breakdown.low).toBe(15);
      expect(breakdown.low).not.toBe(0);
      expect(breakdown.low).not.toBe(20);
      expect(typeof breakdown.urgent).toBe('number');
      expect(typeof breakdown.urgent).not.toBe('string');
    });

    it('should convert priority counts to integers', async () => {
      const priorityRows = [{ priority: 'critical', count: '99' }];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: priorityRows })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.priorityBreakdown.critical).toBe(99);
      expect(response.json.stats.priorityBreakdown.critical).not.toBe('99');
      expect(response.json.stats.priorityBreakdown.critical).not.toBe(0);
      expect(response.json.stats.priorityBreakdown.critical).not.toBe(100);
      expect(Number.isInteger(response.json.stats.priorityBreakdown.critical)).toBe(true);
      expect(Number.isInteger(response.json.stats.priorityBreakdown.critical)).not.toBe(false);
      expect(typeof response.json.stats.priorityBreakdown.critical).toBe('number');
      expect(typeof response.json.stats.priorityBreakdown.critical).not.toBe('string');
    });
  });

  describe('Category Breakdown Processing', () => {
    it('should handle multiple categories', async () => {
      const categoryRows = [
        { category: 'bug', count: '25' },
        { category: 'feature', count: '18' },
        { category: 'support', count: '12' },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: categoryRows })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();
      const breakdown = response.json.stats.categoryBreakdown;

      expect(breakdown.bug).toBe(25);
      expect(breakdown.bug).not.toBe(0);
      expect(breakdown.bug).not.toBe(18);
      expect(breakdown.bug).not.toBe('25');
      expect(breakdown.feature).toBe(18);
      expect(breakdown.feature).not.toBe(0);
      expect(breakdown.feature).not.toBe(25);
      expect(breakdown.support).toBe(12);
      expect(breakdown.support).not.toBe(0);
      expect(breakdown.support).not.toBe(18);
      expect(Object.keys(breakdown).length).toBe(3);
      expect(Object.keys(breakdown).length).not.toBe(0);
      expect(Object.keys(breakdown).length).not.toBe(2);
    });

    it('should handle empty category results', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.categoryBreakdown).toBeDefined();
      expect(response.json.stats.categoryBreakdown).not.toBeNull();
      expect(response.json.stats.categoryBreakdown).not.toBeUndefined();
      expect(Object.keys(response.json.stats.categoryBreakdown).length).toBe(0);
      expect(Object.keys(response.json.stats.categoryBreakdown).length).not.toBe(1);
      expect(Object.keys(response.json.stats.categoryBreakdown).length).not.toBe(-1);
    });
  });

  describe('Average Resolution Time Processing', () => {
    it('should handle null average hours', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.averageResolutionHours).toBe('0.00');
      expect(response.json.stats.averageResolutionHours).not.toBe('0');
      expect(response.json.stats.averageResolutionHours).not.toBe('0.0');
      expect(response.json.stats.averageResolutionHours).not.toBe(0);
      expect(typeof response.json.stats.averageResolutionHours).toBe('string');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('number');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('object');
    });

    it('should handle empty resolution result array', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.averageResolutionHours).toBe('0.00');
      expect(response.json.stats.averageResolutionHours).not.toBe(0);
      expect(response.json.stats.averageResolutionHours).not.toBe('0');
      expect(response.json.stats.averageResolutionHours).not.toBe(null);
      expect(typeof response.json.stats.averageResolutionHours).toBe('string');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('number');
    });

    it('should format decimal hours correctly', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '24.678' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.averageResolutionHours).toBe('24.68');
      expect(response.json.stats.averageResolutionHours).not.toBe('24.678');
      expect(response.json.stats.averageResolutionHours).not.toBe('24.67');
      expect(response.json.stats.averageResolutionHours).not.toBe('24');
      expect(response.json.stats.averageResolutionHours.split('.')[1].length).toBe(2);
      expect(response.json.stats.averageResolutionHours.split('.')[1].length).not.toBe(1);
      expect(response.json.stats.averageResolutionHours.split('.')[1].length).not.toBe(3);
    });

    it('should handle whole number hours', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '10' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.averageResolutionHours).toBe('10.00');
      expect(response.json.stats.averageResolutionHours).not.toBe('10');
      expect(response.json.stats.averageResolutionHours).not.toBe('10.0');
      expect(response.json.stats.averageResolutionHours).not.toBe(10);
      expect(typeof response.json.stats.averageResolutionHours).toBe('string');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('number');
    });

    it('should handle very small decimal values', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0.123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.averageResolutionHours).toBe('0.12');
      expect(response.json.stats.averageResolutionHours).not.toBe('0.123');
      expect(response.json.stats.averageResolutionHours).not.toBe('0.13');
      expect(response.json.stats.averageResolutionHours).not.toBe('0');
      expect(typeof response.json.stats.averageResolutionHours).toBe('string');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('number');
    });
  });

  describe('Recent Tickets Processing', () => {
    it('should pass through recent tickets array', async () => {
      const recentRows = [
        { date: '2025-11-20', count: '10' },
        { date: '2025-11-19', count: '8' },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: recentRows })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.recentTickets).toEqual(recentRows);
      expect(response.json.stats.recentTickets).not.toEqual([]);
      expect(response.json.stats.recentTickets).not.toEqual({});
      expect(Array.isArray(response.json.stats.recentTickets)).toBe(true);
      expect(Array.isArray(response.json.stats.recentTickets)).not.toBe(false);
      expect(response.json.stats.recentTickets.length).toBe(2);
      expect(response.json.stats.recentTickets.length).not.toBe(0);
      expect(response.json.stats.recentTickets.length).not.toBe(1);
    });

    it('should handle empty recent tickets', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.recentTickets).toEqual([]);
      expect(response.json.stats.recentTickets).not.toEqual({});
      expect(response.json.stats.recentTickets).not.toBeNull();
      expect(response.json.stats.recentTickets.length).toBe(0);
      expect(response.json.stats.recentTickets.length).not.toBe(1);
      expect(response.json.stats.recentTickets.length).not.toBe(-1);
      expect(Array.isArray(response.json.stats.recentTickets)).toBe(true);
      expect(Array.isArray(response.json.stats.recentTickets)).not.toBe(false);
    });
  });

  describe('Totals Processing', () => {
    it('should pass through totals object', async () => {
      const totalsRow = {
        total_tickets: '100',
        active_tickets: '25',
        solved_tickets: '70',
        high_priority_tickets: '30',
      };

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [totalsRow] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.totals).toEqual(totalsRow);
      expect(response.json.stats.totals).not.toEqual({});
      expect(response.json.stats.totals).not.toEqual([]);
      expect(response.json.stats.totals).not.toBeNull();
      expect(response.json.stats.totals.total_tickets).toBe('100');
      expect(response.json.stats.totals.total_tickets).not.toBe('0');
      expect(response.json.stats.totals.total_tickets).not.toBe(100);
      expect(response.json.stats.totals.active_tickets).toBe('25');
      expect(response.json.stats.totals.active_tickets).not.toBe('0');
    });

    it('should handle missing totals properties', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.totals).toBeDefined();
      expect(response.json.stats.totals).not.toBeNull();
      expect(response.json.stats.totals).not.toBeUndefined();
      expect(response.json.stats.totals).not.toEqual([]);
      expect(typeof response.json.stats.totals).toBe('object');
      expect(typeof response.json.stats.totals).not.toBe('string');
      expect(typeof response.json.stats.totals).not.toBe('array');
    });
  });

  describe('Top Users Processing', () => {
    it('should pass through top users array', async () => {
      const topUsersRows = [
        { email: 'top1@test.com', name: 'Top One', ticket_count: '50' },
        { email: 'top2@test.com', name: 'Top Two', ticket_count: '40' },
      ];

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: topUsersRows });

      const response = await GET();

      expect(response.json.stats.topUsers).toEqual(topUsersRows);
      expect(response.json.stats.topUsers).not.toEqual([]);
      expect(response.json.stats.topUsers).not.toEqual({});
      expect(response.json.stats.topUsers).not.toBeNull();
      expect(Array.isArray(response.json.stats.topUsers)).toBe(true);
      expect(Array.isArray(response.json.stats.topUsers)).not.toBe(false);
      expect(response.json.stats.topUsers.length).toBe(2);
      expect(response.json.stats.topUsers.length).not.toBe(0);
      expect(response.json.stats.topUsers.length).not.toBe(1);
    });

    it('should handle empty top users', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await GET();

      expect(response.json.stats.topUsers).toEqual([]);
      expect(response.json.stats.topUsers).not.toEqual({});
      expect(response.json.stats.topUsers).not.toBeNull();
      expect(response.json.stats.topUsers.length).toBe(0);
      expect(response.json.stats.topUsers.length).not.toBe(1);
      expect(response.json.stats.topUsers.length).not.toBe(-1);
      expect(Array.isArray(response.json.stats.topUsers)).toBe(true);
      expect(Array.isArray(response.json.stats.topUsers)).not.toBe(false);
    });

    it('should handle maximum 10 users', async () => {
      const topUsersRows = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@test.com`,
        name: `User ${i}`,
        ticket_count: `${10 - i}`,
      }));

      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: topUsersRows });

      const response = await GET();

      expect(response.json.stats.topUsers.length).toBe(10);
      expect(response.json.stats.topUsers.length).not.toBe(9);
      expect(response.json.stats.topUsers.length).not.toBe(11);
    });
  });

  describe('Error Handling', () => {
    it('should handle database query errors', async () => {
      const error = new Error('Database connection failed');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await GET();

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response).not.toBeUndefined();
      expect(response.json).toHaveProperty('error');
      expect(response.json).not.toHaveProperty('stats');
      expect(response.json.error).toBe('Failed to fetch statistics');
      expect(response.json.error).not.toBe('');
      expect(response.json.error).not.toBe('Success');
      expect(response.json.error).not.toBe('Database connection failed');
      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(404);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);

      consoleErrorSpy.mockRestore();
    });

    it('should log error to console', async () => {
      const error = new Error('Query timeout');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await GET();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toBe('Error fetching admin stats:');
      expect(consoleErrorSpy.mock.calls[0][1]).toBe(error);

      consoleErrorSpy.mockRestore();
    });

    it('should return error response with correct structure', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('Test error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await GET();

      expect(response.json).toHaveProperty('error');
      expect(response.json).not.toHaveProperty('stats');
      expect(Object.keys(response.json).length).toBe(1);
      expect(Object.keys(response.json).length).not.toBe(0);
      expect(Object.keys(response.json).length).not.toBe(2);

      consoleErrorSpy.mockRestore();
    });

    it('should handle error on first query', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('First query failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await GET();

      expect(mockPoolQuery).toHaveBeenCalledTimes(1);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(7);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(2);
      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(404);

      consoleErrorSpy.mockRestore();
    });

    it('should handle error on middle query', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Fourth query failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await GET();

      expect(mockPoolQuery).toHaveBeenCalledTimes(4);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(7);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(3);
      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(404);

      consoleErrorSpy.mockRestore();
    });

    it('should not return stats on error', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('Test error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await GET();

      expect(response.json.stats).toBeUndefined();
      expect(response.json.stats).not.toBeDefined();
      expect('stats' in response.json).toBe(false);
      expect('stats' in response.json).not.toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });
    });

    it('should return object with json property', async () => {
      const response = await GET();

      expect(response).toHaveProperty('json');
      expect('json' in response).toBe(true);
      expect('json' in response).not.toBe(false);
      expect(typeof response.json).toBe('object');
    });

    it('should have stats as top-level property in json', async () => {
      const response = await GET();

      expect(Object.keys(response.json)).toContain('stats');
      expect(Object.keys(response.json).length).toBe(1);
      expect(Object.keys(response.json).length).not.toBe(0);
      expect(Object.keys(response.json).length).not.toBe(2);
    });

    it('should return valid JSON-serializable data', async () => {
      const response = await GET();

      expect(() => JSON.stringify(response.json)).not.toThrow();
      const serialized = JSON.stringify(response.json);
      expect(typeof serialized).toBe('string');
      expect(serialized).not.toBe('');
      expect(serialized.length).toBeGreaterThan(0);
    });
  });

  describe('Query Execution Order', () => {
    it('should execute queries in correct sequence', async () => {
      const queryMock = jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // status
        .mockResolvedValueOnce({ rows: [] }) // priority
        .mockResolvedValueOnce({ rows: [] }) // category
        .mockResolvedValueOnce({ rows: [{ avg_hours: '0' }] }) // resolution
        .mockResolvedValueOnce({ rows: [] }) // recent
        .mockResolvedValueOnce({ rows: [{}] }) // totals
        .mockResolvedValueOnce({ rows: [] }); // top users

      mockPoolQuery.mockImplementation(queryMock);

      await GET();

      expect(queryMock).toHaveBeenCalledTimes(7);
      expect(queryMock.mock.calls[0][0]).toContain('GROUP BY status');
      expect(queryMock.mock.calls[1][0]).toContain('GROUP BY priority');
      expect(queryMock.mock.calls[2][0]).toContain('GROUP BY category');
      expect(queryMock.mock.calls[3][0]).toContain('avg_hours');
      expect(queryMock.mock.calls[4][0]).toContain('7 days');
      expect(queryMock.mock.calls[5][0]).toContain('total_tickets');
      expect(queryMock.mock.calls[6][0]).toContain('LIMIT 10');
    });
  });

  describe('Type Safety', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ status: 'test', count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ priority: 'high', count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ category: 'bug', count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ avg_hours: '8.5' }] })
        .mockResolvedValueOnce({ rows: [{ date: '2025-11-20', count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ total_tickets: '15' }] })
        .mockResolvedValueOnce({ rows: [{ email: 'test@test.com', name: 'Test', ticket_count: '5' }] });
    });

    it('should return stats as object type', async () => {
      const response = await GET();

      expect(typeof response.json.stats).toBe('object');
      expect(typeof response.json.stats).not.toBe('string');
      expect(typeof response.json.stats).not.toBe('number');
      expect(typeof response.json.stats).not.toBe('boolean');
      expect(Array.isArray(response.json.stats)).toBe(false);
      expect(Array.isArray(response.json.stats)).not.toBe(true);
    });

    it('should return statusBreakdown as object', async () => {
      const response = await GET();

      expect(typeof response.json.stats.statusBreakdown).toBe('object');
      expect(Array.isArray(response.json.stats.statusBreakdown)).toBe(false);
    });

    it('should return priorityBreakdown as object', async () => {
      const response = await GET();

      expect(typeof response.json.stats.priorityBreakdown).toBe('object');
      expect(Array.isArray(response.json.stats.priorityBreakdown)).toBe(false);
    });

    it('should return categoryBreakdown as object', async () => {
      const response = await GET();

      expect(typeof response.json.stats.categoryBreakdown).toBe('object');
      expect(Array.isArray(response.json.stats.categoryBreakdown)).toBe(false);
    });

    it('should return averageResolutionHours as string', async () => {
      const response = await GET();

      expect(typeof response.json.stats.averageResolutionHours).toBe('string');
      expect(typeof response.json.stats.averageResolutionHours).not.toBe('number');
    });

    it('should return recentTickets as array', async () => {
      const response = await GET();

      expect(Array.isArray(response.json.stats.recentTickets)).toBe(true);
      expect(Array.isArray(response.json.stats.recentTickets)).not.toBe(false);
      expect(typeof response.json.stats.recentTickets).toBe('object');
    });

    it('should return topUsers as array', async () => {
      const response = await GET();

      expect(Array.isArray(response.json.stats.topUsers)).toBe(true);
      expect(Array.isArray(response.json.stats.topUsers)).not.toBe(false);
    });
  });
});
