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
});
