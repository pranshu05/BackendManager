// Mock dependencies BEFORE imports
const mockGenerateText = jest.fn();
const mockGroqModel = { name: 'llama-3.3-70b-versatile' }; // Mock Groq model instance
const mockCreateGroq = jest.fn(() => (modelName) => mockGroqModel); // Returns a function that returns model

jest.mock('@ai-sdk/groq', () => ({
  createGroq: jest.fn(() => jest.fn(() => mockGroqModel)),
}));

jest.mock('ai', () => ({
  generateText: mockGenerateText,
}));

// Store original env
const originalEnv = process.env;

// Set env before import
process.env.GROQ_API_KEY = 'test-api-key';

// Import after mocks
const {
  generatequerysuggestions,
  schemaToUML,
  inferDatabaseSchema,
  generateCreateTableStatements,
  analyzeCreateTableRequest,
  analyzeProjectUpdateRequest,
  generateDatabaseSummary,
  generateTitleFromSql,
  generateOptimizationSuggestions,
} = require('@/lib/ai');

describe('ai library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-api-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generatequerysuggestions', () => {
    it('should generate query suggestions from schema', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'UUID' },
            { name: 'email', type: 'VARCHAR(255)' },
          ],
        },
      ];

      const mockResponse = JSON.stringify([
        'Show all users',
        'Find users by email',
        'Count total users',
        'List recent user registrations',
      ]);

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generatequerysuggestions(mockSchema);

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: mockGroqModel,
        prompt: expect.stringContaining('Generate 4 diverse and relevant query suggestions'),
        temperature: 0.3,
        maxTokens: 1000,
      });
      expect(result).toHaveLength(4);
      expect(result[0]).toBe('Show all users');
    });

    it('should handle markdown code blocks in response', async () => {
      const mockSchema = [{ name: 'posts', columns: [] }];
      const mockResponse = '```json\n["Query 1", "Query 2"]\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generatequerysuggestions(mockSchema);

      expect(result).toEqual(['Query 1', 'Query 2']);
    });

    it('should throw error for invalid response format', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: 'not an array' });

      await expect(generatequerysuggestions(mockSchema)).rejects.toThrow(
        'Failed to parse AI response'
      );
    });

    it('should throw error when response is not an array', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: '{"key": "value"}' });

      await expect(generatequerysuggestions(mockSchema)).rejects.toThrow(
        'Invalid suggestions format returned from AI'
      );
    });

    it('should throw error when AI fails', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockRejectedValue(new Error('API error'));

      await expect(generatequerysuggestions(mockSchema)).rejects.toThrow(
        'Failed to generate query suggestions'
      );
    });
  });

  describe('schemaToUML', () => {
    it('should convert schema to PlantUML code', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'UUID' },
            { name: 'name', type: 'VARCHAR' },
          ],
        },
      ];

      const mockPlantUML = `@startuml
class users {
  id: UUID
  name: VARCHAR
}
@enduml`;

      mockGenerateText.mockResolvedValue({ text: mockPlantUML });

      const result = await schemaToUML(mockSchema);

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: mockGroqModel,
        prompt: expect.stringContaining('Convert the following database schema into PlantUML'),
        temperature: 0.3,
        maxTokens: 2000,
      });
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });

    it('should clean markdown from PlantUML response', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockResponse = '```\n@startuml\nclass users\n@enduml\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await schemaToUML(mockSchema);

      expect(result).toBe('@startuml\nclass users\n@enduml');
    });

    it('should throw error for invalid PlantUML format', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: 'invalid uml code' });

      await expect(schemaToUML(mockSchema)).rejects.toThrow(
        'Invalid PlantUML code returned from AI'
      );
    });

    it('should throw error when AI fails', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockRejectedValue(new Error('Network error'));

      await expect(schemaToUML(mockSchema)).rejects.toThrow(
        'Failed to convert schema to PlantUML'
      );
    });
  });

  describe('inferDatabaseSchema', () => {
    it('should infer database schema from natural language', async () => {
      const input = 'Create a blog system with users and posts';
      const mockResponse = JSON.stringify({
        projectName: 'blog_system',
        description: 'A blogging platform',
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
              { name: 'username', type: 'VARCHAR(50)', constraints: ['NOT NULL'] },
            ],
          },
        ],
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await inferDatabaseSchema(input);

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: mockGroqModel,
        prompt: expect.stringContaining('infer a complete database schema'),
        temperature: 0.3,
        maxTokens: 2000,
      });
      expect(result.projectName).toBe('blog_system');
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');
    });

    it('should handle markdown in response', async () => {
      const input = 'Simple user system';
      const mockResponse = '```json\n{"projectName": "user_sys", "description": "test", "tables": []}\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await inferDatabaseSchema(input);

      expect(result.projectName).toBe('user_sys');
    });

    it('should throw error for invalid schema structure', async () => {
      const input = 'Create a system';
      mockGenerateText.mockResolvedValue({ text: '{"invalid": "schema"}' });

      await expect(inferDatabaseSchema(input)).rejects.toThrow(
        'Invalid schema structure returned from AI'
      );
    });

    it('should throw error when AI fails', async () => {
      const input = 'Create a system';
      mockGenerateText.mockRejectedValue(new Error('Timeout'));

      await expect(inferDatabaseSchema(input)).rejects.toThrow(
        'Failed to infer database schema'
      );
    });
  });

  describe('generateCreateTableStatements', () => {
    it('should generate CREATE TABLE SQL from table definitions', () => {
      const tables = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
            { name: 'email', type: 'VARCHAR(255)', constraints: ['NOT NULL', 'UNIQUE'] },
          ],
        },
      ];

      const result = generateCreateTableStatements(tables);

      expect(result).toContain('CREATE TABLE users');
      expect(result).toContain('id UUID PRIMARY KEY');
      expect(result).toContain('email VARCHAR(255) NOT NULL UNIQUE');
    });

    it('should handle foreign key references', () => {
      const tables = [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
            { name: 'user_id', type: 'UUID', references: 'users(id)' },
          ],
        },
      ];

      const result = generateCreateTableStatements(tables);

      expect(result).toContain('user_id UUID REFERENCES users(id)');
    });

    it('should generate multiple table statements', () => {
      const tables = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }] },
        { name: 'posts', columns: [{ name: 'id', type: 'UUID' }] },
      ];

      const result = generateCreateTableStatements(tables);

      expect(result).toContain('CREATE TABLE users');
      expect(result).toContain('CREATE TABLE posts');
    });

    it('should handle columns without constraints', () => {
      const tables = [
        {
          name: 'products',
          columns: [{ name: 'description', type: 'TEXT' }],
        },
      ];

      const result = generateCreateTableStatements(tables);

      expect(result).toContain('description TEXT');
    });

    it('should handle columns with constraints and references', () => {
      const tables = [
        {
          name: 'orders',
          columns: [
            { 
              name: 'user_id', 
              type: 'UUID', 
              constraints: ['NOT NULL'],
              references: 'users(id)' 
            },
          ],
        },
      ];

      const result = generateCreateTableStatements(tables);

      expect(result).toContain('user_id UUID NOT NULL REFERENCES users(id)');
    });
  });

  describe('analyzeCreateTableRequest', () => {
    it('should analyze create table request with existing schema', async () => {
      const request = 'Create a table for storing blog posts';
      const existingSchema = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }] },
      ];

      const mockResponse = JSON.stringify({
        action: 'create_table',
        proposed_sql: 'CREATE TABLE posts (id UUID PRIMARY KEY);',
        explaination: 'Creates a posts table',
        requires_confirmation: true,
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await analyzeCreateTableRequest(request, existingSchema);

      expect(result.action).toBe('create_table');
      expect(result.proposed_sql).toContain('CREATE TABLE');
      expect(result.requires_confirmation).toBe(true);
    });

    it('should handle empty database', async () => {
      const request = 'Create a users table';
      const mockResponse = JSON.stringify({
        action: 'create_table',
        proposed_sql: 'CREATE TABLE users (id UUID);',
        explaination: 'First table',
        requires_confirmation: false,
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await analyzeCreateTableRequest(request, []);

      expect(result.requires_confirmation).toBe(true); // Should always be true
    });

    it('should throw error when AI fails', async () => {
      const request = 'Create table';
      mockGenerateText.mockRejectedValue(new Error('API failure'));

      await expect(analyzeCreateTableRequest(request, [])).rejects.toThrow(
        'Failed to analyze request'
      );
    });
  });

  describe('analyzeProjectUpdateRequest', () => {
    it('should analyze complex update request', async () => {
      const request = 'Add email column to users and create index';
      const existingSchema = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }] },
      ];

      const mockResponse = JSON.stringify({
        operations: [
          {
            type: 'alter_table',
            target: 'users',
            sql: 'ALTER TABLE users ADD COLUMN email VARCHAR(255);',
            explaination: 'Adds email column',
            risk_level: 'low',
            is_idempotent: false,
          },
        ],
        summary: 'Adding email and index',
        requires_confirmation: true,
        estimated_impact: 'Users table modified',
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await analyzeProjectUpdateRequest(request, existingSchema, 'test_db');

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].type).toBe('alter_table');
      expect(result.requires_confirmation).toBe(true);
    });

    it('should throw error for invalid operations structure', async () => {
      const request = 'Update database';
      mockGenerateText.mockResolvedValue({ text: '{"invalid": "structure"}' });

      await expect(analyzeProjectUpdateRequest(request, [])).rejects.toThrow(
        'Invalid response structure: missing operations array'
      );
    });
  });

  describe('generateDatabaseSummary', () => {
    it('should generate database summary with statistics', async () => {
      const schema = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }] },
      ];
      const statistics = { users: 100 };
      const projectName = 'test_project';

      const mockResponse = JSON.stringify({
        quickStats: {
          totalTables: 1,
          totalColumns: 1,
          totalRelationships: 0,
          estimatedRows: '100 records',
        },
        description: 'This is a user management system.',
        techSpecs: 'Uses PostgreSQL with UUID keys.',
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generateDatabaseSummary(schema, statistics, projectName);

      expect(result.quickStats.totalTables).toBe(1);
      expect(result.description).toContain('user management');
      expect(result.techSpecs).toContain('PostgreSQL');
    });
  });

  describe('generateTitleFromSql', () => {
    it('should generate title from SQL query', async () => {
      const sqlQuery = 'SELECT * FROM users WHERE department = "HR"';
      const schema = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }] },
      ];

      mockGenerateText.mockResolvedValue({ text: 'Get all HR department users' });

      const result = await generateTitleFromSql(sqlQuery, schema);

      expect(result).toBe('Get all HR department users');
    });

    it('should clean markdown from title', async () => {
      const sqlQuery = 'SELECT COUNT(*) FROM orders';
      const schema = [{ name: 'orders', columns: [] }];

      mockGenerateText.mockResolvedValue({ text: '"Count total orders"' });

      const result = await generateTitleFromSql(sqlQuery, schema);

      expect(result).toBe('Count total orders');
    });

    it('should return fallback on AI failure', async () => {
      const sqlQuery = 'SELECT * FROM very_long_table_name_that_should_be_truncated';
      const schema = [];

      mockGenerateText.mockRejectedValue(new Error('AI error'));

      const result = await generateTitleFromSql(sqlQuery, schema);

      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('should generate optimization suggestions', async () => {
      const schema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
            { name: 'email', type: 'VARCHAR(255)' },
          ],
        },
      ];

      const mockResponse = JSON.stringify({
        totalSuggestions: 2,
        queryPerformance: [],
        missingIndexes: [
          {
            tableName: 'users',
            columnName: 'email',
            scanCount: 1000,
            suggestion: 'CREATE INDEX idx_users_email ON users(email);',
            severity: 'HIGH',
            estimatedImprovement: '80%',
            reason: 'Email lookups are frequent',
          },
        ],
        schemaImprovements: [],
        potentialIssues: [],
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generateOptimizationSuggestions(schema);

      expect(result.totalSuggestions).toBeGreaterThan(0);
      expect(result.missingIndexes).toHaveLength(1);
      expect(result.missingIndexes[0].tableName).toBe('users');
    });

    it('should handle schema with foreign key references', async () => {
      const schema = [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY'] },
            { name: 'user_id', type: 'UUID', references: 'users(id)' },
          ],
        },
      ];

      const mockResponse = JSON.stringify({
        totalSuggestions: 1,
        queryPerformance: [],
        missingIndexes: [],
        schemaImprovements: [],
        potentialIssues: [],
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generateOptimizationSuggestions(schema);

      expect(mockGenerateText).toHaveBeenCalled();
      const call = mockGenerateText.mock.calls[0][0];
      expect(call.prompt).toContain('user_id');
      expect(call.prompt).toContain('users(id)');
    });

    it('should provide default structure on empty response', async () => {
      const schema = [{ name: 'users', columns: [] }];

      mockGenerateText.mockResolvedValue({ text: '{}' });

      const result = await generateOptimizationSuggestions(schema);

      expect(result).toHaveProperty('totalSuggestions');
      expect(result).toHaveProperty('missingIndexes');
      expect(result).toHaveProperty('schemaImprovements');
      expect(result).toHaveProperty('potentialIssues');
      expect(Array.isArray(result.missingIndexes)).toBe(true);
    });

    it('should recalculate totalSuggestions if zero', async () => {
      const schema = [{ name: 'users', columns: [] }];

      const mockResponse = JSON.stringify({
        totalSuggestions: 0,
        queryPerformance: [],
        missingIndexes: [{ tableName: 'users', columnName: 'id' }],
        schemaImprovements: [{ tableName: 'posts', issue: 'Missing FK' }],
        potentialIssues: [],
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generateOptimizationSuggestions(schema);

      expect(result.totalSuggestions).toBe(2); // 1 index + 1 improvement
    });

    it('should throw error when AI fails', async () => {
      const schema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockRejectedValue(new Error('Service unavailable'));

      await expect(generateOptimizationSuggestions(schema)).rejects.toThrow(
        'Failed to generate optimization suggestions'
      );
    });

    it('should throw error for invalid optimization structure', async () => {
      const schema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: 'null' });

      await expect(generateOptimizationSuggestions(schema)).rejects.toThrow(
        'Invalid optimization suggestions structure'
      );
    });
  });
});
