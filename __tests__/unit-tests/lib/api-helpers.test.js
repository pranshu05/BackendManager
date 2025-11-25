// Mock dependencies BEFORE imports
const mockPoolQuery = jest.fn();
const mockRequireAuth = jest.fn();

jest.mock('@/lib/db', () => ({
  pool: { query: mockPoolQuery },
}));

jest.mock('@/lib/auth', () => ({
  requireAuth: mockRequireAuth,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      body,
      ...init,
    })),
  },
}));

// Store original env
const originalEnv = process.env;

// Import after mocks
const {
  verifyProjectOwnership,
  logQueryHistory,
  detectQueryType,
  createErrorResponse,
  createSuccessResponse,
  isAdmin,
  withAuth,
  withAdminAuth,
  withProjectAuth,
  createTimer,
} = require('@/lib/api-helpers');

const { NextResponse } = require('next/server');

describe('api-helpers library', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset env
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('verifyProjectOwnership', () => {
    it('should return project when user owns the project', async () => {
      const mockProject = {
        id: 'proj-123',
        connection_string: 'postgresql://localhost/test',
        database_name: 'test_db',
        project_name: 'Test Project',
      };

      mockPoolQuery.mockResolvedValue({ rows: [mockProject] });

      const result = await verifyProjectOwnership('proj-123', 'user-456');

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, connection_string, database_name, project_name'),
        ['proj-123', 'user-456']
      );
      expect(result.success).toBe(true);
      expect(result.project).toEqual(mockProject);
    });

    it('should return 404 error when project not found', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const result = await verifyProjectOwnership('nonexistent', 'user-123');

      expect(result.error).toBe('Project not found');
      expect(result.status).toBe(404);
    });

    it('should return 404 when user does not own the project', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });

      const result = await verifyProjectOwnership('proj-123', 'wrong-user');

      expect(result.error).toBe('Project not found');
      expect(result.status).toBe(404);
    });
  });

  describe('logQueryHistory', () => {
    it('should log query history successfully with all parameters', async () => {
      const logData = {
        projectId: 'proj-123',
        userId: 'user-456',
        queryText: 'SELECT * FROM users',
        queryType: 'SELECT',
        naturalLanguageInput: 'Show all users',
        executionTime: 123,
        success: true,
        errorMessage: null,
      };

      mockPoolQuery.mockResolvedValue({ rows: [] });

      await logQueryHistory(logData);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO query_history'),
        ['proj-123', 'user-456', 'SELECT * FROM users', 'SELECT', 'Show all users', 123, true, null]
      );
    });

    it('should log query history with minimal parameters (defaults)', async () => {
      const logData = {
        projectId: 'proj-123',
        userId: 'user-456',
        queryText: 'DELETE FROM temp',
        queryType: 'DELETE',
        executionTime: 50,
        success: false,
      };

      mockPoolQuery.mockResolvedValue({ rows: [] });

      await logQueryHistory(logData);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO query_history'),
        ['proj-123', 'user-456', 'DELETE FROM temp', 'DELETE', null, 50, false, null]
      );
    });

    it('should not throw error when logging fails', async () => {
      const logData = {
        projectId: 'proj-123',
        userId: 'user-456',
        queryText: 'SELECT 1',
        queryType: 'SELECT',
        executionTime: 10,
        success: true,
      };

      mockPoolQuery.mockRejectedValue(new Error('DB connection failed'));

      await expect(logQueryHistory(logData)).resolves.not.toThrow();
    });
  });

  describe('detectQueryType', () => {
    it('should detect SELECT queries', () => {
      expect(detectQueryType('SELECT * FROM users')).toBe('SELECT');
      expect(detectQueryType('  select id from posts  ')).toBe('SELECT');
      expect(detectQueryType('SeLeCt * FROM test')).toBe('SELECT');
    });

    it('should detect INSERT queries', () => {
      expect(detectQueryType("INSERT INTO users VALUES (1, 'test')")).toBe('INSERT');
      expect(detectQueryType('  insert into posts values (1)  ')).toBe('INSERT');
    });

    it('should detect UPDATE queries', () => {
      expect(detectQueryType("UPDATE users SET name = 'test'")).toBe('UPDATE');
      expect(detectQueryType("  update posts set title = 'new'  ")).toBe('UPDATE');
    });

    it('should detect DELETE queries', () => {
      expect(detectQueryType('DELETE FROM users WHERE id = 1')).toBe('DELETE');
      expect(detectQueryType('  delete from posts  ')).toBe('DELETE');
    });

    it('should detect CREATE TABLE queries', () => {
      expect(detectQueryType('CREATE TABLE users (id INT)')).toBe('CREATE');
      expect(detectQueryType('  create table posts (id int)  ')).toBe('CREATE');
    });

    it('should detect ALTER TABLE queries', () => {
      expect(detectQueryType('ALTER TABLE users ADD COLUMN age INT')).toBe('ALTER');
    });

    it('should detect DROP TABLE queries', () => {
      expect(detectQueryType('DROP TABLE users')).toBe('DROP');
    });

    it('should detect CREATE INDEX queries', () => {
      expect(detectQueryType('CREATE INDEX idx_name ON users (name)')).toBe('CREATE');
    });

    it('should detect DROP INDEX queries', () => {
      expect(detectQueryType('DROP INDEX idx_name')).toBe('DROP');
    });

    it('should detect TRUNCATE queries', () => {
      expect(detectQueryType('TRUNCATE TABLE users')).toBe('TRUNCATE');
    });

    it('should return OTHER for unrecognized queries', () => {
      expect(detectQueryType('EXPLAIN SELECT * FROM users')).toBe('OTHER');
      expect(detectQueryType('SHOW TABLES')).toBe('OTHER');
      expect(detectQueryType('')).toBe('OTHER');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with default status 500', () => {
      const error = new Error('Something went wrong');
      const response = createErrorResponse(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Something went wrong',
          timestamp: expect.any(String),
        }),
        { status: 500 }
      );
      expect(response.status).toBe(500);
    });

    it('should create error response with custom status code', () => {
      const error = new Error('Not found');
      const response = createErrorResponse(error, 404);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not found',
        }),
        { status: 404 }
      );
      expect(response.status).toBe(404);
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n  at test.js:10';

      createErrorResponse(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Dev error',
          stack: expect.stringContaining('Error: Dev error'),
        }),
        { status: 500 }
      );
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Prod error');
      error.stack = 'Error: Prod error\n  at prod.js:10';

      createErrorResponse(error);

      const callArgs = NextResponse.json.mock.calls[0][0];
      expect(callArgs.success).toBe(false);
      expect(callArgs.stack).toBeUndefined();
    });

    it('should handle error without message', () => {
      const error = {};
      createErrorResponse(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'An error occurred',
        }),
        { status: 500 }
      );
    });
  });

  describe('createSuccessResponse', () => {
    it("should create success response with data", () => {
      const data = { users: [{ id: 1, name: "John" }] };
      createSuccessResponse(data);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: true,
          users: [{ id: 1, name: "John" }],
        },
        { status: 200 }
      );
    });

    it("should include message when provided", () => {
      const data = { count: 5 };
      createSuccessResponse(data, "Operation completed successfully");

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: true,
          count: 5,
          message: "Operation completed successfully",
        },
        { status: 200 }
      );
    });

    it("should use custom status code", () => {
      const data = { id: "new-123" };
      createSuccessResponse(data, "Created", 201);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          id: "new-123",
          message: "Created",
        }),
        { status: 201 }
      );
    });

    it("should not include message when null", () => {
      const data = { result: "ok" };
      createSuccessResponse(data, null, 200);

      const callArgs = NextResponse.json.mock.calls[0][0];
      expect(callArgs.message).toBeUndefined();
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin email", () => {
      process.env.ADMIN_EMAILS = "admin@test.com,superadmin@test.com";
      expect(isAdmin("admin@test.com")).toBe(true);
      expect(isAdmin("superadmin@test.com")).toBe(true);
    });

    it("should be case-insensitive", () => {
      process.env.ADMIN_EMAILS = "Admin@Test.COM";
      expect(isAdmin("admin@test.com")).toBe(true);
      expect(isAdmin("ADMIN@TEST.COM")).toBe(true);
    });

    it("should return false for non-admin email", () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      expect(isAdmin("user@test.com")).toBe(false);
    });

    it("should return false when email is null or undefined", () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin("")).toBe(false);
    });

    it("should return false when ADMIN_EMAILS is not set", () => {
      delete process.env.ADMIN_EMAILS;
      expect(isAdmin("admin@test.com")).toBe(false);
    });

    it("should handle whitespace in ADMIN_EMAILS", () => {
      process.env.ADMIN_EMAILS = " admin@test.com , user@test.com ";
      expect(isAdmin("admin@test.com")).toBe(true);
      expect(isAdmin("user@test.com")).toBe(true);
    });

    it("should ignore empty entries in ADMIN_EMAILS", () => {
      process.env.ADMIN_EMAILS = "admin@test.com,,  ,user@test.com";
      expect(isAdmin("admin@test.com")).toBe(true);
      expect(isAdmin("user@test.com")).toBe(true);
    });
  });

  describe("withAuth", () => {
    it("should call handler with authenticated user", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const wrappedHandler = withAuth(mockHandler);

      const mockRequest = { headers: { get: () => "Bearer token" } };
      const mockContext = {};

      await wrappedHandler(mockRequest, mockContext);

      expect(mockRequireAuth).toHaveBeenCalledWith(mockRequest);
      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockContext, mockUser);
    });

    it("should return error response when auth fails", async () => {
      mockRequireAuth.mockResolvedValueOnce({
        error: "Invalid token",
        status: 401,
      });

      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);

      await wrappedHandler({ headers: { get: () => null } }, {});

      expect(mockHandler).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Invalid token" },
        { status: 401 }
      );
    });

    it("should catch and handle handler errors", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn().mockRejectedValue(new Error("Handler error"));
      const wrappedHandler = withAuth(mockHandler);

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, {});

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Handler error",
        }),
        { status: 500 }
      );
    });
  });

  describe("withAdminAuth", () => {
    it("should call handler when user is admin", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      const mockUser = { id: "admin-123", email: "admin@test.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const wrappedHandler = withAdminAuth(mockHandler);

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, {});

      expect(mockHandler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        mockUser
      );
    });

    it("should return 403 when user is not admin", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      const mockUser = { id: "user-123", email: "user@test.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn();
      const wrappedHandler = withAdminAuth(mockHandler);

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, {});

      expect(mockHandler).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    });

    it("should return error when auth fails", async () => {
      mockRequireAuth.mockResolvedValueOnce({
        error: "No token",
        status: 401,
      });

      const mockHandler = jest.fn();
      const wrappedHandler = withAdminAuth(mockHandler);

      await wrappedHandler({ headers: { get: () => null } }, {});

      expect(mockHandler).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "No token" },
        { status: 401 }
      );
    });

    it("should catch and handle handler errors in admin route", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      const mockUser = { id: "admin-123", email: "admin@test.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn().mockRejectedValue(new Error("Admin handler error"));
      const wrappedHandler = withAdminAuth(mockHandler);

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, {});

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Admin handler error",
        }),
        { status: 500 }
      );
    });
  });

  describe("withProjectAuth", () => {
    it("should call handler when user owns project", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockProject = {
        id: "proj-456",
        connection_string: "postgresql://localhost/test",
        database_name: "test_db",
        project_name: "Test Project",
      };

      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });
      mockPoolQuery.mockResolvedValueOnce({ rows: [mockProject] });

      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const wrappedHandler = withProjectAuth(mockHandler);

      const mockRequest = { headers: { get: () => "Bearer token" } };
      const mockContext = { params: Promise.resolve({ projectId: "proj-456" }) };

      await wrappedHandler(mockRequest, mockContext);

      expect(mockRequireAuth).toHaveBeenCalledWith(mockRequest);
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1 AND user_id = $2"),
        ["proj-456", "user-123"]
      );
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockContext,
        mockUser,
        mockProject
      );
    });

    it("should return 400 when projectId is missing", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn();
      const wrappedHandler = withProjectAuth(mockHandler);

      const mockContext = { params: Promise.resolve({}) };

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, mockContext);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Project ID is required",
        }),
        { status: 400 }
      );
    });

    it("should return 404 when project not found", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const mockHandler = jest.fn();
      const wrappedHandler = withProjectAuth(mockHandler);

      const mockContext = { params: Promise.resolve({ projectId: "nonexistent" }) };

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, mockContext);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Project not found" },
        { status: 404 }
      );
    });

    it("should catch and handle errors in project auth", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockRequireAuth.mockResolvedValueOnce({ user: mockUser });

      const mockHandler = jest.fn();
      const wrappedHandler = withProjectAuth(mockHandler);

      // Make context.params throw an error
      const mockContext = {
        params: Promise.reject(new Error("Context params error")),
      };

      await wrappedHandler({ headers: { get: () => "Bearer token" } }, mockContext);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Context params error",
        }),
        { status: 500 }
      );
    });
  });

  describe("createTimer", () => {
    it("should measure elapsed time", async () => {
      const timer = createTimer();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const elapsed = timer.elapsed();
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(100);
    });

    it("should return execution time on end()", async () => {
      const timer = createTimer();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = timer.end();

      expect(result.executionTime).toBeGreaterThanOrEqual(100);
      expect(result.executionTimeSeconds).toMatch(/^\d+\.\d{3}$/);
      expect(parseFloat(result.executionTimeSeconds)).toBeGreaterThanOrEqual(0.1);
    });

    it("should format execution time to 3 decimal places", () => {
      const timer = createTimer();
      const result = timer.end();

      expect(result.executionTimeSeconds).toMatch(/^\d+\.\d{3}$/);
    });
  });
});

