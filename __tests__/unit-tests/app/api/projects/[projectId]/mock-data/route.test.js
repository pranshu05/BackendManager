/**
 * @jest-environment node
 */

const mockWithProjectAuth = jest.fn((handler) => handler);
const mockGenerateMockData = jest.fn();
const mockExecuteMockDataGeneration = jest.fn();
const mockAnalyzeSchemaForGeneration = jest.fn();
const mockMockDataTemplates = {
  ecommerce: { tables: { products: { count: 100 } } },
  blog: { tables: { posts: { count: 50 } } }
};

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/mock-data-generator', () => ({
  generateMockData: mockGenerateMockData,
  executeMockDataGeneration: mockExecuteMockDataGeneration,
  analyzeSchemaForGeneration: mockAnalyzeSchemaForGeneration,
  mockDataTemplates: mockMockDataTemplates
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

describe('Mock Data API Route', () => {
  const mockProject = { id: 'proj-123', connection_string: 'postgresql://localhost/test' };
  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWithProjectAuth.mockImplementation((handler) => handler);
  });

  describe('POST - Template Validation', () => {
    it('should skip template merge when template is null', async () => {
      const mockData = { data: { users: [] }, queries: [], summary: { total: 0 } };
      mockGenerateMockData.mockResolvedValue(mockData);

      const request = { json: async () => ({ preview: true, config: { tables: { users: { count: 10 } } }, template: null }) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockGenerateMockData).toHaveBeenCalledWith(expect.any(String), { tables: { users: { count: 10 } } });
    });

    it('should use only config when template is invalid', async () => {
      const mockData = { data: { users: [] }, queries: [], summary: { total: 0 } };
      mockGenerateMockData.mockResolvedValue(mockData);

      const customConfig = { tables: { posts: { count: 5 } } };
      const request = { json: async () => ({ preview: true, config: customConfig, template: 'invalid' }) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Should use config as-is since 'invalid' template doesn't exist
      expect(mockGenerateMockData).toHaveBeenCalledWith(expect.any(String), customConfig);
    });
  });

  describe('POST - Preview Mode', () => {
    it('should generate preview with limited data', async () => {
      const mockData = {
        data: { users: Array(10).fill({ id: 1, name: 'Test' }), posts: Array(5).fill({ id: 1 }) },
        queries: ['INSERT 1', 'INSERT 2', 'INSERT 3', 'INSERT 4', 'INSERT 5', 'INSERT 6'],
        summary: { total: 15 }
      };
      mockGenerateMockData.mockResolvedValue(mockData);

      const request = { json: async () => ({ preview: true, config: {} }) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.preview.users).toHaveLength(3);
      expect(data.preview.posts).toHaveLength(3);
      expect(data.queries).toHaveLength(5);
      expect(mockGenerateMockData).toHaveBeenCalledWith(mockProject.connection_string, {});
    });

    it('should use template config when provided', async () => {
      mockGenerateMockData.mockResolvedValue({ data: {}, queries: [], summary: {} });

      const request = { json: async () => ({ preview: true, template: 'ecommerce', config: { custom: true } }) };
      await POST(request, mockContext, mockUser, mockProject);

      expect(mockGenerateMockData).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.objectContaining({ tables: { products: { count: 100 } }, custom: true })
      );
    });

    it('should handle empty data in preview', async () => {
      mockGenerateMockData.mockResolvedValue({ data: {}, queries: [], summary: {} });

      const request = { json: async () => ({ preview: true }) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.preview).toEqual({});
    });
  });

  describe('POST - Execution Mode', () => {
    it('should execute mock data generation', async () => {
      const mockResult = { success: true, inserted: 100, message: 'Data inserted' };
      mockExecuteMockDataGeneration.mockResolvedValue(mockResult);

      const request = { json: async () => ({ preview: false, config: { count: 100 } }) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data).toEqual(mockResult);
      expect(mockExecuteMockDataGeneration).toHaveBeenCalledWith(
        mockProject.connection_string,
        { count: 100 }
      );
    });

    it('should merge template with config in execution', async () => {
      mockExecuteMockDataGeneration.mockResolvedValue({ success: true });

      const request = { json: async () => ({ template: 'blog', config: { override: true } }) };
      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteMockDataGeneration).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.objectContaining({ tables: { posts: { count: 50 } }, override: true })
      );
    });

    it('should use empty config as default', async () => {
      mockExecuteMockDataGeneration.mockResolvedValue({ success: true });

      const request = { json: async () => ({}) };
      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteMockDataGeneration).toHaveBeenCalledWith(mockProject.connection_string, {});
    });
  });

  describe('POST - Error Handling', () => {
    it('should handle preview errors', async () => {
      mockGenerateMockData.mockRejectedValue(new Error('Preview failed'));

      const request = { json: async () => ({ preview: true }) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Preview failed');
    });

    it('should handle execution errors', async () => {
      mockExecuteMockDataGeneration.mockRejectedValue(new Error('Execution failed'));

      const request = { json: async () => ({}) };
      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGenerateMockData.mockRejectedValue(new Error('Test error'));

      const request = { json: async () => ({ preview: true }) };
      await POST(request, mockContext, mockUser, mockProject);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Mock data generation error:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET - Schema Analysis', () => {
    const mockAnalysis = {
      tables: {
        users: { name: 'users', columns: [{ name: 'email', type: 'varchar' }], dependencies: [] },
        categories: { name: 'categories', columns: [{ name: 'name', type: 'varchar' }], dependencies: [] },
        orders: { name: 'orders', columns: [{ name: 'amount', type: 'decimal' }], dependencies: [] },
        posts: { name: 'posts', columns: [{ name: 'title', type: 'text' }], dependencies: [] },
        comments: { name: 'comments', columns: [{ name: 'text', type: 'text' }], dependencies: [] },
        products: { name: 'products', columns: [{ name: 'price', type: 'decimal' }], dependencies: [] }
      }
    };

    it('should return schema analysis with suggestions', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue(mockAnalysis);

      const request = {};
      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.analysis).toEqual(mockAnalysis);
      expect(data.suggestions).toBeDefined();
      expect(data.templates).toEqual(['ecommerce', 'blog']);
      expect(mockAnalyzeSchemaForGeneration).toHaveBeenCalledWith(mockProject.connection_string);
    });

    it('should suggest counts for reference tables (category)', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { categories: { name: 'categories', columns: [], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.categories.recommendedCount).toBe(5);
    });

    it('should suggest counts for user tables', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.recommendedCount).toBe(50);
    });

    it('should suggest counts for transaction tables', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { orders: { name: 'orders', columns: [], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.orders.recommendedCount).toBe(200);
    });

    it('should suggest counts for content tables', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { posts: { name: 'posts', columns: [], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.posts.recommendedCount).toBe(100);
    });

    it('should suggest counts for comment tables', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { comments: { name: 'comments', columns: [], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.comments.recommendedCount).toBe(300);
    });

    it('should suggest default count for unknown tables', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { unknown: { name: 'unknown', columns: [], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.unknown.recommendedCount).toBe(10);
    });

    it('should suggest patterns for email columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [{ name: 'email', type: 'varchar' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.email).toEqual({
        pattern: 'email',
        description: 'Email address field'
      });
    });

    it('should suggest patterns for phone columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [{ name: 'phone', type: 'varchar' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.phone.pattern).toBe('phone');
    });

    it('should suggest ranges for price columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { products: { name: 'products', columns: [{ name: 'price', type: 'decimal' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.products.columnSuggestions.price).toMatchObject({
        min: 1,
        max: 1000,
        precision: 2
      });
    });

    it('should suggest ranges for age columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [{ name: 'age', type: 'int' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.age).toMatchObject({ min: 18, max: 80 });
    });

    it('should suggest ranges for year columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { events: { name: 'events', columns: [{ name: 'year', type: 'int' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.events.columnSuggestions.year.min).toBe(2000);
      expect(data.suggestions.events.columnSuggestions.year.max).toBeGreaterThanOrEqual(2024);
    });

    it('should suggest ranges for quantity columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { orders: { name: 'orders', columns: [{ name: 'quantity', type: 'int' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.orders.columnSuggestions.quantity).toMatchObject({ min: 1, max: 100 });
    });

    it('should suggest patterns for URL columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [{ name: 'website', type: 'varchar' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.website.pattern).toBe('url');
    });

    it('should suggest patterns for code columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { products: { name: 'products', columns: [{ name: 'code', type: 'varchar' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.products.columnSuggestions.code.pattern).toBe('alphanumeric');
    });

    it('should suggest date ranges for created_at columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [{ name: 'created_at', type: 'timestamp' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.created_at.startDate).toBe('2020-01-01');
      expect(data.suggestions.users.columnSuggestions.created_at.endDate).toBeDefined();
    });

    it('should suggest date ranges for birth_date columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: { users: { name: 'users', columns: [{ name: 'birth_date', type: 'date' }], dependencies: [] } }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.birth_date).toMatchObject({
        startDate: '1950-01-01',
        endDate: '2005-12-31'
      });
    });

    it('should handle multiple column types in one table', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          users: {
            name: 'users',
            columns: [
              { name: 'email', type: 'varchar' },
              { name: 'age', type: 'int' },
              { name: 'created_at', type: 'timestamp' }
            ],
            dependencies: []
          }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.email).toBeDefined();
      expect(data.suggestions.users.columnSuggestions.age).toBeDefined();
      expect(data.suggestions.users.columnSuggestions.created_at).toBeDefined();
    });

    it('should handle analysis errors', async () => {
      mockAnalyzeSchemaForGeneration.mockRejectedValue(new Error('Analysis failed'));

      const request = {};
      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis failed');
    });

    it('should log schema analysis errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAnalyzeSchemaForGeneration.mockRejectedValue(new Error('Test error'));

      await GET({}, mockContext, mockUser, mockProject);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Schema analysis error:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Helper Function Coverage', () => {
    it('should handle role/status/type table names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          user_roles: { name: 'user_roles', columns: [], dependencies: [] },
          order_status: { name: 'order_status', columns: [], dependencies: [] },
          product_type: { name: 'product_type', columns: [], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.user_roles.recommendedCount).toBe(5);
      expect(data.suggestions.order_status.recommendedCount).toBe(5);
      expect(data.suggestions.product_type.recommendedCount).toBe(5);
    });

    it('should handle customer/account table names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          customers: { name: 'customers', columns: [], dependencies: [] },
          accounts: { name: 'accounts', columns: [], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.customers.recommendedCount).toBe(50);
      expect(data.suggestions.accounts.recommendedCount).toBe(50);
    });

    it('should handle transaction/log/event table names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          transactions: { name: 'transactions', columns: [], dependencies: [] },
          activity_log: { name: 'activity_log', columns: [], dependencies: [] },
          events: { name: 'events', columns: [], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.transactions.recommendedCount).toBe(200);
      expect(data.suggestions.activity_log.recommendedCount).toBe(200);
      expect(data.suggestions.events.recommendedCount).toBe(200);
    });

    it('should handle article/product table names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          articles: { name: 'articles', columns: [], dependencies: [] },
          products: { name: 'products', columns: [], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.articles.recommendedCount).toBe(100);
      expect(data.suggestions.products.recommendedCount).toBe(100);
    });

    it('should handle review/rating table names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          reviews: { name: 'reviews', columns: [], dependencies: [] },
          ratings: { name: 'ratings', columns: [], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.reviews.recommendedCount).toBe(300);
      expect(data.suggestions.ratings.recommendedCount).toBe(300);
    });

    it('should handle amount/cost column names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          orders: { name: 'orders', columns: [{ name: 'total_amount', type: 'numeric' }, { name: 'shipping_cost', type: 'decimal' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.orders.columnSuggestions.total_amount.precision).toBe(2);
      expect(data.suggestions.orders.columnSuggestions.shipping_cost.precision).toBe(2);
    });

    it('should handle count column names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          inventory: { name: 'inventory', columns: [{ name: 'stock_count', type: 'int' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.inventory.columnSuggestions.stock_count).toMatchObject({ min: 1, max: 100 });
    });

    it('should handle url column names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          pages: { name: 'pages', columns: [{ name: 'page_url', type: 'varchar' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.pages.columnSuggestions.page_url.pattern).toBe('url');
    });

    it('should handle id column names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          products: { name: 'products', columns: [{ name: 'product_id', type: 'varchar' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.products.columnSuggestions.product_id.pattern).toBe('alphanumeric');
    });

    it('should handle registered column names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          users: { name: 'users', columns: [{ name: 'registered_at', type: 'timestamp' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.registered_at.startDate).toBe('2020-01-01');
    });

    it('should handle dob column names', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          users: { name: 'users', columns: [{ name: 'dob', type: 'date' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.dob).toMatchObject({
        startDate: '1950-01-01',
        endDate: '2005-12-31'
      });
    });

    it('should handle text type columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          posts: { name: 'posts', columns: [{ name: 'user_email', type: 'text' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.posts.columnSuggestions.user_email.pattern).toBe('email');
    });

    it('should handle char type columns', async () => {
      mockAnalyzeSchemaForGeneration.mockResolvedValue({
        tables: {
          users: { name: 'users', columns: [{ name: 'contact_phone', type: 'char' }], dependencies: [] }
        }
      });

      const response = await GET({}, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.suggestions.users.columnSuggestions.contact_phone.pattern).toBe('phone');
    });
  });
});
