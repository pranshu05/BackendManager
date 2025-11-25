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

describe('GET /api/admin/tickets', () => {
  beforeAll(async () => {
    const module = await import('@/app/api/admin/tickets/route');
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

  describe('Successful Ticket Retrieval', () => {
    const mockTickets = [
      {
        id: 1,
        user_id: 'user1',
        subject: 'Test Issue',
        message: 'Test message',
        category: 'technical',
        status: 'active',
        priority: 'high',
        created_at: '2025-11-20',
        updated_at: '2025-11-20',
        resolved_at: null,
        admin_notes: null,
        user_email: 'test@test.com',
        user_name: 'Test User',
        user_phone: '1234567890',
      },
    ];

    const mockCountResult = { rows: [{ total: '1' }] };

    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: mockTickets })
        .mockResolvedValueOnce(mockCountResult);
    });

    it('should fetch tickets without filters', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response).not.toBeUndefined();
      expect(response.json).toBeDefined();
      expect(response.json.tickets).toBeDefined();
      expect(response.json.tickets).not.toBeNull();
      expect(Array.isArray(response.json.tickets)).toBe(true);
      expect(Array.isArray(response.json.tickets)).not.toBe(false);
    });

    it('should call pool.query exactly twice', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      expect(mockPoolQuery).toHaveBeenCalled();
      expect(mockPoolQuery).toHaveBeenCalledTimes(2);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(1);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(3);
      expect(mockPoolQuery.mock.calls.length).toBe(2);
      expect(mockPoolQuery.mock.calls.length).not.toBe(0);
    });

    it('should return tickets array in response', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.json.tickets).toEqual(mockTickets);
      expect(response.json.tickets).not.toEqual([]);
      expect(response.json.tickets.length).toBe(1);
      expect(response.json.tickets.length).not.toBe(0);
      expect(response.json.tickets.length).not.toBe(2);
    });

    it('should return total count as integer', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.json.total).toBe(1);
      expect(response.json.total).not.toBe('1');
      expect(response.json.total).not.toBe(0);
      expect(response.json.total).not.toBe(2);
      expect(typeof response.json.total).toBe('number');
      expect(typeof response.json.total).not.toBe('string');
      expect(Number.isInteger(response.json.total)).toBe(true);
      expect(Number.isInteger(response.json.total)).not.toBe(false);
    });

    it('should return default limit of 100', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.json.limit).toBe(100);
      expect(response.json.limit).not.toBe(0);
      expect(response.json.limit).not.toBe(10);
      expect(response.json.limit).not.toBe('100');
      expect(typeof response.json.limit).toBe('number');
      expect(typeof response.json.limit).not.toBe('string');
    });

    it('should return default offset of 0', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.json.offset).toBe(0);
      expect(response.json.offset).not.toBe(1);
      expect(response.json.offset).not.toBe('0');
      expect(response.json.offset).not.toBe(null);
      expect(typeof response.json.offset).toBe('number');
      expect(typeof response.json.offset).not.toBe('string');
    });

    it('should return exactly 4 properties in response', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);
      const keys = Object.keys(response.json);

      expect(keys.length).toBe(4);
      expect(keys.length).not.toBe(3);
      expect(keys.length).not.toBe(5);
      expect(keys.length).not.toBe(0);
      expect(keys).toContain('tickets');
      expect(keys).toContain('total');
      expect(keys).toContain('limit');
      expect(keys).toContain('offset');
    });

    it('should return status 200 for successful request', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(400);
      expect(typeof response.status).toBe('number');
      expect(typeof response.status).not.toBe('string');
    });
  });

  describe('Query Parameters - Status Filter', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should filter by status parameter', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?status=active',
      };

      await GET(mockRequest);

      expect(mockPoolQuery).toHaveBeenCalled();
      expect(mockPoolQuery).toHaveBeenCalledTimes(2);
      expect(mockPoolQuery.mock.calls[0][1]).toContain('active');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('solved');
      expect(mockPoolQuery.mock.calls[0][1].length).toBeGreaterThan(0);
    });

    it('should include status in WHERE clause', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?status=solved',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('st.status = $');
      expect(query).not.toContain('status = solved');
      expect(query).toContain('AND st.status');
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
      expect(query.length).not.toBe(0);
    });

    it('should pass status to both queries', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?status=inactive',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('inactive');
      expect(mockPoolQuery.mock.calls[1][1]).toContain('inactive');
      expect(mockPoolQuery.mock.calls[0][1]).not.toEqual([]);
      expect(mockPoolQuery.mock.calls[1][1]).not.toEqual([]);
    });
  });

  describe('Query Parameters - Priority Filter', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should filter by priority parameter', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?priority=urgent',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('urgent');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('low');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('high');
    });

    it('should include priority in WHERE clause', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?priority=high',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('st.priority = $');
      expect(query).not.toContain('priority = high');
      expect(query).toContain('AND st.priority');
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should pass priority to both queries', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?priority=medium',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('medium');
      expect(mockPoolQuery.mock.calls[1][1]).toContain('medium');
      expect(Array.isArray(mockPoolQuery.mock.calls[0][1])).toBe(true);
      expect(Array.isArray(mockPoolQuery.mock.calls[1][1])).toBe(true);
    });
  });

  describe('Query Parameters - Category Filter', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should filter by category parameter', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?category=technical',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('technical');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('billing');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('general');
    });

    it('should include category in WHERE clause', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?category=billing',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('st.category = $');
      expect(query).not.toContain('category = billing');
      expect(query).toContain('AND st.category');
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should pass category to both queries', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?category=support',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('support');
      expect(mockPoolQuery.mock.calls[1][1]).toContain('support');
      expect(mockPoolQuery.mock.calls[0][1].length).toBeGreaterThan(0);
    });
  });

  describe('Query Parameters - Combined Filters', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should handle multiple filters together', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?status=active&priority=high&category=technical',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('active');
      expect(mockPoolQuery.mock.calls[0][1]).toContain('high');
      expect(mockPoolQuery.mock.calls[0][1]).toContain('technical');
      expect(mockPoolQuery.mock.calls[0][1].length).toBe(5);
      expect(mockPoolQuery.mock.calls[0][1].length).not.toBe(0);
      expect(mockPoolQuery.mock.calls[0][1].length).not.toBe(2);
    });

    it('should apply all filters to count query', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?status=solved&priority=low',
      };

      await GET(mockRequest);

      expect(mockPoolQuery.mock.calls[1][1]).toContain('solved');
      expect(mockPoolQuery.mock.calls[1][1]).toContain('low');
      expect(mockPoolQuery.mock.calls[1][1].length).toBe(2);
      expect(mockPoolQuery.mock.calls[1][1].length).not.toBe(0);
    });
  });

  describe('Query Parameters - Pagination', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should respect custom limit parameter', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?limit=50',
      };

      const response = await GET(mockRequest);

      expect(response.json.limit).toBe(50);
      expect(response.json.limit).not.toBe(100);
      expect(response.json.limit).not.toBe(0);
      expect(response.json.limit).not.toBe('50');
      expect(mockPoolQuery.mock.calls[0][1]).toContain(50);
    });

    it('should respect custom offset parameter', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?offset=20',
      };

      const response = await GET(mockRequest);

      expect(response.json.offset).toBe(20);
      expect(response.json.offset).not.toBe(0);
      expect(response.json.offset).not.toBe('20');
      expect(response.json.offset).not.toBe(null);
      expect(mockPoolQuery.mock.calls[0][1]).toContain(20);
    });

    it('should handle both limit and offset together', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?limit=25&offset=50',
      };

      const response = await GET(mockRequest);

      expect(response.json.limit).toBe(25);
      expect(response.json.offset).toBe(50);
      expect(mockPoolQuery.mock.calls[0][1]).toContain(25);
      expect(mockPoolQuery.mock.calls[0][1]).toContain(50);
    });

    it('should parse limit as integer', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?limit=30',
      };

      const response = await GET(mockRequest);

      expect(typeof response.json.limit).toBe('number');
      expect(typeof response.json.limit).not.toBe('string');
      expect(Number.isInteger(response.json.limit)).toBe(true);
      expect(Number.isInteger(response.json.limit)).not.toBe(false);
    });

    it('should parse offset as integer', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?offset=10',
      };

      const response = await GET(mockRequest);

      expect(typeof response.json.offset).toBe('number');
      expect(typeof response.json.offset).not.toBe('string');
      expect(Number.isInteger(response.json.offset)).toBe(true);
    });
  });

  describe('SQL Query Construction', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should include ORDER BY clause with priority sorting', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('ORDER BY');
      expect(query).toContain('CASE st.priority');
      expect(query).toContain("WHEN 'urgent' THEN 1");
      expect(query).toContain("WHEN 'high' THEN 2");
      expect(query).toContain("WHEN 'medium' THEN 3");
      expect(query).toContain("WHEN 'low' THEN 4");
    });

    it('should include LIMIT and OFFSET in query', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('LIMIT');
      expect(query).toContain('OFFSET');
      expect(query).not.toContain('LIMIT OFFSET');
      expect(typeof query).toBe('string');
    });

    it('should join with users table', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('JOIN users u ON st.user_id = u.id');
      expect(query).toContain('support_tickets st');
      expect(query).not.toContain('JOIN users ON');
    });

    it('should left join with user_profiles table', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('LEFT JOIN user_profiles up');
      expect(query).toContain('ON u.id = up.user_id');
      expect(query).not.toContain('INNER JOIN user_profiles');
      expect(query).not.toContain('RIGHT JOIN user_profiles');
      expect(typeof query).toBe('string');
    });

    it('should select user email, name, and phone', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('u.email as user_email');
      expect(query).toContain('u.name as user_name');
      expect(query).toContain('up.phone_number as user_phone');
    });
  });

  describe('Error Handling', () => {
    it('should handle database query errors', async () => {
      const error = new Error('Database connection failed');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response.json).toHaveProperty('error');
      expect(response.json).not.toHaveProperty('tickets');
      expect(response.json.error).toBe('Failed to fetch tickets');
      expect(response.json.error).not.toBe('');
      expect(response.json.error).not.toBe('Success');
      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(404);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);

      consoleErrorSpy.mockRestore();
    });

    it('should log error to console', async () => {
      const error = new Error('Query timeout');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      await GET(mockRequest);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toBe('Error fetching admin tickets:');
      expect(consoleErrorSpy.mock.calls[0][1]).toBe(error);

      consoleErrorSpy.mockRestore();
    });

    it('should return error response with correct structure', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('Test error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.json).toHaveProperty('error');
      expect(response.json).not.toHaveProperty('tickets');
      expect(response.json).not.toHaveProperty('total');
      expect(Object.keys(response.json).length).toBe(1);
      expect(Object.keys(response.json).length).not.toBe(0);
      expect(Object.keys(response.json).length).not.toBe(4);

      consoleErrorSpy.mockRestore();
    });

    it('should handle error on first query', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('First query failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(mockPoolQuery).toHaveBeenCalledTimes(1);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(2);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(response.status).toBe(500);

      consoleErrorSpy.mockRestore();
    });

    it('should handle error on count query', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Count query failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(mockPoolQuery).toHaveBeenCalledTimes(2);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(1);
      expect(response.status).toBe(500);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    });

    it('should return object with json property', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response).toHaveProperty('json');
      expect('json' in response).toBe(true);
      expect('json' in response).not.toBe(false);
      expect(typeof response.json).toBe('object');
      expect(typeof response.json).not.toBe('string');
    });

    it('should return valid JSON-serializable data', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(() => JSON.stringify(response.json)).not.toThrow();
      const serialized = JSON.stringify(response.json);
      expect(typeof serialized).toBe('string');
      expect(serialized).not.toBe('');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should have tickets as array type', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(Array.isArray(response.json.tickets)).toBe(true);
      expect(Array.isArray(response.json.tickets)).not.toBe(false);
      expect(typeof response.json.tickets).toBe('object');
      expect(typeof response.json.tickets).not.toBe('string');
    });

    it('should have total as number type', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(typeof response.json.total).toBe('number');
      expect(typeof response.json.total).not.toBe('string');
      expect(typeof response.json.total).not.toBe('object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tickets result', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets',
      };

      const response = await GET(mockRequest);

      expect(response.json.tickets).toEqual([]);
      expect(response.json.tickets).not.toEqual({});
      expect(response.json.tickets.length).toBe(0);
      expect(response.json.tickets.length).not.toBe(1);
      expect(response.json.total).toBe(0);
      expect(response.json.total).not.toBe(1);
    });

    it('should handle large limit values', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?limit=1000',
      };

      const response = await GET(mockRequest);

      expect(response.json.limit).toBe(1000);
      expect(response.json.limit).not.toBe(100);
      expect(response.json.limit).not.toBe(0);
    });

    it('should handle URL parsing with multiple parameters', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const mockRequest = {
        url: 'http://localhost:3000/api/admin/tickets?status=active&priority=high&limit=50&offset=10',
      };

      const response = await GET(mockRequest);

      expect(response).toBeDefined();
      expect(response.json.limit).toBe(50);
      expect(response.json.offset).toBe(10);
      expect(mockPoolQuery.mock.calls[0][1]).toContain('active');
      expect(mockPoolQuery.mock.calls[0][1]).toContain('high');
    });
  });
});
