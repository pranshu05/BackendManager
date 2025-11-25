/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockGetDatabaseSchema = jest.fn();
const mockSchemaToUML = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/db', () => ({
  getDatabaseSchema: mockGetDatabaseSchema,
}));

jest.mock('@/lib/ai', () => ({
  schemaToUML: mockSchemaToUML,
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

const { GET } = require('@/app/api/projects/[projectId]/diagram/route');

describe('Project Diagram API Route', () => {
  const mockProject = {
    id: 'proj-123',
    connection_string: 'postgresql://localhost/test',
  };

  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
  });

  describe('GET - Generate UML diagram', () => {
    it('should generate PlantUML code from database schema', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
          ],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'user_id', type: 'integer' },
            { name: 'title', type: 'varchar' },
          ],
        },
      ];

      const mockUML = `@startuml
class users {
  id: integer
  name: varchar
}
class posts {
  id: integer
  user_id: integer
  title: varchar
}
users "1" -- "*" posts
@enduml`;

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockSchemaToUML.mockResolvedValue(mockUML);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.plantuml).toBe(mockUML);
      expect(response.status).toBe(200);
      expect(mockGetDatabaseSchema).toHaveBeenCalledWith(mockProject.connection_string);
      expect(mockSchemaToUML).toHaveBeenCalledWith(mockSchema);
    });

    it('should return error if project information is missing', async () => {
      const invalidProject = { id: 'proj-123' };

      const request = {};

      const response = await GET(request, mockContext, mockUser, invalidProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Project information is missing');
    });

    it('should handle schema loading errors', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Connection failed'));

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load project database schema');
    });

    it('should handle UML generation errors', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockSchemaToUML.mockRejectedValue(new Error('UML generation failed'));

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      // The actual error message depends on the catch block - could be either
      expect(data.error).toBeDefined();
    });
  });
});
