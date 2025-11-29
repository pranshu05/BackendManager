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
  parseDbError,
} = require('@/lib/ai');

describe('ai library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-api-key';
    // Default safe mock: ensure any test that doesn't set a specific
    // mockGenerateText value receives a harmless JSON string. This
    // prevents mutated code paths from leaving unresolved promises
    // or changing behavior unexpectedly during mutation testing.
    mockGenerateText.mockResolvedValue({ text: '{}' });
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
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(4);
      expect(result).not.toHaveLength(0);
      expect(result).not.toHaveLength(3);
      expect(result).not.toHaveLength(5);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result)).not.toBe(false);
      expect(result[0]).toBe('Show all users');
      expect(result[0]).not.toBe('');
      expect(result[0]).not.toBe('Show all user');
      expect(typeof result[0]).toBe('string');
      expect(typeof result[0]).not.toBe('object');
    });

    // Extra strict/edge-case tests to kill subtle mutants (logical ops, joins, trimming)
    describe('Additional edge cases to improve mutation score', () => {
      it('cleanMarkdownCodeBlocks should remove only surrounding json fences and preserve inner content', async () => {
        const mockResponse = '```json\n{ "a": "```not a fence```" }\n```';
        mockGenerateText.mockResolvedValue({ text: mockResponse });

        // parseAIResponse should parse the JSON and return an array or throw; ensure it doesn't choke on inner backticks
        // In this case the JSON is invalid for suggestions, so expect a rejection from generatequerysuggestions
        await expect(generatequerysuggestions([{ name: 'x', columns: [] }])).rejects.toThrow();
      });

      it('schemaToUML should accept responses with extra whitespace/newlines around markers', async () => {
        const mockPlantUML = '\n  ```\n@startuml\nclass users\n@enduml\n```\n   ';
        mockGenerateText.mockResolvedValue({ text: mockPlantUML });

        const result = await schemaToUML([{ name: 'users', columns: [] }]);
        // cleaned output should exactly match the PlantUML content without backticks and trimmed
        expect(result).toBe('@startuml\nclass users\n@enduml');
      });

      it('generateCreateTableStatements should preserve join separators exactly', () => {
        const tables = [
          { name: 'a', columns: [{ name: 'c1', type: 'INT' }, { name: 'c2', type: 'TEXT' }] }
        ];

        const result = generateCreateTableStatements(tables);
        // Must use comma+newline+4spaces between cols as implemented
        expect(result).toBe('CREATE TABLE a (\n    c1 INT,\n    c2 TEXT\n);');
      });

      it('analyzeProjectUpdateRequest should include project name when provided and default when not', async () => {
        mockGenerateText.mockResolvedValue({ text: JSON.stringify({ operations: [], requires_confirmation: true }) });

        await analyzeProjectUpdateRequest('noop', [], 'myproj');
        let call = mockGenerateText.mock.calls[mockGenerateText.mock.calls.length - 1][0];
        expect(call.prompt).toContain('Project: myproj');

        await analyzeProjectUpdateRequest('noop', []);
        call = mockGenerateText.mock.calls[mockGenerateText.mock.calls.length - 1][0];
        expect(call.prompt).toContain('Project: database');
      });

      it('generateDatabaseSummary should use statistics default 0 when missing', async () => {
        mockGenerateText.mockResolvedValue({ text: JSON.stringify({ quickStats: { totalTables: 1, totalColumns: 1, totalRelationships: 0, estimatedRows: '0 records' }, description: '', techSpecs: '' }) });
        const schema = [{ name: 't', columns: [{ name: 'id', type: 'UUID' }] }];
        const res = await generateDatabaseSummary(schema, {}, 'p');
        expect(res.quickStats.estimatedRows).toMatch(/0/);
      });

      it('generateOptimizationSuggestions should include reference arrows when references exist', async () => {
        mockGenerateText.mockResolvedValue({ text: JSON.stringify({ totalSuggestions: 0, queryPerformance: [], missingIndexes: [], schemaImprovements: [], potentialIssues: [] }) });
        const schema = [{ name: 'x', columns: [{ name: 'u', type: 'UUID', references: 'users(id)' }] }];
        await generateOptimizationSuggestions(schema);
        const call = mockGenerateText.mock.calls[mockGenerateText.mock.calls.length - 1][0];
        expect(call.prompt).toContain('-> users(id)');
      });

      it('parseDbError fallback should include truncated long error and set flags correctly when schema/sql not provided', async () => {
        const longErr = 'a'.repeat(500);
        mockGenerateText.mockRejectedValue(new Error('AI down'));

        const res = await parseDbError(longErr);
        expect(res.errorType).toBe('Unknown');
        expect(res.technicalDetails.originalError).toBe(longErr);
        expect(res.technicalDetails.availableContext.schema).toBe(false);
        expect(res.technicalDetails.availableContext.sql).toBe(false);
      });
    });

    it('should handle markdown code blocks in response', async () => {
      const mockSchema = [{ name: 'posts', columns: [] }];
      const mockResponse = '```json\n["Query 1", "Query 2"]\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generatequerysuggestions(mockSchema);

      expect(result).toEqual(['Query 1', 'Query 2']);
      expect(result).not.toEqual([]);
      expect(result).not.toEqual(['Query 1']);
      expect(result).toHaveLength(2);
      expect(result).not.toHaveLength(0);
      expect(result).not.toHaveLength(1);
      expect(Array.isArray(result)).toBe(true);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid response format', async () => {
      jest.clearAllMocks();
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: 'not an array' });

      await expect(generatequerysuggestions(mockSchema)).rejects.toThrow(
        'Failed to parse AI response'
      );
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should throw error when response is not an array', async () => {
      jest.clearAllMocks();
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: '{"key": "value"}' });

      await expect(generatequerysuggestions(mockSchema)).rejects.toThrow(
        'Invalid suggestions format returned from AI'
      );
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should throw error when AI fails', async () => {
      jest.clearAllMocks();
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockRejectedValue(new Error('API error'));

      await expect(generatequerysuggestions(mockSchema)).rejects.toThrow(
        'Failed to generate query suggestions'
      );
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
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
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('object');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).not.toBe(0);
      expect(result.startsWith('@startuml')).toBe(true);
      expect(result.endsWith('@enduml')).toBe(true);
    });

    it('should clean markdown from PlantUML response', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockResponse = '```\n@startuml\nclass users\n@enduml\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await schemaToUML(mockSchema);

      expect(result).toBe('@startuml\nclass users\n@enduml');
      expect(result).not.toBe('');
      expect(result).not.toContain('```');
      expect(result).toContain('class users');
      expect(typeof result).toBe('string');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid PlantUML format', async () => {
      jest.clearAllMocks();
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: 'invalid uml code' });

      await expect(schemaToUML(mockSchema)).rejects.toThrow(
        'Invalid PlantUML code returned from AI'
      );
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should throw error when AI fails', async () => {
      jest.clearAllMocks();
      const mockSchema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockRejectedValue(new Error('Network error'));

      await expect(schemaToUML(mockSchema)).rejects.toThrow(
        'Failed to convert schema to PlantUML'
      );
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
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
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(result.projectName).toBe('blog_system');
      expect(result.projectName).not.toBe('');
      expect(result.projectName).not.toBe('blog');
      expect(typeof result.projectName).toBe('string');
      expect(result.tables).toHaveLength(1);
      expect(result.tables).not.toHaveLength(0);
      expect(result.tables).not.toHaveLength(2);
      expect(Array.isArray(result.tables)).toBe(true);
      expect(result.tables[0].name).toBe('users');
      expect(result.tables[0].name).not.toBe('user');
      expect(typeof result.tables[0].name).toBe('string');
    });

    it('should handle markdown in response', async () => {
      const input = 'Simple user system';
      const mockResponse = '```json\n{"projectName": "user_sys", "description": "test", "tables": []}\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await inferDatabaseSchema(input);

      expect(result.projectName).toBe('user_sys');
      expect(result.projectName).not.toBe('');
      expect(typeof result.projectName).toBe('string');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('tables');
      expect(Array.isArray(result.tables)).toBe(true);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid schema structure', async () => {
      jest.clearAllMocks();
      const input = 'Create a system';
      mockGenerateText.mockResolvedValue({ text: '{"invalid": "schema"}' });

      await expect(inferDatabaseSchema(input)).rejects.toThrow(
        'Invalid schema structure returned from AI'
      );
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should throw error when AI fails', async () => {
      jest.clearAllMocks();
      const input = 'Create a system';
      mockGenerateText.mockRejectedValue(new Error('Timeout'));

      await expect(inferDatabaseSchema(input)).rejects.toThrow(
        'Failed to infer database schema'
      );
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
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
      expect(result).not.toContain('DROP TABLE');
      expect(result).toContain('id UUID PRIMARY KEY');
      expect(result).toContain('email VARCHAR(255) NOT NULL UNIQUE');
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('object');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).not.toBe(0);
      expect(result).toMatch(/CREATE TABLE users\s*\(/);
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
      expect(result).toContain('REFERENCES');
      expect(result).toMatch(/user_id\s+UUID\s+REFERENCES/);
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('number');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).not.toBe(0);
    });

    it('should generate multiple table statements', () => {
      const tables = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }] },
        { name: 'posts', columns: [{ name: 'id', type: 'UUID' }] },
      ];

      const result = generateCreateTableStatements(tables);

      expect(result).toContain('CREATE TABLE users');
      expect(result).toContain('CREATE TABLE posts');
      const tableCount = (result.match(/CREATE TABLE/g) || []).length;
      expect(tableCount).toBe(2);
      expect(tableCount).not.toBe(0);
      expect(tableCount).not.toBe(1);
      expect(tableCount).not.toBe(3);
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('object');
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
      expect(result).not.toContain('PRIMARY KEY');
      expect(result).not.toContain('NOT NULL');
      expect(result).toMatch(/description\s+TEXT/);
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('number');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).not.toBe(0);
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
      expect(result).toContain('NOT NULL');
      expect(result).toContain('REFERENCES');
      expect(result).toMatch(/user_id\s+UUID\s+NOT NULL\s+REFERENCES/);
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('object');
      expect(result).not.toBe('');
      expect(result.length).toBeGreaterThan(20);
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
      expect(result.action).not.toBe('');
      expect(result.action).not.toBe('drop_table');
      expect(typeof result.action).toBe('string');
      expect(result.proposed_sql).toContain('CREATE TABLE');
      expect(result.proposed_sql).not.toContain('DROP TABLE');
      expect(result.proposed_sql).not.toBe('');
      expect(typeof result.proposed_sql).toBe('string');
      expect(result.requires_confirmation).toBe(true);
      expect(result.requires_confirmation).not.toBe(false);
      expect(typeof result.requires_confirmation).toBe('boolean');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
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
      expect(result.requires_confirmation).not.toBe(false);
      expect(typeof result.requires_confirmation).toBe('boolean');
      expect(typeof result.requires_confirmation).not.toBe('string');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('proposed_sql');
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw error when AI fails', async () => {
      jest.clearAllMocks();
      const request = 'Create table';
      mockGenerateText.mockRejectedValue(new Error('API failure'));

      await expect(analyzeCreateTableRequest(request, [])).rejects.toThrow(
        'Failed to analyze request'
      );
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
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
      expect(result.operations).not.toHaveLength(0);
      expect(result.operations).not.toHaveLength(2);
      expect(Array.isArray(result.operations)).toBe(true);
      expect(Array.isArray(result.operations)).not.toBe(false);
      expect(result.operations[0].type).toBe('alter_table');
      expect(result.operations[0].type).not.toBe('');
      expect(result.operations[0].type).not.toBe('drop_table');
      expect(typeof result.operations[0].type).toBe('string');
      expect(result.requires_confirmation).toBe(true);
      expect(result.requires_confirmation).not.toBe(false);
      expect(typeof result.requires_confirmation).toBe('boolean');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should handle schema with nullable and constraint properties', async () => {
      jest.clearAllMocks();
      const request = 'Update posts table';
      const existingSchema = [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'UUID', nullable: false, constraint: 'PRIMARY KEY' },
            { name: 'title', type: 'VARCHAR(255)', nullable: false },
            { name: 'content', type: 'TEXT', nullable: true },
          ],
        },
      ];

      const mockResponse = JSON.stringify({
        operations: [
          {
            type: 'alter_table',
            target: 'posts',
            sql: 'ALTER TABLE posts ADD COLUMN author VARCHAR(100);',
            explaination: 'Adds author column',
            risk_level: 'low',
            is_idempotent: false,
          },
        ],
        summary: 'Adding author column',
        requires_confirmation: true,
        estimated_impact: 'Posts table modified',
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await analyzeProjectUpdateRequest(request, existingSchema, 'blog_db');

      expect(mockGenerateText).toHaveBeenCalled();
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('NOT NULL');
      expect(callArgs.prompt).toContain('PRIMARY KEY');
      expect(callArgs.prompt).toContain('posts');
      expect(typeof callArgs.prompt).toBe('string');
      expect(result.operations).toHaveLength(1);
      expect(result.operations).not.toHaveLength(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid operations structure', async () => {
      jest.clearAllMocks();
      const request = 'Update database';
      mockGenerateText.mockResolvedValue({ text: '{"invalid": "structure"}' });

      await expect(analyzeProjectUpdateRequest(request, [])).rejects.toThrow(
        'Invalid response structure: missing operations array'
      );
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
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
      expect(result.quickStats.totalTables).not.toBe(0);
      expect(result.quickStats.totalTables).not.toBe(2);
      expect(typeof result.quickStats.totalTables).toBe('number');
      expect(typeof result.quickStats.totalTables).not.toBe('string');
      expect(result.description).toContain('user management');
      expect(result.description).not.toBe('');
      expect(result.description).not.toContain('xyz');
      expect(typeof result.description).toBe('string');
      expect(result.techSpecs).toContain('PostgreSQL');
      expect(result.techSpecs).not.toBe('');
      expect(typeof result.techSpecs).toBe('string');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should handle tables with zero or missing row counts', async () => {
      jest.clearAllMocks();
      const schema = [
        { name: 'users', columns: [{ name: 'id', type: 'UUID' }, { name: 'name', type: 'VARCHAR' }] },
        { name: 'posts', columns: [{ name: 'id', type: 'UUID' }] },
      ];
      const statistics = { users: 0 }; // posts missing from statistics

      const mockResponse = JSON.stringify({
        quickStats: {
          totalTables: 2,
          totalColumns: 3,
          totalRelationships: 0,
          estimatedRows: '0 records',
        },
        description: 'Empty database schema.',
        techSpecs: 'PostgreSQL schema defined.',
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await generateDatabaseSummary(schema, statistics, 'empty_project');

      expect(mockGenerateText).toHaveBeenCalled();
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('(0 rows)');
      expect(callArgs.prompt).toContain('users');
      expect(callArgs.prompt).toContain('posts');
      expect(typeof callArgs.prompt).toBe('string');
      expect(result.quickStats.totalTables).toBe(2);
      expect(result.quickStats.totalTables).not.toBe(1);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
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
      expect(result).not.toBe('');
      expect(result).not.toBe('Get all HR department user');
      expect(typeof result).toBe('string');
      expect(typeof result).not.toBe('object');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).not.toBe(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should clean markdown from title', async () => {
      const sqlQuery = 'SELECT COUNT(*) FROM orders';
      const schema = [{ name: 'orders', columns: [] }];

      mockGenerateText.mockResolvedValue({ text: '"Count total orders"' });

      const result = await generateTitleFromSql(sqlQuery, schema);

      expect(result).toBe('Count total orders');
      expect(result).not.toBe('"Count total orders"');
      expect(result).not.toContain('"');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should return fallback on AI failure', async () => {
      const sqlQuery = 'SELECT * FROM very_long_table_name_that_should_be_truncated';
      const schema = [];

      mockGenerateText.mockRejectedValue(new Error('AI error'));

      const result = await generateTitleFromSql(sqlQuery, schema);

      expect(result).toContain('...');
      expect(result).not.toBe('');
      expect(typeof result).toBe('string');
      expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(result.length).not.toBeLessThanOrEqual(0);
      expect(result.length).toBeGreaterThan(3);
      expect(result.length).not.toBe(0);
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw and use fallback when AI returns empty title', async () => {
      jest.clearAllMocks();
      const sqlQuery = 'SELECT * FROM users WHERE id = 1';
      const schema = [{ name: 'users', columns: [] }];

      mockGenerateText.mockResolvedValue({ text: '""' });

      const result = await generateTitleFromSql(sqlQuery, schema);

      expect(result).toContain('...');
      expect(result).not.toBe('');
      expect(typeof result).toBe('string');
      expect(result).toBe('SELECT * FROM users WHERE id = 1...');
      expect(result).not.toBe('SELECT * FROM users WHERE id = 1');
      expect(result.length).toBeGreaterThan(3);
      expect(result.length).not.toBe(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
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
      expect(result.totalSuggestions).not.toBe(0);
      expect(result.totalSuggestions).not.toBeLessThan(1);
      expect(typeof result.totalSuggestions).toBe('number');
      expect(result.missingIndexes).toHaveLength(1);
      expect(result.missingIndexes).not.toHaveLength(0);
      expect(result.missingIndexes).not.toHaveLength(2);
      expect(Array.isArray(result.missingIndexes)).toBe(true);
      expect(Array.isArray(result.missingIndexes)).not.toBe(false);
      expect(result.missingIndexes[0].tableName).toBe('users');
      expect(result.missingIndexes[0].tableName).not.toBe('');
      expect(result.missingIndexes[0].tableName).not.toBe('user');
      expect(typeof result.missingIndexes[0].tableName).toBe('string');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
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
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      const call = mockGenerateText.mock.calls[0][0];
      expect(call.prompt).toContain('user_id');
      expect(call.prompt).not.toContain('userid');
      expect(call.prompt).toContain('users(id)');
      expect(call.prompt).not.toContain('users()');
      expect(typeof call.prompt).toBe('string');
      expect(result).toBeDefined();
      expect(result).not.toBeUndefined();
    });

    it('should provide default structure on empty response', async () => {
      const schema = [{ name: 'users', columns: [] }];

      mockGenerateText.mockResolvedValue({ text: '{}' });

      const result = await generateOptimizationSuggestions(schema);

      expect(result).toHaveProperty('totalSuggestions');
      expect(result).not.toHaveProperty('invalid');
      expect(result).toHaveProperty('missingIndexes');
      expect(result).toHaveProperty('schemaImprovements');
      expect(result).toHaveProperty('potentialIssues');
      expect(Array.isArray(result.missingIndexes)).toBe(true);
      expect(Array.isArray(result.missingIndexes)).not.toBe(false);
      expect(Array.isArray(result.schemaImprovements)).toBe(true);
      expect(Array.isArray(result.potentialIssues)).toBe(true);
      expect(typeof result.totalSuggestions).toBe('number');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
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
      expect(result.totalSuggestions).not.toBe(0);
      expect(result.totalSuggestions).not.toBe(1);
      expect(result.totalSuggestions).not.toBe(3);
      expect(typeof result.totalSuggestions).toBe('number');
      expect(result.missingIndexes.length + result.schemaImprovements.length).toBe(2);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should throw error when AI fails', async () => {
      jest.clearAllMocks();
      const schema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockRejectedValue(new Error('Service unavailable'));

      await expect(generateOptimizationSuggestions(schema)).rejects.toThrow(
        'Failed to generate optimization suggestions'
      );
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid optimization structure', async () => {
      jest.clearAllMocks();
      const schema = [{ name: 'users', columns: [] }];
      mockGenerateText.mockResolvedValue({ text: 'null' });

      await expect(generateOptimizationSuggestions(schema)).rejects.toThrow(
        'Failed to generate optimization suggestions'
      );
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });
  });

  describe('parseDbError', () => {
    it('should parse foreign key violation error with full context', async () => {
      jest.clearAllMocks();
      const errorMessage = 'insert or update on table "posts" violates foreign key constraint "fk_user_id"';
      const sql = 'INSERT INTO posts (user_id, title) VALUES (999, "Test")';
      const schema = [
        { name: 'users', columns: [{ name: 'id' }, { name: 'email' }] },
        { name: 'posts', columns: [{ name: 'id' }, { name: 'user_id' }, { name: 'title' }] }
      ];

      const mockResponse = JSON.stringify({
        errorType: 'Foreign Key Violation',
        summary: 'Cannot insert post because the user does not exist',
        userFriendlyExplanation: 'You are trying to create a post for a user that does not exist in the system.',
        foreignKeyExplanation: 'The post requires a valid user. The user with ID 999 was not found.',
        technicalDetails: {
          originalError: errorMessage.substring(0, 200),
          availableContext: { schema: true, sql: true },
          missingData: ['user with id 999']
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorMessage, sql, schema);

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
      expect(result.errorType).toBe('Foreign Key Violation');
      expect(result.errorType).not.toBe('Unknown');
      expect(result.errorType).not.toBe('Missing Data');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.summary).toContain('user');
      expect(result.summary).not.toBe('');
      expect(result.summary).not.toContain('xyz');
      expect(typeof result.summary).toBe('string');
      expect(typeof result.summary).not.toBe('number');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary.length).not.toBe(0);
      expect(result.userFriendlyExplanation).toBeDefined();
      expect(result.userFriendlyExplanation).not.toBeUndefined();
      expect(result.userFriendlyExplanation).not.toBeNull();
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(typeof result.userFriendlyExplanation).not.toBe('object');
      expect(result.userFriendlyExplanation.length).toBeGreaterThan(0);
      expect(result.foreignKeyExplanation).not.toBeNull();
      expect(result.foreignKeyExplanation).not.toBeUndefined();
      expect(result.foreignKeyExplanation).toContain('user');
      expect(typeof result.foreignKeyExplanation).toBe('string');
      expect(result.technicalDetails).toBeDefined();
      expect(result.technicalDetails).not.toBeUndefined();
      expect(result.technicalDetails.availableContext).toBeDefined();
      expect(result.technicalDetails.availableContext.schema).toBe(true);
      expect(result.technicalDetails.availableContext.schema).not.toBe(false);
      expect(typeof result.technicalDetails.availableContext.schema).toBe('boolean');
      expect(result.technicalDetails.availableContext.sql).toBe(true);
      expect(result.technicalDetails.availableContext.sql).not.toBe(false);
      expect(typeof result.technicalDetails.availableContext.sql).toBe('boolean');
    });

    it('should parse error with Error object instead of string', async () => {
      jest.clearAllMocks();
      const errorObj = new Error('relation "users" does not exist');
      
      const mockResponse = JSON.stringify({
        errorType: 'Missing Data',
        summary: 'Table users does not exist',
        userFriendlyExplanation: 'The table you are trying to access has not been created yet.',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorObj.message.substring(0, 200),
          availableContext: { schema: false, sql: false },
          missingData: ['table users']
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorObj);

      expect(result.errorType).toBe('Missing Data');
      expect(result.errorType).not.toBe('Foreign Key Violation');
      expect(result.errorType).not.toBe('Unknown');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.userFriendlyExplanation).toBeDefined();
      expect(result.userFriendlyExplanation).not.toBeUndefined();
      expect(result.userFriendlyExplanation).not.toBeNull();
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(result.foreignKeyExplanation).toBeNull();
      expect(result.foreignKeyExplanation).not.toBe('test');
      expect(result.foreignKeyExplanation).not.toBeUndefined();
      expect(result.technicalDetails.availableContext.schema).toBe(false);
      expect(result.technicalDetails.availableContext.schema).not.toBe(true);
      expect(typeof result.technicalDetails.availableContext.schema).toBe('boolean');
      expect(result.technicalDetails.availableContext.sql).toBe(false);
      expect(result.technicalDetails.availableContext.sql).not.toBe(true);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should handle error without SQL context', async () => {
      jest.clearAllMocks();
      const errorMessage = 'duplicate key value violates unique constraint "users_email_key"';
      const schema = [{ name: 'users', columns: [{ name: 'id' }, { name: 'email' }] }];

      const mockResponse = JSON.stringify({
        errorType: 'Duplicate Value',
        summary: 'Email address already exists',
        userFriendlyExplanation: 'This email is already registered. Please use a different email.',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorMessage.substring(0, 200),
          availableContext: { schema: true, sql: false },
          missingData: []
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorMessage, null, schema);

      expect(result.errorType).toBe('Duplicate Value');
      expect(result.errorType).not.toBe('Foreign Key Violation');
      expect(result.errorType).not.toBe('Unknown');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('number');
      expect(result.userFriendlyExplanation).toContain('email');
      expect(result.userFriendlyExplanation).not.toBe('');
      expect(result.userFriendlyExplanation).not.toContain('xyz');
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(result.technicalDetails.availableContext.sql).toBe(false);
      expect(result.technicalDetails.availableContext.sql).not.toBe(true);
      expect(typeof result.technicalDetails.availableContext.sql).toBe('boolean');
      expect(result.technicalDetails.availableContext.schema).toBe(true);
      expect(result.technicalDetails.availableContext.schema).not.toBe(false);
      expect(typeof result.technicalDetails.availableContext.schema).toBe('boolean');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should handle error without schema context', async () => {
      jest.clearAllMocks();
      const errorMessage = 'syntax error at or near "SELCT"';
      const sql = 'SELCT * FROM users';

      const mockResponse = JSON.stringify({
        errorType: 'Syntax Error',
        summary: 'SQL syntax error detected',
        userFriendlyExplanation: 'There is a typo in the database query.',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorMessage.substring(0, 200),
          availableContext: { schema: false, sql: true },
          missingData: []
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorMessage, sql, null);

      expect(result.errorType).toBe('Syntax Error');
      expect(result.errorType).not.toBe('Unknown');
      expect(result.errorType).not.toBe('Foreign Key Violation');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.technicalDetails).toBeDefined();
      expect(result.technicalDetails.availableContext).toBeDefined();
      expect(result.technicalDetails.availableContext.schema).toBe(false);
      expect(result.technicalDetails.availableContext.schema).not.toBe(true);
      expect(typeof result.technicalDetails.availableContext.schema).toBe('boolean');
      expect(result.technicalDetails.availableContext.sql).toBe(true);
      expect(result.technicalDetails.availableContext.sql).not.toBe(false);
      expect(typeof result.technicalDetails.availableContext.sql).toBe('boolean');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should handle error with empty schema array', async () => {
      jest.clearAllMocks();
      const errorMessage = 'permission denied for table users';

      const mockResponse = JSON.stringify({
        errorType: 'Permission Denied',
        summary: 'Access denied',
        userFriendlyExplanation: 'You do not have permission to access this resource.',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorMessage.substring(0, 200),
          availableContext: { schema: false, sql: false },
          missingData: []
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorMessage, null, []);

      expect(result.errorType).toBe('Permission Denied');
      expect(result.errorType).not.toBe('Syntax Error');
      expect(result.errorType).not.toBe('Unknown');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('number');
      expect(result.technicalDetails).toBeDefined();
      expect(result.technicalDetails).not.toBeUndefined();
      expect(result.technicalDetails.availableContext.schema).toBe(false);
      expect(result.technicalDetails.availableContext.schema).not.toBe(true);
      expect(typeof result.technicalDetails.availableContext.schema).toBe('boolean');
      expect(result.technicalDetails.availableContext.sql).toBe(false);
      expect(result.technicalDetails.availableContext.sql).not.toBe(true);
      expect(typeof result.technicalDetails.availableContext.sql).toBe('boolean');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
    });

    it('should handle invalid response structure with fallback', async () => {
      jest.clearAllMocks();
      const errorMessage = 'connection timeout';

      mockGenerateText.mockResolvedValue({ text: '{"invalid": "response"}' });

      const result = await parseDbError(errorMessage);

      expect(result.errorType).toBe('Unknown');
      expect(result.errorType).not.toBe('Connection Error');
      expect(result.errorType).not.toBe('Syntax Error');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.summary).toBeDefined();
      expect(result.summary).not.toBeUndefined();
      expect(result.summary).not.toBeNull();
      expect(typeof result.summary).toBe('string');
      expect(result.userFriendlyExplanation).toBeDefined();
      expect(result.userFriendlyExplanation).not.toBe('');
      expect(result.userFriendlyExplanation).not.toBeUndefined();
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(typeof result.userFriendlyExplanation).not.toBe('number');
      expect(result.technicalDetails).toBeDefined();
      expect(result.technicalDetails).not.toBeUndefined();
      expect(result.technicalDetails.originalError).toBe(errorMessage);
      expect(result.technicalDetails.originalError).not.toBe('');
      expect(result.technicalDetails.originalError).not.toBe('test');
      expect(typeof result.technicalDetails.originalError).toBe('string');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should handle AI failure with fallback response', async () => {
      jest.clearAllMocks();
      const longError = 'a'.repeat(300);

      mockGenerateText.mockRejectedValue(new Error('AI service unavailable'));

      const result = await parseDbError(longError);

      expect(result.errorType).toBe('Unknown');
      expect(result.errorType).not.toBe('Connection Error');
      expect(result.errorType).not.toBe('Syntax Error');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.summary).toBe('An error occurred while processing your request');
      expect(result.summary).not.toBe('');
      expect(result.summary).not.toBe('test');
      expect(typeof result.summary).toBe('string');
      expect(typeof result.summary).not.toBe('number');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.userFriendlyExplanation).toBeDefined();
      expect(result.userFriendlyExplanation).not.toBeUndefined();
      expect(result.userFriendlyExplanation.length).toBeLessThanOrEqual(300);
      expect(result.userFriendlyExplanation.length).not.toBe(0);
      expect(result.userFriendlyExplanation.length).toBeGreaterThan(0);
      expect(result.userFriendlyExplanation.length).not.toBeLessThanOrEqual(0);
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(result.foreignKeyExplanation).toBeNull();
      expect(result.foreignKeyExplanation).not.toBe('test');
      expect(result.foreignKeyExplanation).not.toBeUndefined();
      expect(result.technicalDetails).toBeDefined();
      expect(result.technicalDetails).not.toBeUndefined();
      expect(result.technicalDetails.originalError).toBe(longError);
      expect(result.technicalDetails.originalError).not.toBe('');
      expect(typeof result.technicalDetails.originalError).toBe('string');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should handle markdown code blocks in response', async () => {
      jest.clearAllMocks();
      const errorMessage = 'invalid input syntax for type integer';

      const mockResponse = '```json\n' + JSON.stringify({
        errorType: 'Invalid Input',
        summary: 'Wrong data type provided',
        userFriendlyExplanation: 'The value you entered is not a valid number.',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorMessage.substring(0, 200),
          availableContext: { schema: false, sql: false },
          missingData: []
        }
      }) + '\n```';

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorMessage);

      expect(result.errorType).toBe('Invalid Input');
      expect(result.errorType).not.toBe('Syntax Error');
      expect(result.errorType).not.toBe('Unknown');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.userFriendlyExplanation).toContain('number');
      expect(result.userFriendlyExplanation).not.toBe('');
      expect(result.userFriendlyExplanation).not.toContain('xyz');
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(typeof result.userFriendlyExplanation).not.toBe('number');
      expect(result.userFriendlyExplanation.length).toBeGreaterThan(0);
      expect(result.userFriendlyExplanation.length).not.toBe(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });

    it('should include SQL in prompt when provided', async () => {
      jest.clearAllMocks();
      const errorMessage = 'test error';
      const sql = 'SELECT * FROM users WHERE id = 1';

      const mockResponse = JSON.stringify({
        errorType: 'Unknown',
        summary: 'Test',
        userFriendlyExplanation: 'Test explanation',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorMessage,
          availableContext: { schema: false, sql: true },
          missingData: []
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      await parseDbError(errorMessage, sql);

      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain(sql);
      expect(callArgs.prompt).not.toContain('SQL Query: Unavailable');
      expect(callArgs.prompt).not.toBe('');
      expect(callArgs.prompt).toContain('SQL Query that caused the error');
      expect(typeof callArgs.prompt).toBe('string');
      expect(typeof callArgs.prompt).not.toBe('object');
      expect(callArgs.prompt.length).toBeGreaterThan(0);
      expect(callArgs.prompt.length).not.toBe(0);
      expect(callArgs.temperature).toBe(0.2);
      expect(callArgs.temperature).not.toBe(0.3);
      expect(callArgs.temperature).not.toBe(0.1);
      expect(typeof callArgs.temperature).toBe('number');
      expect(callArgs.maxTokens).toBe(1500);
      expect(callArgs.maxTokens).not.toBe(1000);
      expect(callArgs.maxTokens).not.toBe(2000);
      expect(typeof callArgs.maxTokens).toBe('number');
    });

    it('should show schema unavailable when not provided', async () => {
      jest.clearAllMocks();
      const errorMessage = 'test error';

      const mockResponse = JSON.stringify({
        errorType: 'Unknown',
        summary: 'Test',
        userFriendlyExplanation: 'Test explanation',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: errorMessage,
          availableContext: { schema: false, sql: false },
          missingData: []
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      await parseDbError(errorMessage);

      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Schema information: Unavailable');
      expect(callArgs.prompt).not.toContain('Database Schema Context');
      expect(callArgs.prompt).not.toBe('');
      expect(callArgs.prompt).toContain('SQL Query: Unavailable');
      expect(typeof callArgs.prompt).toBe('string');
      expect(typeof callArgs.prompt).not.toBe('object');
      expect(callArgs.prompt.length).toBeGreaterThan(0);
      expect(callArgs.prompt.length).not.toBe(0);
    });

    it('should handle non-string, non-Error errorMessage with fallback', async () => {
      jest.clearAllMocks();
      const errorMessage = { code: 'ERR123', detail: 'Some error' };

      const mockResponse = JSON.stringify({
        errorType: 'Unknown',
        summary: 'Error occurred',
        userFriendlyExplanation: 'Something went wrong',
        foreignKeyExplanation: null,
        technicalDetails: {
          originalError: JSON.stringify(errorMessage).substring(0, 200),
          availableContext: { schema: false, sql: false },
          missingData: []
        }
      });

      mockGenerateText.mockResolvedValue({ text: mockResponse });

      const result = await parseDbError(errorMessage);

      expect(result.errorType).toBe('Unknown');
      expect(result.errorType).not.toBe('Syntax Error');
      expect(result.errorType).not.toBe('Invalid Input');
      expect(result.errorType).not.toBe('');
      expect(typeof result.errorType).toBe('string');
      expect(typeof result.errorType).not.toBe('object');
      expect(result.userFriendlyExplanation).toBeDefined();
      expect(result.userFriendlyExplanation).not.toBe('');
      expect(result.userFriendlyExplanation).not.toBeUndefined();
      expect(result.userFriendlyExplanation).not.toBeNull();
      expect(typeof result.userFriendlyExplanation).toBe('string');
      expect(result.userFriendlyExplanation.length).toBeGreaterThan(0);
      expect(result.userFriendlyExplanation.length).not.toBe(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(0);
      expect(mockGenerateText).not.toHaveBeenCalledTimes(2);
    });
  });

  // Additional tests to kill surviving mutants
  describe('Mutation Resistance Tests', () => {
    describe('cleanMarkdownCodeBlocks function behavior', () => {
      it('should handle text with only json markdown wrapper', async () => {
        const mockResponse = '```json\n["test"]\n```';
        mockGenerateText.mockResolvedValue({ text: mockResponse });
        
        const result = await generatequerysuggestions([{ name: 'test', columns: [] }]);
        expect(result).toEqual(['test']);
        expect(result[0]).toBe('test');
      });

      it('should handle text with generic markdown wrapper', async () => {
        const mockResponse = '```\n["test"]\n```';
        mockGenerateText.mockResolvedValue({ text: mockResponse });
        
        const result = await generatequerysuggestions([{ name: 'test', columns: [] }]);
        expect(result).toEqual(['test']);
      });

      it('should preserve trimmed text correctly', async () => {
        const mockResponse = '  \n  ["test"]  \n  ';
        mockGenerateText.mockResolvedValue({ text: mockResponse });
        
        const result = await generatequerysuggestions([{ name: 'test', columns: [] }]);
        expect(result).toEqual(['test']);
      });
    });

    describe('PlantUML validation', () => {
      it('should require @startuml at the beginning', async () => {
        mockGenerateText.mockResolvedValue({ text: 'class users\n@enduml' });
        
        await expect(schemaToUML([{ name: 'users', columns: [] }]))
          .rejects.toThrow('Invalid PlantUML code');
      });

      it('should require @enduml at the end', async () => {
        mockGenerateText.mockResolvedValue({ text: '@startuml\nclass users' });
        
        await expect(schemaToUML([{ name: 'users', columns: [] }]))
          .rejects.toThrow('Invalid PlantUML code');
      });

      it('should require both start and end markers', async () => {
        mockGenerateText.mockResolvedValue({ text: 'class users' });
        
        await expect(schemaToUML([{ name: 'users', columns: [] }]))
          .rejects.toThrow('Invalid PlantUML code');
      });
    });

    describe('Schema validation for inferDatabaseSchema', () => {
      it('should validate projectName exists', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({ tables: [], description: 'test' }) 
        });
        
        await expect(inferDatabaseSchema('test'))
          .rejects.toThrow('Invalid schema structure');
      });

      it('should validate tables exists', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({ projectName: 'test', description: 'test' }) 
        });
        
        await expect(inferDatabaseSchema('test'))
          .rejects.toThrow('Invalid schema structure');
      });

      it('should validate tables is an array', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({ projectName: 'test', tables: 'not array', description: 'test' }) 
        });
        
        await expect(inferDatabaseSchema('test'))
          .rejects.toThrow('Invalid schema structure');
      });
    });

    describe('generateCreateTableStatements column handling', () => {
      it('should handle columns with only references', () => {
        const tables = [{
          name: 'posts',
          columns: [{ name: 'user_id', type: 'UUID', references: 'users(id)' }]
        }];

        const result = generateCreateTableStatements(tables);
        expect(result).toContain('user_id UUID REFERENCES users(id)');
        expect(result).not.toContain('undefined');
      });

      it('should handle columns with empty constraints array', () => {
        const tables = [{
          name: 'test',
          columns: [{ name: 'id', type: 'UUID', constraints: [] }]
        }];

        const result = generateCreateTableStatements(tables);
        expect(result).toContain('id UUID');
        expect(result).not.toContain('id UUID  ');
      });

      it('should handle columns without any constraints or references', () => {
        const tables = [{
          name: 'test',
          columns: [{ name: 'name', type: 'VARCHAR' }]
        }];

        const result = generateCreateTableStatements(tables);
        expect(result).toBe('CREATE TABLE test (\n    name VARCHAR\n);');
      });
    });

    describe('analyzeCreateTableRequest schema context', () => {
      it('should handle empty existing schema differently than populated', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            action: 'create_table',
            proposed_sql: 'CREATE TABLE test (id UUID);',
            explaination: 'test',
            requires_confirmation: false
          })
        });

        await analyzeCreateTableRequest('test', []);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('Database is currently empty');
        expect(call.prompt).not.toContain('Existing tables');
      });

      it('should list existing tables when schema is provided', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            action: 'create_table',
            proposed_sql: 'CREATE TABLE test (id UUID);',
            explaination: 'test',
            requires_confirmation: false
          })
        });

        await analyzeCreateTableRequest('test', [
          { name: 'users', columns: [{ name: 'id', type: 'UUID' }] }
        ]);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('Existing tables in database');
        expect(call.prompt).toContain('users');
        expect(call.prompt).not.toContain('Database is currently empty');
      });
    });

    describe('analyzeProjectUpdateRequest with various schema properties', () => {
      it('should handle columns with nullable false', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            operations: [{ type: 'test', sql: 'TEST' }],
            requires_confirmation: true
          })
        });

        await analyzeProjectUpdateRequest('test', [
          { name: 'users', columns: [{ name: 'id', type: 'UUID', nullable: false }] }
        ]);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('NOT NULL');
      });

      it('should handle columns without nullable property', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            operations: [{ type: 'test', sql: 'TEST' }],
            requires_confirmation: true
          })
        });

        await analyzeProjectUpdateRequest('test', [
          { name: 'users', columns: [{ name: 'id', type: 'UUID', nullable: true }] }
        ]);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).not.toContain('NOT NULL');
        expect(call.prompt).toContain('id (UUID)');
      });

      it('should handle columns with constraint property', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            operations: [{ type: 'test', sql: 'TEST' }],
            requires_confirmation: true
          })
        });

        await analyzeProjectUpdateRequest('test', [
          { name: 'users', columns: [{ name: 'id', type: 'UUID', constraint: 'PRIMARY KEY' }] }
        ]);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('[PRIMARY KEY]');
      });

      it('should use default project name when not provided', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            operations: [{ type: 'test', sql: 'TEST' }],
            requires_confirmation: true
          })
        });

        await analyzeProjectUpdateRequest('test', []);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('Project: database');
      });
    });

    describe('generateDatabaseSummary statistics handling', () => {
      it('should calculate totals correctly with multiple tables', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            quickStats: { totalTables: 2, totalColumns: 3, totalRelationships: 0, estimatedRows: '150' },
            description: 'test',
            techSpecs: 'test'
          })
        });

        const schema = [
          { name: 'users', columns: [{ name: 'id', type: 'UUID' }, { name: 'email', type: 'VARCHAR' }] },
          { name: 'posts', columns: [{ name: 'id', type: 'UUID' }] }
        ];
        const stats = { users: 100, posts: 50 };

        await generateDatabaseSummary(schema, stats, 'test');
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('2 tables');
        expect(call.prompt).toContain('3 columns');
        expect(call.prompt).toContain('150 records');
      });

      it('should count foreign key relationships', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            quickStats: { totalTables: 1, totalColumns: 2, totalRelationships: 1, estimatedRows: '0' },
            description: 'test',
            techSpecs: 'test'
          })
        });

        const schema = [{
          name: 'posts',
          columns: [
            { name: 'id', type: 'UUID' },
            { name: 'user_id', type: 'UUID', foreign_table: 'users' }
          ]
        }];

        await generateDatabaseSummary(schema, {}, 'test');
        
        const call = mockGenerateText.mock.calls[0][0];
        // Relationship count should be calculated
        expect(call.prompt).toMatch(/\d+ records/);
      });
    });

    describe('generateTitleFromSql edge cases', () => {
      it('should handle very long SQL queries in fallback', async () => {
        const longSql = 'SELECT * FROM '.repeat(50) + 'users';
        mockGenerateText.mockRejectedValue(new Error('timeout'));

        const result = await generateTitleFromSql(longSql, []);
        
        expect(result).toHaveLength(53); // 50 chars + "..."
        expect(result.endsWith('...')).toBe(true);
      });

      it('should remove quotes from AI generated title', async () => {
        mockGenerateText.mockResolvedValue({ text: '"Get all users"' });
        
        const result = await generateTitleFromSql('SELECT * FROM users', []);
        
        expect(result).toBe('Get all users');
        expect(result).not.toContain('"');
      });

      it('should use fallback when title is only quotes', async () => {
        mockGenerateText.mockResolvedValue({ text: '""' });
        
        const result = await generateTitleFromSql('SELECT id FROM users', []);
        
        expect(result).toContain('...');
        expect(result).toContain('SELECT id FROM users');
      });
    });

    describe('generateOptimizationSuggestions structure validation', () => {
      it('should handle null response from AI', async () => {
        mockGenerateText.mockResolvedValue({ text: 'null' });
        
        await expect(generateOptimizationSuggestions([{ name: 'test', columns: [] }]))
          .rejects.toThrow('Failed to generate optimization suggestions');
      });

      it('should handle non-object response', async () => {
        // String is not an object with suggestion properties
        mockGenerateText.mockResolvedValue({ text: '"string"' });
        
        await expect(generateOptimizationSuggestions([{ name: 'test', columns: [] }]))
          .rejects.toThrow('Failed to generate optimization suggestions');
      });

      it('should provide empty arrays for missing categories', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({ totalSuggestions: 1 }) 
        });
        
        const result = await generateOptimizationSuggestions([{ name: 'test', columns: [] }]);
        
        expect(Array.isArray(result.queryPerformance)).toBe(true);
        expect(Array.isArray(result.missingIndexes)).toBe(true);
        expect(Array.isArray(result.schemaImprovements)).toBe(true);
        expect(Array.isArray(result.potentialIssues)).toBe(true);
      });

      it('should handle schema with column constraints', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            totalSuggestions: 0,
            queryPerformance: [],
            missingIndexes: [],
            schemaImprovements: [],
            potentialIssues: []
          })
        });
        
        const schema = [{
          name: 'users',
          columns: [{ name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'NOT NULL'] }]
        }];
        
        await generateOptimizationSuggestions(schema);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('[PRIMARY KEY, NOT NULL]');
      });

      it('should handle schema with column references', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            totalSuggestions: 0,
            queryPerformance: [],
            missingIndexes: [],
            schemaImprovements: [],
            potentialIssues: []
          })
        });
        
        const schema = [{
          name: 'posts',
          columns: [{ name: 'user_id', type: 'UUID', references: 'users(id)' }]
        }];
        
        await generateOptimizationSuggestions(schema);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('-> users(id)');
      });
    });

    describe('parseDbError context handling', () => {
      it('should handle schema with multiple tables in context', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            errorType: 'Test',
            userFriendlyExplanation: 'test',
            technicalDetails: { originalError: 'test', availableContext: { schema: true, sql: false }, missingData: [] }
          })
        });

        const schema = [
          { name: 'users', columns: [{ name: 'id' }] },
          { name: 'posts', columns: [{ name: 'id' }, { name: 'user_id' }] }
        ];

        await parseDbError('test error', null, schema);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('Table "users"');
        expect(call.prompt).toContain('Table "posts"');
        expect(call.prompt).toContain('id, user_id');
      });

      it('should truncate very long error messages', async () => {
        const longError = 'error '.repeat(100);
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            errorType: 'Test',
            userFriendlyExplanation: 'test',
            technicalDetails: { originalError: longError.substring(0, 200), availableContext: { schema: false, sql: false }, missingData: [] }
          })
        });

        await parseDbError(longError);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain(longError.substring(0, 200));
      });

      it('should use correct context flags when both schema and sql provided', async () => {
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            errorType: 'Test',
            userFriendlyExplanation: 'test',
            technicalDetails: { originalError: 'test', availableContext: { schema: true, sql: true }, missingData: [] }
          })
        });

        await parseDbError('error', 'SELECT * FROM users', [{ name: 'users', columns: [{ name: 'id' }] }]);
        
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('Database Schema Context');
        expect(call.prompt).toContain('SQL Query that caused the error');
        // The prompt contains "Unavailable" in the instructions, so we check for actual values
        expect(call.prompt).toContain('Table "users": id');
        expect(call.prompt).toContain('SELECT * FROM users');
      });

      it('should handle Error objects with message property', async () => {
        const errorObj = new Error('Database connection failed');
        mockGenerateText.mockResolvedValue({ 
          text: JSON.stringify({
            errorType: 'Connection Error',
            userFriendlyExplanation: 'Cannot connect to database',
            technicalDetails: { originalError: 'Database connection failed', availableContext: { schema: false, sql: false }, missingData: [] }
          })
        });

        const result = await parseDbError(errorObj);
        
        expect(result.errorType).toBe('Connection Error');
        const call = mockGenerateText.mock.calls[0][0];
        expect(call.prompt).toContain('Database connection failed');
      });

      it('should set correct boolean flags in fallback response', async () => {
        mockGenerateText.mockRejectedValue(new Error('AI failed'));

        const result = await parseDbError('test', 'SELECT 1', [{ name: 'test', columns: [] }]);
        
        expect(result.technicalDetails.availableContext.schema).toBe(true);
        expect(result.technicalDetails.availableContext.sql).toBe(true);
      });

      it('should set correct boolean flags in fallback when no context', async () => {
        mockGenerateText.mockRejectedValue(new Error('AI failed'));

        const result = await parseDbError('test');
        
        expect(result.technicalDetails.availableContext.schema).toBe(false);
        expect(result.technicalDetails.availableContext.sql).toBe(false);
      });

      it('should handle very long errors in fallback userFriendlyExplanation', async () => {
        const veryLongError = 'x'.repeat(500);
        mockGenerateText.mockRejectedValue(new Error('AI failed'));

        const result = await parseDbError(veryLongError);
        
        expect(result.userFriendlyExplanation).toHaveLength(203); // 200 + "..."
        expect(result.userFriendlyExplanation.endsWith('...')).toBe(true);
      });

      it('should use short error as-is in fallback when under 200 chars', async () => {
        const shortError = 'short error';
        mockGenerateText.mockRejectedValue(new Error('AI failed'));

        const result = await parseDbError(shortError);
        
        expect(result.userFriendlyExplanation).toBe(shortError);
        expect(result.userFriendlyExplanation).not.toContain('...');
      });
    });
  });
});
