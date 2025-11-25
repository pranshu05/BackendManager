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
let GET, PUT, DELETE;

describe('Admin Ticket Detail Routes - /api/admin/tickets/[ticketId]', () => {
  beforeAll(async () => {
    const module = await import('@/app/api/admin/tickets/[ticketId]/route');
    GET = module.GET;
    PUT = module.PUT;
    DELETE = module.DELETE;
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
    it('should use withAdminAuth for GET handler', () => {
      expect(typeof GET).toBe('function');
      expect(typeof GET).not.toBe('string');
      expect(typeof GET).not.toBe('object');
      expect(GET).toBeDefined();
      expect(GET).not.toBeNull();
      expect(GET).not.toBeUndefined();
    });

    it('should use withAdminAuth for PUT handler', () => {
      expect(typeof PUT).toBe('function');
      expect(typeof PUT).not.toBe('string');
      expect(typeof PUT).not.toBe('object');
      expect(PUT).toBeDefined();
      expect(PUT).not.toBeNull();
    });

    it('should use withAdminAuth for DELETE handler', () => {
      expect(typeof DELETE).toBe('function');
      expect(typeof DELETE).not.toBe('string');
      expect(typeof DELETE).not.toBe('object');
      expect(DELETE).toBeDefined();
      expect(DELETE).not.toBeNull();
    });
  });

  describe('GET - Fetch Specific Ticket', () => {
    const mockTicket = {
      id: 1,
      user_id: 'user123',
      subject: 'Test Ticket',
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
      organization_name: 'Test Org',
      organization_type: 'company',
    };

    it('should fetch ticket by id successfully', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockRequest = {};
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET(mockRequest, mockContext);

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response).not.toBeUndefined();
      expect(response.json).toBeDefined();
      expect(response.json.ticket).toBeDefined();
      expect(response.json.ticket).not.toBeNull();
      expect(typeof response.json.ticket).toBe('object');
      expect(typeof response.json.ticket).not.toBe('string');
    });

    it('should call pool.query exactly once', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await GET({}, mockContext);

      expect(mockPoolQuery).toHaveBeenCalled();
      expect(mockPoolQuery).toHaveBeenCalledTimes(1);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(2);
      expect(mockPoolQuery.mock.calls.length).toBe(1);
      expect(mockPoolQuery.mock.calls.length).not.toBe(0);
    });

    it('should pass ticketId as query parameter', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '123' }),
      };

      await GET({}, mockContext);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('123');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('1');
      expect(mockPoolQuery.mock.calls[0][1].length).toBe(1);
      expect(mockPoolQuery.mock.calls[0][1].length).not.toBe(0);
      expect(Array.isArray(mockPoolQuery.mock.calls[0][1])).toBe(true);
    });

    it('should return ticket in response', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(response.json.ticket).toEqual(mockTicket);
      expect(response.json.ticket).not.toEqual({});
      expect(response.json.ticket).not.toEqual([]);
      expect(response.json.ticket.id).toBe(1);
      expect(response.json.ticket.id).not.toBe(0);
    });

    it('should return status 200 for successful request', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(400);
      expect(typeof response.status).toBe('number');
      expect(typeof response.status).not.toBe('string');
    });

    it('should return 404 when ticket not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '999' }),
      };

      const response = await GET({}, mockContext);

      expect(response.status).toBe(404);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(400);
      expect(response.json.error).toBe('Support ticket not found');
      expect(response.json.error).not.toBe('');
      expect(response.json.error).not.toBe('Ticket not found');
      expect(response.json).not.toHaveProperty('ticket');
    });

    it('should include user information in response', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(response.json.ticket.user_email).toBeDefined();
      expect(response.json.ticket.user_name).toBeDefined();
      expect(response.json.ticket.user_phone).toBeDefined();
      expect(response.json.ticket.user_email).not.toBeNull();
      expect(typeof response.json.ticket.user_email).toBe('string');
    });

    it('should include organization information', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(response.json.ticket.organization_name).toBeDefined();
      expect(response.json.ticket.organization_type).toBeDefined();
      expect(response.json.ticket.organization_name).not.toBeNull();
      expect(typeof response.json.ticket.organization_name).toBe('string');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(404);
      expect(response.json.error).toBe('Failed to fetch ticket');
      expect(response.json.error).not.toBe('');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('PUT - Update Ticket', () => {
    const mockUpdatedTicket = {
      id: 1,
      status: 'solved',
      admin_notes: 'Updated notes',
      priority: 'medium',
    };

    it('should update ticket status successfully', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          status: 'solved',
        }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response.json).toBeDefined();
      expect(response.json.message).toBeDefined();
      expect(response.json.ticket).toBeDefined();
      expect(typeof response.json.message).toBe('string');
      expect(typeof response.json.message).not.toBe('number');
    });

    it('should call request.json() to parse body', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      expect(mockRequest.json).toHaveBeenCalled();
      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(mockRequest.json).not.toHaveBeenCalledTimes(0);
      expect(mockRequest.json).not.toHaveBeenCalledTimes(2);
    });

    it('should reject invalid status', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          status: 'invalid_status',
        }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(404);
      expect(response.json.error).toBe('Invalid status');
      expect(response.json.error).not.toBe('');
      expect(response.json.error).not.toBe('Invalid priority');
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['active', 'inactive', 'solved', 'in_progress'];

      for (const status of validStatuses) {
        jest.clearAllMocks();
        mockPoolQuery.mockResolvedValueOnce({
          rows: [{ ...mockUpdatedTicket, status }],
        });

        const mockRequest = {
          json: jest.fn().mockResolvedValue({ status }),
        };
        const mockContext = {
          params: Promise.resolve({ ticketId: '1' }),
        };

        const response = await PUT(mockRequest, mockContext);

        expect(response.status).toBe(200);
        expect(response.status).not.toBe(400);
        expect(mockPoolQuery).toHaveBeenCalled();
      }
    });

    it('should reject invalid priority', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          priority: 'invalid_priority',
        }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.status).not.toBe(200);
      expect(response.json.error).toBe('Invalid priority');
      expect(response.json.error).not.toBe('Invalid status');
      expect(response.json.error).not.toBe('');
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('should accept valid priority values', async () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of validPriorities) {
        jest.clearAllMocks();
        mockPoolQuery.mockResolvedValueOnce({
          rows: [{ ...mockUpdatedTicket, priority }],
        });

        const mockRequest = {
          json: jest.fn().mockResolvedValue({ priority }),
        };
        const mockContext = {
          params: Promise.resolve({ ticketId: '1' }),
        };

        const response = await PUT(mockRequest, mockContext);

        expect(response.status).toBe(200);
        expect(response.status).not.toBe(400);
        expect(mockPoolQuery).toHaveBeenCalled();
      }
    });

    it('should set resolved_at when status is solved', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'solved' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('resolved_at = $');
      expect(query).not.toContain('resolved_at IS NULL');
      expect(query).toContain('status = $');
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
      expect(query.length).not.toBe(0);
    });

    it('should not set resolved_at for non-solved status', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).not.toContain('resolved_at');
      expect(query).toContain('updated_at');
    });

    it('should update admin_notes', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          admin_notes: 'New admin notes',
        }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      expect(mockPoolQuery).toHaveBeenCalled();
      expect(mockPoolQuery.mock.calls[0][1]).toContain('New admin notes');
      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('admin_notes = $');
    });

    it('should update multiple fields together', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          status: 'in_progress',
          priority: 'high',
          admin_notes: 'Working on it',
        }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('in_progress');
      expect(mockPoolQuery.mock.calls[0][1]).toContain('high');
      expect(mockPoolQuery.mock.calls[0][1]).toContain('Working on it');
      expect(mockPoolQuery.mock.calls[0][1].length).toBeGreaterThan(1);
    });

    it('should always update updated_at', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('updated_at = $');
      expect(query).not.toContain('updated_at IS NULL');
      expect(query).toContain('SET');
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should return 400 when no fields to update', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.json.error).toBe('No fields to update');
      expect(response.json.error).not.toBe('');
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('should return 404 when ticket not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '999' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.json.error).toBe('Ticket not found');
      expect(response.json.error).not.toBe('Support ticket not found');
      expect(response.json).not.toHaveProperty('ticket');
    });

    it('should return success message with updated ticket', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'solved' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.json.message).toBe('Ticket updated successfully');
      expect(response.json.message).not.toBe('');
      expect(response.json.message).not.toBe('Ticket deleted successfully');
      expect(response.json.ticket).toEqual(mockUpdatedTicket);
      expect(response.json.ticket).not.toEqual({});
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.json.error).toBe('Failed to update ticket');
      expect(response.json.error).not.toBe('Failed to fetch ticket');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should include RETURNING clause in query', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedTicket] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await PUT(mockRequest, mockContext);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('RETURNING *');
      expect(query).not.toContain('RETURNING id');
      expect(query).not.toContain('RETURNING status');
      expect(query).toContain('UPDATE support_tickets');
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE - Remove Ticket', () => {
    it('should delete ticket successfully', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{ id: 1, subject: 'Deleted ticket' }],
      });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await DELETE({}, mockContext);

      expect(response).toBeDefined();
      expect(response).not.toBeNull();
      expect(response.json).toBeDefined();
      expect(response.json.message).toBeDefined();
      expect(typeof response.json.message).toBe('string');
      expect(typeof response.json.message).not.toBe('object');
    });

    it('should call pool.query exactly once', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await DELETE({}, mockContext);

      expect(mockPoolQuery).toHaveBeenCalled();
      expect(mockPoolQuery).toHaveBeenCalledTimes(1);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(0);
      expect(mockPoolQuery).not.toHaveBeenCalledTimes(2);
    });

    it('should use DELETE SQL statement', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await DELETE({}, mockContext);

      const query = mockPoolQuery.mock.calls[0][0];
      expect(query).toContain('DELETE FROM support_tickets');
      expect(query).not.toContain('UPDATE');
      expect(query).not.toContain('SELECT');
      expect(query).toContain('WHERE id = $1');
      expect(query).toContain('RETURNING *');
    });

    it('should pass ticketId as parameter', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '456' }),
      };

      await DELETE({}, mockContext);

      expect(mockPoolQuery.mock.calls[0][1]).toContain('456');
      expect(mockPoolQuery.mock.calls[0][1]).not.toContain('1');
      expect(mockPoolQuery.mock.calls[0][1].length).toBe(1);
      expect(Array.isArray(mockPoolQuery.mock.calls[0][1])).toBe(true);
    });

    it('should return success message', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await DELETE({}, mockContext);

      expect(response.json.message).toBe('Ticket deleted successfully');
      expect(response.json.message).not.toBe('');
      expect(response.json.message).not.toBe('Ticket updated successfully');
      expect(response.json.message).not.toBe('Deleted successfully');
      expect(response.json).not.toHaveProperty('ticket');
    });

    it('should return status 200 for successful deletion', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await DELETE({}, mockContext);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(400);
      expect(typeof response.status).toBe('number');
    });

    it('should return 404 when ticket not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '999' }),
      };

      const response = await DELETE({}, mockContext);

      expect(response.status).toBe(404);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
      expect(response.json.error).toBe('Ticket not found');
      expect(response.json.error).not.toBe('');
      expect(response.json.error).not.toBe('Support ticket not found');
      expect(response.json).not.toHaveProperty('message');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await DELETE({}, mockContext);

      expect(response.status).toBe(500);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(404);
      expect(response.json.error).toBe('Failed to delete ticket');
      expect(response.json.error).not.toBe('Failed to update ticket');
      expect(response.json.error).not.toBe('');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);

      consoleErrorSpy.mockRestore();
    });

    it('should log error to console on failure', async () => {
      const error = new Error('Delete failed');
      mockPoolQuery.mockRejectedValueOnce(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      await DELETE({}, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(0);
      expect(consoleErrorSpy).not.toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toBe('Error deleting ticket:');
      expect(consoleErrorSpy.mock.calls[0][1]).toBe(error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Response Format Validation', () => {
    it('should return valid JSON structure for GET', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(() => JSON.stringify(response.json)).not.toThrow();
      expect(typeof response.json).toBe('object');
      expect(typeof response.json).not.toBe('string');
      expect(response.json).not.toBeNull();
    });

    it('should return valid JSON structure for PUT', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(() => JSON.stringify(response.json)).not.toThrow();
      expect(typeof response.json).toBe('object');
      expect(response.json).not.toBeNull();
    });

    it('should return valid JSON structure for DELETE', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await DELETE({}, mockContext);

      expect(() => JSON.stringify(response.json)).not.toThrow();
      expect(typeof response.json).toBe('object');
      expect(response.json).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined status in PUT', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ admin_notes: 'Notes only' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(mockPoolQuery).toHaveBeenCalled();
    });

    it('should handle undefined priority in PUT', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(mockPoolQuery).toHaveBeenCalled();
    });

    it('should handle empty admin_notes string', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ admin_notes: '' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(400);
      expect(mockPoolQuery.mock.calls[0][1]).toContain('');
    });

    it('should handle null admin_notes', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ admin_notes: null }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(mockPoolQuery).toHaveBeenCalled();
    });

    it('should handle very long admin_notes', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const longNotes = 'a'.repeat(5000);
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ admin_notes: longNotes }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(mockPoolQuery.mock.calls[0][1]).toContain(longNotes);
    });
  });

  describe('Type Safety', () => {
    it('should return object type for GET response', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(typeof response.json).toBe('object');
      expect(typeof response.json).not.toBe('string');
      expect(typeof response.json).not.toBe('number');
      expect(Array.isArray(response.json)).toBe(false);
    });

    it('should return object type for PUT response', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ status: 'active' }),
      };
      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await PUT(mockRequest, mockContext);

      expect(typeof response.json).toBe('object');
      expect(typeof response.json).not.toBe('string');
      expect(Array.isArray(response.json)).toBe(false);
    });

    it('should return object type for DELETE response', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await DELETE({}, mockContext);

      expect(typeof response.json).toBe('object');
      expect(typeof response.json).not.toBe('string');
      expect(Array.isArray(response.json)).toBe(false);
    });

    it('should return number type for status codes', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const mockContext = {
        params: Promise.resolve({ ticketId: '1' }),
      };

      const response = await GET({}, mockContext);

      expect(typeof response.status).toBe('number');
      expect(typeof response.status).not.toBe('string');
      expect(typeof response.status).not.toBe('object');
      expect(Number.isInteger(response.status)).toBe(true);
    });
  });
});
