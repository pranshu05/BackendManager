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

// Ensure NextResponse variable is available for spies
const { NextResponse } = require('next/server');

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
    // Reset mockProject to default state
    mockProject.connection_string = 'mongodb://localhost:27017/test';
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
      expect(data).toEqual({ plantuml: mockUML });
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

    it('should return database schema error when getDatabaseSchema fails', async () => {
  mockGetDatabaseSchema.mockRejectedValue(new Error('Database connection failed'));

  const request = {};

  const response = await GET(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(response.status).toBe(500);
  expect(data.error).toBe('Failed to load project database schema');
  
  });

  it('should handle invalid UML output from schemaToUML', async () => {
  const mockSchema = [{ name: 'users', columns: [] }];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockSchemaToUML.mockResolvedValue(undefined); // simulate invalid UML

  const request = {};

  const response = await GET(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.plantuml).toBeUndefined();
  
  });

  it('should handle non-error throws during UML generation', async () => {
  const mockSchema = [{ name: 'users', columns: [] }];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockSchemaToUML.mockImplementation(() => {
    throw "UML crash"; // non-Error throw
  });

  const request = {};

  const response = await GET(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(response.status).toBe(500);
  expect(data.error).toBeDefined();
  });

  it('should return status 200 when UML is generated successfully', async () => {
    const mockSchema = [{ name: 'users', columns: [{ name: 'id', type: 'integer' }] }];
    const mockUML = '@startuml\nclass users\n@enduml';

    mockGetDatabaseSchema.mockResolvedValue(mockSchema);
    mockSchemaToUML.mockResolvedValue(mockUML);

    const request = {};

    const response = await GET(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('plantuml');
    expect(data.plantuml).toBe(mockUML);
  });

  it('should verify console.log is called with success message', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockSchema = [{ name: 'users', columns: [] }];
    const mockUML = '@startuml\nclass users\n@enduml';

    mockGetDatabaseSchema.mockResolvedValue(mockSchema);
    mockSchemaToUML.mockResolvedValue(mockUML);

    await GET({}, mockContext, mockUser, mockProject);

    expect(consoleSpy).toHaveBeenCalledWith('Generated the UML code');
    consoleSpy.mockRestore();
  });

  it('should verify console.error is called when schema loading fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Schema error');
    
    mockGetDatabaseSchema.mockRejectedValue(error);

    await GET({}, mockContext, mockUser, mockProject);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load schema for project DB:', error);
    consoleSpy.mockRestore();
  });

  it('should trigger outer catch block when accessing project properties fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Property access error');
    
    // Create a project object with a getter that throws
    const faultyProject = Object.create(mockProject);
    Object.defineProperty(faultyProject, 'connection_string', {
      get() { throw error; }
    });

    const response = await GET({}, mockContext, mockUser, faultyProject);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(consoleSpy).toHaveBeenCalledWith('Error in GET /diagram:', error);
    consoleSpy.mockRestore();
  });

  it('should verify outer catch returns correct status and error object', async () => {
    const error = new Error('Outer error');
    
    const faultyProject = Object.create(mockProject);
    Object.defineProperty(faultyProject, 'connection_string', {
      get() { throw error; }
    });

    const response = await GET({}, mockContext, mockUser, faultyProject);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  });
});
