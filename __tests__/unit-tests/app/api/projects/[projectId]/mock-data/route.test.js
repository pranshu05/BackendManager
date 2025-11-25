/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockGenerateMockData = jest.fn();
const mockExecuteMockDataGeneration = jest.fn();
const mockAnalyzeSchemaForGeneration = jest.fn();
const mockMockDataTemplates = { ecommerce: { tables: {} }, social: { tables: {} } };

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/mock-data-generator', () => ({
  generateMockData: mockGenerateMockData,
  executeMockDataGeneration: mockExecuteMockDataGeneration,
  analyzeSchemaForGeneration: mockAnalyzeSchemaForGeneration,
  mockDataTemplates: mockMockDataTemplates,
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

const { POST, GET } = require('@/app/api/projects/[projectId]/mock-data/route');

describe('Project Mock Data API Route', () => {
  const mockProject = {
    id: 'proj-123',
    connection_string: 'postgresql://localhost/test',
    project_name: 'Test Project',
  };

  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
  });

  describe('POST - Generate Mock Data', () => {
    it('should generate preview data without inserting into database', async () => {
      const mockPreviewData = {
        data: {
          users: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }],
          posts: [{ id: 1, title: 'Post 1' }],
        },
        queries: ['INSERT INTO users...', 'INSERT INTO posts...'],
        summary: { totalRecords: 3 },
      };

      mockGenerateMockData.mockResolvedValue(mockPreviewData);

      const request = {
        json: async () => ({ config: {}, preview: true }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(mockGenerateMockData).toHaveBeenCalledWith(mockProject.connection_string, {});
      expect(data.success).toBe(true);
      expect(data.preview.users).toHaveLength(2);
      expect(data.queries).toHaveLength(2);
      expect(data.message).toBe('Mock data preview generated successfully');
    });

    it('should execute actual mock data generation', async () => {
      const mockResult = {
        success: true,
        data: { users: [{ id: 1 }] },
        summary: { totalRecords: 1 },
      };

      mockExecuteMockDataGeneration.mockResolvedValue(mockResult);

      const request = {
        json: async () => ({ config: { tables: { users: { count: 10 } } }, preview: false }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(mockExecuteMockDataGeneration).toHaveBeenCalledWith(
        mockProject.connection_string,
        { tables: { users: { count: 10 } } }
      );
      expect(data.success).toBe(true);
    });

    it('should use template configuration when template is specified', async () => {
      const mockResult = { success: true, data: {} };
      mockExecuteMockDataGeneration.mockResolvedValue(mockResult);

      const request = {
        json: async () => ({ template: 'ecommerce', config: { customField: 'value' }, preview: false }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteMockDataGeneration).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.objectContaining({ customField: 'value' })
      );
    });

    it('should handle errors during mock data generation', async () => {
      mockGenerateMockData.mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => ({ preview: true }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
      expect(data.message).toBe('Failed to generate mock data');
      expect(response.status).toBe(500);
    });
  });

  describe('GET - Schema Analysis', () => {
    it('should return schema analysis with suggestions', async () => {
      const mockAnalysis = {
        tables: {
          users: {
            name: 'users',
            columns: [{ name: 'id', type: 'integer' }, { name: 'email', type: 'varchar' }],
            dependencies: [],
          },
          posts: {
            name: 'posts',
            columns: [{ name: 'id', type: 'integer' }, { name: 'user_id', type: 'integer' }],
            dependencies: ['users'],
          },
        },
      };

      mockAnalyzeSchemaForGeneration.mockResolvedValue(mockAnalysis);

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(mockAnalyzeSchemaForGeneration).toHaveBeenCalledWith(mockProject.connection_string);
      expect(data.success).toBe(true);
      expect(data.analysis).toEqual(mockAnalysis);
      expect(data.suggestions).toBeDefined();
      expect(data.templates).toEqual(['ecommerce', 'social']);
      expect(data.message).toBe('Schema analysis completed successfully');
    });

    it('should handle errors during schema analysis', async () => {
      mockAnalyzeSchemaForGeneration.mockRejectedValue(new Error('Schema fetch failed'));

      const request = {};

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe('Schema fetch failed');
      expect(data.message).toBe('Failed to analyze schema');
      expect(response.status).toBe(500);
    });
  });
});
