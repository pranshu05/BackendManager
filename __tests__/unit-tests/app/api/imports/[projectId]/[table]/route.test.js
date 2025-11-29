/**
 * @jest-environment node
 */

// Mock dependencies
const mockPoolQuery = jest.fn();
const mockGetPool = jest.fn();
const mockCreatePool = jest.fn();

jest.mock('@/lib/db', () => ({
  pool: { query: mockPoolQuery },
  getPool: mockGetPool,
  createPool: mockCreatePool,
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

const { GET, POST, PUT, DELETE } = require('@/app/api/imports/[projectId]/[table]/route');

describe('Import Table API Route', () => {
  const mockProjectPool = {
    query: jest.fn(),
  };

  const mockParams = { projectId: 'proj-123', table: 'users' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockResolvedValue({
      rows: [{ connection_string: 'postgresql://localhost/test' }],
    });
    mockGetPool.mockReturnValue(mockProjectPool);
  });

  describe('Mutation Killers', () => {
    it('logs a non-empty message when GET fails (mutation killer)', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetPool.mockReturnValue(null);

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      await GET(request, { params: mockParams });

      expect(spy).toHaveBeenCalled();
      const found = spy.mock.calls.some(callArgs =>
        callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
      );
      expect(found).toBe(true);
      spy.mockRestore();
    });

    it('logs a non-empty message when POST fails (mutation killer)', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetPool.mockReturnValue(null);

      const request = { json: async () => ({ name: 'Test' }) };
      await POST(request, { params: mockParams });

      expect(spy).toHaveBeenCalled();
      const found = spy.mock.calls.some(callArgs =>
        callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
      );
      expect(found).toBe(true);
      spy.mockRestore();
    });

    it('logs a non-empty message when PUT fails (mutation killer)', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetPool.mockReturnValue(null);

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Test' })
      };
      await PUT(request, { params: mockParams });

      expect(spy).toHaveBeenCalled();
      const found = spy.mock.calls.some(callArgs =>
        callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
      );
      expect(found).toBe(true);
      spy.mockRestore();
    });

    it('logs a non-empty message when DELETE fails (mutation killer)', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetPool.mockReturnValue(null);

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=1' };
      await DELETE(request, { params: mockParams });

      expect(spy).toHaveBeenCalled();
      const found = spy.mock.calls.some(callArgs =>
        callArgs.some(arg => typeof arg === 'string' && arg.trim().length > 0)
      );
      expect(found).toBe(true);
      spy.mockRestore();
    });
  });

  describe('GET - Fetch table data', () => {
    it('should fetch all rows from a table with default limit', async () => {
      const mockRows = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];

      mockProjectPool.query.mockResolvedValue({ rows: mockRows });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(mockProjectPool.query).toHaveBeenCalledWith(
        'SELECT * FROM public."users" LIMIT 200'
      );
      expect(data.rows).toEqual(mockRows);
    });

    it('should fetch a single row by id', async () => {
      const mockRow = { id: 1, name: 'User 1' };
      mockProjectPool.query.mockResolvedValue({ rows: [mockRow] });

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=1' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(mockProjectPool.query).toHaveBeenCalledWith(
        'SELECT * FROM public."users" WHERE id = $1 LIMIT 1',
        ['1']
      );
      expect(data.rows).toEqual([mockRow]);
    });

    it('should handle errors when fetching data', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST - Insert data', () => {
    it('should insert a new row into the table', async () => {
      const newRow = { id: 3, name: 'User 3', email: 'user3@test.com' };

      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'name' }, { column_name: 'email' }] })
        .mockResolvedValueOnce({ rows: [newRow] });

      const request = {
        json: async () => ({ name: 'User 3', email: 'user3@test.com' }),
      };

      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(data.row).toEqual(newRow);
      expect(mockProjectPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public."users"'),
        expect.any(Array)
      );
    });

    it('should return error if no valid columns provided', async () => {
      mockProjectPool.query.mockResolvedValue({ rows: [{ column_name: 'id' }] });

      const request = {
        json: async () => ({ invalidColumn: 'value' }),
      };

      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid columns provided');
    });
  });

  describe('PUT - Update data', () => {
    it('should update a row by id', async () => {
      const updatedRow = { id: 1, name: 'Updated User', email: 'updated@test.com' };

      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }, { column_name: 'email' }] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Updated User', email: 'updated@test.com' }),
      };

      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(data.row).toEqual(updatedRow);
      expect(mockProjectPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."users"'),
        expect.any(Array)
      );
    });

    it('should return error if id is not provided', async () => {
      const request = {
        url: 'http://localhost/api/imports/proj-123/users',
        json: async () => ({ name: 'Updated User' }),
      };

      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('id query param required');
    });
  });

  describe('DELETE - Remove data', () => {
    it('should delete a row by id', async () => {
      const deletedRow = { id: 1, name: 'User 1' };
      mockProjectPool.query.mockResolvedValue({ rows: [deletedRow] });

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=1' };
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(data.row).toEqual(deletedRow);
      expect(mockProjectPool.query).toHaveBeenCalledWith(
        'DELETE FROM public."users" WHERE id = $1 RETURNING *',
        ['1']
      );
    });

    it('should return error if id is not provided', async () => {
      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('id query param required');
    });
  });

  describe('Error Message Validation', () => {
    it('should return non-empty error message on GET failure', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return non-empty error message on POST failure', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = { json: async () => ({ name: 'Test' }) };
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return non-empty error message on PUT failure', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Test' })
      };
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return non-empty error message on DELETE failure', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=1' };
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return status 400 for no valid columns in POST', async () => {
      mockProjectPool.query.mockResolvedValue({ rows: [{ column_name: 'id' }] });

      const request = {
        json: async () => ({ invalidColumn: 'value' }),
      };

      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid columns provided');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return status 400 for no valid columns in PUT', async () => {
      mockProjectPool.query.mockResolvedValue({ rows: [{ column_name: 'id' }] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ invalidColumn: 'value' })
      };

      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid columns provided');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return status 400 for missing id in PUT', async () => {
      const request = {
        url: 'http://localhost/api/imports/proj-123/users',
        json: async () => ({ name: 'Test' })
      };

      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('id query param required');
      expect(data.error.length).toBeGreaterThan(0);
    });

    it('should return status 400 for missing id in DELETE', async () => {
      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('id query param required');
      expect(data.error.length).toBeGreaterThan(0);
    });
  });

  describe('SQL Query Construction', () => {
    it('should construct INSERT query with proper column names', async () => {
      const newRow = { id: 3, name: 'User 3', email: 'user3@test.com' };

      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'name' }, { column_name: 'email' }] })
        .mockResolvedValueOnce({ rows: [newRow] });

      const request = {
        json: async () => ({ name: 'User 3', email: 'user3@test.com' }),
      };

      await POST(request, { params: mockParams });

      const insertCall = mockProjectPool.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO public."users"');
      expect(insertCall[0]).toContain('"name"');
      expect(insertCall[0]).toContain('"email"');
      expect(insertCall[0]).toContain('$1');
      expect(insertCall[0]).toContain('$2');
      expect(insertCall[0]).toContain('RETURNING *');
      expect(insertCall[1]).toEqual(['User 3', 'user3@test.com']);
    });

    it('should construct UPDATE query with proper SET clause', async () => {
      const updatedRow = { id: 1, name: 'Updated User' };

      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Updated User' }),
      };

      await PUT(request, { params: mockParams });

      const updateCall = mockProjectPool.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE public."users"');
      expect(updateCall[0]).toContain('"name" = $1');
      expect(updateCall[0]).toContain('WHERE id = $2');
      expect(updateCall[0]).toContain('RETURNING *');
      expect(updateCall[1]).toEqual(['Updated User', '1']);
    });

    it('should construct SELECT query with LIMIT for list', async () => {
      mockProjectPool.query.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      await GET(request, { params: mockParams });

      expect(mockProjectPool.query).toHaveBeenCalledWith(
        'SELECT * FROM public."users" LIMIT 200'
      );
    });

    it('should construct SELECT query with WHERE clause for single row', async () => {
      mockProjectPool.query.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=5' };
      await GET(request, { params: mockParams });

      expect(mockProjectPool.query).toHaveBeenCalledWith(
        'SELECT * FROM public."users" WHERE id = $1 LIMIT 1',
        ['5']
      );
    });

    it('should construct DELETE query with WHERE clause', async () => {
      mockProjectPool.query.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=3' };
      await DELETE(request, { params: mockParams });

      expect(mockProjectPool.query).toHaveBeenCalledWith(
        'DELETE FROM public."users" WHERE id = $1 RETURNING *',
        ['3']
      );
    });
  });

  describe('Column Filtering', () => {
    it('should filter out invalid columns in POST', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }, { column_name: 'email' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 'test@test.com' }] });

      const request = {
        json: async () => ({ name: 'Test', email: 'test@test.com', hacker: 'malicious' }),
      };

      await POST(request, { params: mockParams });

      const insertCall = mockProjectPool.query.mock.calls[1];
      expect(insertCall[1]).not.toContain('malicious');
      expect(insertCall[1]).toEqual(['Test', 'test@test.com']);
    });

    it('should filter out invalid columns in PUT', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Test', hacker: 'malicious' }),
      };

      await PUT(request, { params: mockParams });

      const updateCall = mockProjectPool.query.mock.calls[1];
      expect(updateCall[1]).not.toContain('malicious');
      expect(updateCall[1]).toEqual(['Test', '1']);
    });

    it('should handle multiple valid columns in POST', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ 
          rows: [
            { column_name: 'name' }, 
            { column_name: 'email' }, 
            { column_name: 'age' },
            { column_name: 'city' }
          ] 
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({ name: 'John', email: 'john@test.com', age: 30, city: 'NYC' }),
      };

      await POST(request, { params: mockParams });

      const insertCall = mockProjectPool.query.mock.calls[1];
      expect(insertCall[1].length).toBe(4);
      expect(insertCall[1]).toEqual(['John', 'john@test.com', 30, 'NYC']);
    });

    it('should handle multiple valid columns in PUT', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ 
          rows: [
            { column_name: 'name' }, 
            { column_name: 'email' }, 
            { column_name: 'age' }
          ] 
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'John', email: 'john@test.com', age: 30 }),
      };

      await PUT(request, { params: mockParams });

      const updateCall = mockProjectPool.query.mock.calls[1];
      expect(updateCall[1].length).toBe(4); // 3 columns + id
      expect(updateCall[1]).toEqual(['John', 'john@test.com', 30, '1']);
    });
  });

  describe('Project Pool Management', () => {
    it('should handle project not found error', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Project not found');
    });

    it('should query for project connection string when pool not cached', async () => {
      mockGetPool.mockReturnValueOnce(null);
      mockCreatePool.mockReturnValue(mockProjectPool);
      mockProjectPool.query.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      await GET(request, { params: mockParams });

      // Should query main pool for connection string
      expect(mockPoolQuery).toHaveBeenCalledWith(
        'SELECT connection_string FROM user_projects WHERE id = $1 AND is_active = true',
        ['proj-123']
      );
      expect(mockCreatePool).toHaveBeenCalled();
    });
  });

  describe('Response Validation', () => {
    it('should return rows array in GET response', async () => {
      const mockRows = [{ id: 1, name: 'User 1' }];
      mockProjectPool.query.mockResolvedValue({ rows: mockRows });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(data.rows).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
      expect(data.rows).toEqual(mockRows);
    });

    it('should return row object in POST response', async () => {
      const newRow = { id: 1, name: 'Test' };
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [newRow] });

      const request = { json: async () => ({ name: 'Test' }) };
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(data.row).toBeDefined();
      expect(data.row).toEqual(newRow);
    });

    it('should return row object in PUT response', async () => {
      const updatedRow = { id: 1, name: 'Updated' };
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Updated' })
      };
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(data.row).toBeDefined();
      expect(data.row).toEqual(updatedRow);
    });

    it('should return row object in DELETE response', async () => {
      const deletedRow = { id: 1, name: 'Deleted' };
      mockProjectPool.query.mockResolvedValue({ rows: [deletedRow] });

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=1' };
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(data.row).toBeDefined();
      expect(data.row).toEqual(deletedRow);
    });

    it('should return error object with proper structure on failure', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });
  });

  describe('String Literal Mutation Killers', () => {
    it('should use non-empty project key for pool management', async () => {
      mockGetPool.mockReturnValueOnce(null);
      mockCreatePool.mockReturnValue(mockProjectPool);
      mockProjectPool.query.mockResolvedValue({ rows: [] });

      const request = { url: 'http://localhost/api/imports/proj-xyz/users' };
      await GET(request, { params: { projectId: 'proj-xyz', table: 'users' } });

      // Verify createPool was called with a key containing the projectId
      expect(mockCreatePool).toHaveBeenCalled();
      const poolKey = mockCreatePool.mock.calls[0][0];
      expect(poolKey).toContain('proj-xyz');
      expect(poolKey.length).toBeGreaterThan(0);
    });

    it('should handle missing connection string error', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockResolvedValue({ rows: [{ connection_string: null }] });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
      expect(data.error).toContain('connection string');
    });

    it('should query information_schema for column names', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });

      const request = { json: async () => ({ name: 'Test' }) };
      await POST(request, { params: mockParams });

      const columnQuery = mockProjectPool.query.mock.calls[0][0];
      expect(columnQuery).toContain('information_schema.columns');
      expect(columnQuery).toContain('table_name');
      expect(columnQuery.length).toBeGreaterThan(0);
    });

    it('should pass table name parameter to column query', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = { json: async () => ({ name: 'Test' }) };
      await POST(request, { params: { projectId: 'proj-123', table: 'products' } });

      const columnQueryParams = mockProjectPool.query.mock.calls[0][1];
      expect(columnQueryParams).toContain('products');
      expect(columnQueryParams.length).toBeGreaterThan(0);
    });

    it('should use comma separator in INSERT column list', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }, { column_name: 'email' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = { json: async () => ({ name: 'John', email: 'john@test.com' }) };
      await POST(request, { params: mockParams });

      const insertQuery = mockProjectPool.query.mock.calls[1][0];
      expect(insertQuery).toContain('"name","email"');
      expect(insertQuery).toContain('$1,$2');
    });

    it('should use comma-space separator in UPDATE SET clause', async () => {
      mockProjectPool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }, { column_name: 'email' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'John', email: 'john@test.com' })
      };
      await PUT(request, { params: mockParams });

      const updateQuery = mockProjectPool.query.mock.calls[1][0];
      expect(updateQuery).toContain('"name" = $1, "email" = $2');
    });

    it('should return "Failed" as fallback error message when err.message is undefined', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockRejectedValue({ message: undefined });

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed');
    });

    it('should return actual error message when available in GET', async () => {
      mockGetPool.mockReturnValue(null);
      mockPoolQuery.mockRejectedValue(new Error('Custom error message'));

      const request = { url: 'http://localhost/api/imports/proj-123/users' };
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Custom error message');
    });

    it('should return actual error message when available in POST', async () => {
      mockProjectPool.query.mockRejectedValue(new Error('Insert failed'));

      const request = { json: async () => ({ name: 'Test' }) };
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Insert failed');
    });

    it('should return actual error message when available in PUT', async () => {
      mockProjectPool.query.mockRejectedValue(new Error('Update failed'));

      const request = {
        url: 'http://localhost/api/imports/proj-123/users?id=1',
        json: async () => ({ name: 'Test' })
      };
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Update failed');
    });

    it('should return actual error message when available in DELETE', async () => {
      mockProjectPool.query.mockRejectedValue(new Error('Delete failed'));

      const request = { url: 'http://localhost/api/imports/proj-123/users?id=1' };
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Delete failed');
    });
  });
});
