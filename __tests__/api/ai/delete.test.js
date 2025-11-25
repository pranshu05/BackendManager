// Mock dependencies BEFORE imports
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();
let capturedHandler;

jest.mock('@/lib/db', () => ({
  executeQuery: mockExecuteQuery,
  getDatabaseSchema: mockGetDatabaseSchema,
  pool: { query: jest.fn() },
}));

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: jest.fn((handler) => {
    capturedHandler = handler;
    return handler;
  }),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      ...init,
    })),
  },
}));

// Import the route to capture the handler
require('@/app/api/projects/[projectId]/delete/route');

describe('DELETE /api/projects/[projectId]/delete', () => {
  let mockRequest;
  let mockUser;
  let mockProject;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      json: jest.fn(),
    };

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    mockProject = {
      id: 'test-project-123',
      connection_string: 'postgresql://localhost:5432/testdb',
      database_name: 'testdb',
      project_name: 'Test Project',
    };
  });

  const callHandler = async () => {
    return capturedHandler(mockRequest, {}, mockUser, mockProject);
  };

  describe('Successful deletion', () => {
    it('should delete a single record successfully', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', data_type: 'integer' },
            { name: 'name', type: 'text', data_type: 'text' },
          ],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted successfully');
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('DELETE FROM "users"'),
        [1]
      );
    });

    it('should delete multiple records successfully', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'id', type: 'integer', data_type: 'integer' }],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [], rowCount: 3 });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('DELETE FROM "users"'),
        [1, 2, 3]
      );
    });

    it('should handle composite primary keys', async () => {
      const mockSchema = [
        {
          name: 'order_items',
          columns: [
            { name: 'order_id', type: 'integer', data_type: 'integer' },
            { name: 'product_id', type: 'integer', data_type: 'integer' },
          ],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'order_items',
        pkcols: ['order_id', 'product_id'],
        pkvalues: [
          { order_id: 100, product_id: 1 },
          { order_id: 100, product_id: 2 },
        ],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [], rowCount: 2 });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('DELETE FROM "order_items"'),
        [100, 1, 100, 2]
      );
    });

    it('should handle UUID type casting correctly', async () => {
      const mockSchema = [
        {
          name: 'products',
          columns: [{ name: 'id', type: 'uuid', data_type: 'uuid' }],
        },
      ];

      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.json.mockResolvedValue({
        table: 'products',
        pkcols: ['id'],
        pkvalues: [{ id: uuid }],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      const query = mockExecuteQuery.mock.calls[0][1];
      expect(query).toContain('::uuid');
    });
  });

  describe('Validation errors', () => {
    it('should return 400 if project connection_string is missing', async () => {
      mockProject.connection_string = null;

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Project information is missing');
    });

    it('should return 400 if table is missing', async () => {
      mockRequest.json.mockResolvedValue({
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 if pkcols is missing', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkvalues: [{ id: 1 }],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 if pkvalues is missing', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 if pkvalues is not an array', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: 'not-an-array',
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('pkvalues must be a non-empty array of objects');
    });

    it('should return 400 if pkvalues is an empty array', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('pkvalues must be a non-empty array of objects');
    });

    it('should return 400 if pkvalues contains non-objects', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [1, 2, 3],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('pkvalues must be a non-empty array of objects');
    });

    it('should return 400 if pkcols is not an array', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: 'id',
        pkvalues: [{ id: 1 }],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('pkcols required');
    });

    it('should return 400 if pkcols is empty', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: [],
        pkvalues: [{ id: 1 }],
      });

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('pkcols required');
    });

    it('should return 400 if table does not exist in schema', async () => {
      const mockSchema = [
        {
          name: 'other_table',
          columns: [{ name: 'id', type: 'integer', data_type: 'integer' }],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Table not found');
    });

    it('should return 400 if primary key column does not exist in table', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'user_id', type: 'integer', data_type: 'integer' },
          ],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Primary key column not found');
    });

    it('should return 400 if pk value is missing for a column', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', data_type: 'integer' },
            { name: 'email', type: 'text', data_type: 'text' },
          ],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id', 'email'],
        pkvalues: [{ id: 1 }], // missing email
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing pk value');
    });
  });

  describe('Database errors', () => {
    it('should return 500 if schema loading fails', async () => {
      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      mockGetDatabaseSchema.mockRejectedValue(new Error('Database connection failed'));

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain('Failed to load project database schema');
    });

    it('should return 500 if delete query execution fails', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'id', type: 'integer', data_type: 'integer' }],
        },
      ];

      mockRequest.json.mockResolvedValue({
        table: 'users',
        pkcols: ['id'],
        pkvalues: [{ id: 1 }],
      });

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Query execution failed'));

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });

    it('should return 500 if request.json() throws an error', async () => {
      mockRequest.json.mockRejectedValue(new Error('Invalid JSON'));

      const response = await callHandler();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('Type casting verification', () => {
    const testCases = [
      { type: 'uuid', expectedCast: '::uuid' },
      { type: 'integer', expectedCast: '::integer' },
      { type: 'bigint', expectedCast: '::bigint' },
      { type: 'numeric', expectedCast: '::numeric' },
      { type: 'boolean', expectedCast: '::boolean' },
      { type: 'jsonb', expectedCast: '::jsonb' },
      { type: 'timestamp', expectedCast: '::timestamp' },
      { type: 'text', expectedCast: '::text' },
    ];

    testCases.forEach(({ type, expectedCast }) => {
      it(`should cast ${type} correctly to ${expectedCast}`, async () => {
        const mockSchema = [
          {
            name: 'test_table',
            columns: [{ name: 'test_col', type, data_type: type }],
          },
        ];

        mockRequest.json.mockResolvedValue({
          table: 'test_table',
          pkcols: ['test_col'],
          pkvalues: [{ test_col: 'test_value' }],
        });

        mockGetDatabaseSchema.mockResolvedValue(mockSchema);
        mockExecuteQuery.mockResolvedValue({ rows: [], rowCount: 1 });

        const response = await callHandler();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        const query = mockExecuteQuery.mock.calls[0][1];
        expect(query).toContain(expectedCast);
      });
    });
  });
});
