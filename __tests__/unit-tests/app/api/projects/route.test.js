/**
 * @jest-environment node
 */

// Mock dependencies
const mockQuery = jest.fn();
const mockCreateUserDatabase = jest.fn();
const mockGetDatabaseSchema = jest.fn();

jest.mock('@/lib/db', () => ({
  pool: {
    query: (...args) => mockQuery(...args),
  },
  createUserDatabase: (...args) => mockCreateUserDatabase(...args),
  getDatabaseSchema: (...args) => mockGetDatabaseSchema(...args),
}));

jest.mock('@/lib/api-helpers', () => ({
  withAuth: (handler) => async (request, context, user) => {
    try {
      return await handler(request, context, user);
    } catch (error) {
      return {
        json: async () => ({
          success: false,
          error: error.message || 'An error occurred',
          timestamp: new Date().toISOString()
        }),
        status: 500
      };
    }
  },
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

describe('Projects API Route', () => {
  let GET, POST;

  beforeEach(() => {
    jest.clearAllMocks();
    const route = require('@/app/api/projects/route');
    GET = route.GET;
    POST = route.POST;
  });

  describe('GET /api/projects', () => {
    const mockUser = { id: 'user-123' };

    it('should return all active projects for user', async () => {
      const mockProjects = [
        {
          id: 1,
          project_name: 'Test Project',
          database_name: 'test_db',
          description: 'A test project',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          connection_string: 'postgres://localhost/test_db',
          table_count: 0,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockProjects });
      mockGetDatabaseSchema.mockResolvedValue([
        { table_name: 'users' },
        { table_name: 'posts' },
      ]);

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockUser.id]
      );
      expect(data.projects).toBeDefined();
      expect(data.projects.length).toBe(1);
      expect(data.projects[0].table_count).toBe(2);
      expect(data.projects[0].connection_string).toBeUndefined();
    });

    it('should return empty array when user has no projects', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(data.projects).toEqual([]);
    });

    it('should handle schema fetch errors gracefully', async () => {
      const mockProjects = [
        {
          id: 1,
          project_name: 'Test Project',
          connection_string: 'postgres://localhost/test_db',
          table_count: 0,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockProjects });
      mockGetDatabaseSchema.mockRejectedValue(new Error('Schema error'));

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(data.projects[0].table_count).toBe(0);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await GET({}, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/projects', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    it('should create a new project', async () => {
      const projectData = {
        projectName: 'New Project',
        description: 'A new project',
      };

      const mockConnectionString = 'postgres://localhost/new_project_123';
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'new_project_123',
        connectionString: mockConnectionString
      });
      // First query: check for existing project (should return empty)
      // Second query: insert new project
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              project_name: projectData.projectName,
              database_name: 'new_project_123',
              description: projectData.description,
              created_at: new Date(),
            },
          ],
        });

      const request = {
        json: async () => projectData,
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(mockCreateUserDatabase).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalled();
      expect(data.project).toBeDefined();
      expect(data.project.project_name).toBe(projectData.projectName);
    });

    it('should return 400 when project name is missing', async () => {
      const request = {
        json: async () => ({ description: 'No name' }),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle database creation errors', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing project
      mockCreateUserDatabase.mockRejectedValue(new Error('Creation failed'));

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle duplicate project names', async () => {
      // Mock finding an existing project with the same name
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const request = {
        json: async () => ({ projectName: 'Duplicate' }),
      };

      const response = await POST(request, {}, mockUser);

      expect(response.status).toBe(409);
    });
  });

  describe('Query Construction and Parameter Validation', () => {
    const mockUser = { id: 'user-123' };

    it('should include error message text in 400 response', async () => {
      const request = {
        json: async () => ({}),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(data.error).toBe('Project name is required');
      expect(data.error.length).toBeGreaterThan(0);
      expect(data.error).not.toBe('');
    });

    it('should execute duplicate check query with user ID and project name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'test_db',
        connectionString: 'postgres://localhost/test_db'
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      await POST(request, {}, mockUser);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM user_projects WHERE user_id = $1 AND project_name = $2',
        [mockUser.id, 'Test']
      );
    });

    it('should not pass empty array for duplicate check', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'test_db',
        connectionString: 'postgres://localhost/test_db'
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      await POST(request, {}, mockUser);

      const firstCallParams = mockQuery.mock.calls[0][1];
      expect(firstCallParams).not.toEqual([]);
      expect(firstCallParams.length).toBe(2);
    });

    it('should include error object in duplicate response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({ projectName: 'Duplicate' }),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Project with this name already exists');
      expect(data.error).not.toBe('');
    });

    it('should execute INSERT query with all parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'new_db',
        connectionString: 'postgres://localhost/new_db'
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          project_name: 'Test',
          database_name: 'new_db',
          description: 'Description',
          created_at: new Date()
        }]
      });

      const request = {
        json: async () => ({ projectName: 'Test', description: 'Description' }),
      };

      await POST(request, {}, mockUser);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO user_projects'),
        [mockUser.id, 'Test', 'new_db', 'Description', 'postgres://localhost/new_db']
      );
    });

    it('should not pass empty array to INSERT query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'new_db',
        connectionString: 'postgres://localhost/new_db'
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      await POST(request, {}, mockUser);

      const insertCallParams = mockQuery.mock.calls[1][1];
      expect(insertCallParams).not.toEqual([]);
      expect(insertCallParams.length).toBe(5);
    });

    it('should use empty string for missing description', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'new_db',
        connectionString: 'postgres://localhost/new_db'
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      await POST(request, {}, mockUser);

      const insertCallParams = mockQuery.mock.calls[1][1];
      expect(insertCallParams[3]).toBe('');
      expect(insertCallParams[3]).not.toBe('Stryker was here!');
    });

    it('should include success message in response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateUserDatabase.mockResolvedValue({
        databaseName: 'new_db',
        connectionString: 'postgres://localhost/new_db'
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, project_name: 'Test' }]
      });

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      const response = await POST(request, {}, mockUser);
      const data = await response.json();

      expect(data.message).toBe('Project created successfully');
      expect(data.message).not.toBe('');
      expect(data.message.length).toBeGreaterThan(0);
    });

    it('should log error message when schema fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockProjects = [{
        id: 1,
        connection_string: 'postgres://localhost/test',
        table_count: 0
      }];

      mockQuery.mockResolvedValue({ rows: mockProjects });
      mockGetDatabaseSchema.mockRejectedValue(new Error('Schema error'));

      await GET({}, {}, mockUser);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching schema for project'),
        expect.any(Error)
      );
      expect(consoleSpy.mock.calls[0][0]).not.toBe('');
      consoleSpy.mockRestore();
    });
  });
});
