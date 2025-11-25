/**
 * @jest-environment node
 */

// Mock dependencies
const mockQuery = jest.fn();
const mockDeleteUserDatabase = jest.fn();

jest.mock('@/lib/db', () => ({
  pool: {
    query: (...args) => mockQuery(...args),
  },
  deleteUserDatabase: (...args) => mockDeleteUserDatabase(...args),
}));

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: (handler) => async (request, context, user, project) => {
    try {
      return await handler(request, context, user, project);
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

describe('Project Detail API Route', () => {
  let GET, PUT, DELETE;

  beforeEach(() => {
    jest.clearAllMocks();
    const route = require('@/app/api/projects/[projectId]/route');
    GET = route.GET;
    PUT = route.PUT;
    DELETE = route.DELETE;
  });

  describe('GET /api/projects/[projectId]', () => {
    const mockUser = { id: 'user-123' };
    const mockProject = {
      id: 1,
      project_name: 'Test Project',
      database_name: 'test_db',
      connection_string: 'postgres://localhost/test_db',
    };

    it('should return project details', async () => {
      const response = await GET({}, {}, mockUser, mockProject);
      const data = await response.json();

      expect(data.project).toBeDefined();
      expect(data.project.id).toBe(mockProject.id);
      expect(data.project.project_name).toBe(mockProject.project_name);
    });
  });

  describe('PUT /api/projects/[projectId]', () => {
    const mockUser = { id: 'user-123' };
    const mockProject = {
      id: 1,
      project_name: 'Test Project',
      database_name: 'test_db',
    };

    it('should update project successfully', async () => {
      const updateData = {
        projectName: 'Updated Project',
        description: 'Updated description',
      };

      mockQuery.mockResolvedValue({
        rows: [
          {
            id: mockProject.id,
            project_name: updateData.projectName,
            database_name: mockProject.database_name,
            description: updateData.description,
            updated_at: new Date(),
          },
        ],
      });

      const request = {
        json: async () => updateData,
      };

      const response = await PUT(request, {}, mockUser, mockProject);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalled();
      expect(data.message).toBe('Project updated successfully');
      expect(data.project.project_name).toBe(updateData.projectName);
    });

    it('should return 404 when project not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({ projectName: 'Updated' }),
      };

      const response = await PUT(request, {}, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('should handle partial updates', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: mockProject.id,
            project_name: 'Partial Update',
            database_name: mockProject.database_name,
          },
        ],
      });

      const request = {
        json: async () => ({ projectName: 'Partial Update' }),
      };

      const response = await PUT(request, {}, mockUser, mockProject);
      const data = await response.json();

      expect(data.project).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => ({ projectName: 'Test' }),
      };

      const response = await PUT(request, {}, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/projects/[projectId]', () => {
    const mockUser = { id: 'user-123' };

    it('should delete project successfully', async () => {
      const mockProject = {
        id: 1,
        project_name: 'Test Project',
        connection_string: 'postgres://localhost/test_db',
      };

      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] }); // DELETE returns id

      const response = await DELETE({}, {}, mockUser, mockProject);
      const data = await response.json();

      // deleteUserDatabase should NOT be called for non-Neon projects
      expect(mockDeleteUserDatabase).not.toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalled();
      expect(data.message).toBeDefined();
    });

    it('should handle Neon managed projects', async () => {
      process.env.NEON_HOST_HINT = 'neon.tech';
      
      const mockProject = {
        id: 1,
        connection_string: 'postgres://neon.tech/test_db',
        database_name: 'test_db'
      };

      mockDeleteUserDatabase.mockResolvedValue();
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const response = await DELETE({}, {}, mockUser, mockProject);
      const data = await response.json();

      // deleteUserDatabase SHOULD be called for Neon projects
      expect(mockDeleteUserDatabase).toHaveBeenCalled();
      expect(data.message).toBeDefined();
    });

    it('should handle deletion errors', async () => {
      const mockProject = {
        id: 1,
        connection_string: 'postgres://neon.tech/test_db',
        database_name: 'test_db'
      };

      mockDeleteUserDatabase.mockRejectedValue(new Error('Deletion failed'));

      const response = await DELETE({}, {}, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle project not found during deletion', async () => {
      const mockProject = {
        id: 1,
        connection_string: 'postgres://localhost/test_db',
      };

      mockQuery.mockResolvedValue({ rows: [] }); // No rows returned means not found

      const response = await DELETE({}, {}, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });
  });
});
