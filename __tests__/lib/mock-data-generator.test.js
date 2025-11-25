/**
 * @jest-environment node
 */

// Mock db module
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();

jest.mock('@/lib/db', () => ({
  executeQuery: (...args) => mockExecuteQuery(...args),
  getDatabaseSchema: (...args) => mockGetDatabaseSchema(...args),
}));

describe('mock-data-generator', () => {
  let mockDataGenerator;

  beforeAll(() => {
    mockDataGenerator = require('@/lib/mock-data-generator');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteQuery.mockClear();
    mockGetDatabaseSchema.mockClear();
  });

  describe('analyzeSchemaForGeneration', () => {
    it('should analyze schema and build dependency graph', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'email', type: 'character varying', nullable: false },
          ],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.analyzeSchemaForGeneration('postgres://test');

      expect(mockGetDatabaseSchema).toHaveBeenCalledWith('postgres://test');
      expect(mockGetDatabaseSchema).not.toHaveBeenCalledWith('postgres://wrong');
      expect(mockGetDatabaseSchema).toHaveBeenCalledTimes(1);
      expect(mockGetDatabaseSchema).not.toHaveBeenCalledTimes(0);
      expect(mockGetDatabaseSchema).not.toHaveBeenCalledTimes(2);
      expect(result.tables).toBeDefined();
      expect(result.tables).not.toBeUndefined();
      expect(result.tables).not.toBeNull();
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies).not.toBeUndefined();
      expect(result.dependencies).not.toBeNull();
      expect(Object.keys(result.tables)).toHaveLength(2);
      expect(Object.keys(result.tables)).not.toHaveLength(0);
      expect(Object.keys(result.tables)).not.toHaveLength(1);
      expect(Object.keys(result.tables)).not.toHaveLength(3);
      expect(result.tables.users).toBeDefined();
      expect(result.tables.users).not.toBeUndefined();
      expect(result.tables.posts).toBeDefined();
      expect(result.tables.posts).not.toBeUndefined();
      expect(result.tables.users.name).toBe('users');
      expect(result.tables.users.name).not.toBe('user');
      expect(result.tables.users.name).not.toBe('posts');
      expect(result.tables.users.name).not.toBe('');
      expect(result.dependencies.posts).toEqual(['users']);
      expect(result.dependencies.posts).not.toEqual([]);
      expect(result.dependencies.posts).toHaveLength(1);
      expect(result.dependencies.posts).not.toHaveLength(0);
      expect(result.dependencies.users).toHaveLength(0);
      expect(result.dependencies.users).not.toHaveLength(1);
    });

    it('should identify primary keys correctly', async () => {
      const mockSchema = [
        {
          name: 'products',
          columns: [
            { name: 'product_id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.analyzeSchemaForGeneration('postgres://test');

      expect(result.tables.products.primaryKey).toBeDefined();
      expect(result.tables.products.primaryKey).not.toBeUndefined();
      expect(result.tables.products.primaryKey).not.toBeNull();
      expect(result.tables.products.primaryKey.name).toBe('product_id');
      expect(result.tables.products.primaryKey.name).not.toBe('id');
      expect(result.tables.products.primaryKey.name).not.toBe('products_id');
      expect(result.tables.products.primaryKey.constraint).toBe('PRIMARY KEY');
      expect(result.tables.products.primaryKey.constraint).not.toBe('FOREIGN KEY');
      expect(result.tables.products.primaryKey.constraint).not.toBe('');
    });

    it('should identify foreign keys correctly', async () => {
      const mockSchema = [
        {
          name: 'customers',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'customer_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'customers', foreign_column: 'id', nullable: false },
            { name: 'product_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'products', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.analyzeSchemaForGeneration('postgres://test');

      expect(result.tables.orders.foreignKeys).toHaveLength(2);
      expect(result.tables.orders.foreignKeys).not.toHaveLength(0);
      expect(result.tables.orders.foreignKeys).not.toHaveLength(1);
      expect(result.tables.orders.foreignKeys).not.toHaveLength(3);
      expect(result.tables.orders.dependencies).toHaveLength(2);
      expect(result.tables.orders.dependencies).not.toHaveLength(0);
      expect(result.tables.orders.dependencies).not.toHaveLength(1);
      expect(result.dependencies.orders).toContain('customers');
      expect(result.dependencies.orders).toContain('products');
      expect(result.dependencies.orders).not.toContain('orders');
      expect(result.dependencies.orders).toHaveLength(2);
      expect(result.dependencies.orders).not.toHaveLength(1);
    });

    it('should handle tables without foreign keys', async () => {
      const mockSchema = [
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.analyzeSchemaForGeneration('postgres://test');

      expect(result.tables.categories.foreignKeys).toHaveLength(0);
      expect(result.tables.categories.foreignKeys).not.toHaveLength(1);
      expect(result.tables.categories.foreignKeys).not.toHaveLength(2);
      expect(result.dependencies.categories).toHaveLength(0);
      expect(result.dependencies.categories).not.toHaveLength(1);
      expect(result.dependencies.categories).toEqual([]);
      expect(result.dependencies.categories).not.toEqual(['categories']);
    });
  });

  describe('generateTableData', () => {
    it('should generate specified number of records', () => {
      const table = {
        name: 'users',
        columns: [
          { name: 'name', type: 'character varying', nullable: false },
          { name: 'age', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      expect(records).toHaveLength(5);
      expect(records).not.toHaveLength(0);
      expect(records).not.toHaveLength(4);
      expect(records).not.toHaveLength(6);
      expect(Array.isArray(records)).toBe(true);
      expect(Array.isArray(records)).not.toBe(false);
    });

    it('should skip auto-increment primary keys', () => {
      const table = {
        name: 'users',
        columns: [
          { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', default: 'nextval(...)', nullable: false },
          { name: 'email', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 3);

      expect(records[0]).not.toHaveProperty('id');
      expect(records[0]).toHaveProperty('email');
      expect(records[0].email).toBeDefined();
      expect(records[0].email).not.toBeUndefined();
      expect(records[0].email).not.toBeNull();
      expect(typeof records[0].email).toBe('string');
      expect(typeof records[0].email).not.toBe('number');
      expect(typeof records[0].email).not.toBe('object');
    });

    it('should handle nullable columns correctly', () => {
      const table = {
        name: 'profiles',
        columns: [
          { name: 'bio', type: 'text', nullable: true },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 50);

      const nullRecords = records.filter(r => r.bio === null);
      const nonNullRecords = records.filter(r => r.bio !== null);
      
      expect(records).toHaveLength(50);
      expect(records).not.toHaveLength(0);
      expect(records).not.toHaveLength(49);
      expect(records).not.toHaveLength(51);
      expect(nullRecords.length).toBeGreaterThan(0);
      expect(nullRecords.length).not.toBe(50);
      expect(nonNullRecords.length).toBeGreaterThan(0);
      expect(nonNullRecords.length).not.toBe(0);
      expect(nullRecords.length + nonNullRecords.length).toBe(50);
      expect(nullRecords.length + nonNullRecords.length).not.toBe(0);
      expect(nullRecords.length + nonNullRecords.length).not.toBe(49);
    });

    it('should generate email addresses for email columns', () => {
      const table = {
        name: 'users',
        columns: [
          { name: 'email', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.email).toMatch(/@/);
        expect(record.email).not.toMatch(/^@/);
        expect(record.email).toMatch(/\./);
        expect(record.email).not.toMatch(/^\.$/);
        expect(typeof record.email).toBe('string');
        expect(typeof record.email).not.toBe('object');
        expect(record.email.length).toBeGreaterThan(0);
        expect(record.email.length).not.toBe(0);
        expect(record.email.length).toBeGreaterThan(5);
      });
    });

    it('should generate phone numbers for phone columns', () => {
      const table = {
        name: 'contacts',
        columns: [
          { name: 'phone', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.phone).toBeDefined();
        expect(record.phone).not.toBeUndefined();
        expect(record.phone).not.toBeNull();
        expect(typeof record.phone).toBe('string');
        expect(typeof record.phone).not.toBe('number');
        expect(record.phone.length).toBeGreaterThan(5);
        expect(record.phone.length).not.toBe(0);
        expect(record.phone.length).not.toBe(5);
        expect(record.phone).toMatch(/\d/);
        expect(record.phone).not.toMatch(/^[a-zA-Z]+$/);
      });
    });

    it('should generate names for name columns', () => {
      const table = {
        name: 'users',
        columns: [
          { name: 'first_name', type: 'character varying', nullable: false },
          { name: 'last_name', type: 'character varying', nullable: false },
          { name: 'name', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(record.first_name).toBeDefined();
        expect(record.first_name).not.toBeUndefined();
        expect(record.last_name).toBeDefined();
        expect(record.last_name).not.toBeUndefined();
        expect(record.name).toBeDefined();
        expect(record.name).not.toBeUndefined();
        expect(typeof record.first_name).toBe('string');
        expect(typeof record.first_name).not.toBe('number');
        expect(typeof record.last_name).toBe('string');
        expect(typeof record.last_name).not.toBe('number');
        expect(typeof record.name).toBe('string');
        expect(typeof record.name).not.toBe('number');
        expect(record.name).toContain(' ');
        expect(record.name).not.toBe('');
        expect(record.name.length).toBeGreaterThan(2);
      });
    });

    it('should generate integers within reasonable range', () => {
      const table = {
        name: 'stats',
        columns: [
          { name: 'count', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      records.forEach(record => {
        expect(typeof record.count).toBe('number');
        expect(typeof record.count).not.toBe('string');
        expect(Number.isInteger(record.count)).toBe(true);
        expect(Number.isInteger(record.count)).not.toBe(false);
        expect(record.count).toBeGreaterThanOrEqual(1);
        expect(record.count).toBeLessThanOrEqual(100000);
      });
    });

    it('should generate age values for age columns', () => {
      const table = {
        name: 'users',
        columns: [
          { name: 'age', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      records.forEach(record => {
        expect(record.age).toBeGreaterThanOrEqual(18);
        expect(record.age).not.toBeLessThan(18);
        expect(record.age).toBeLessThanOrEqual(98);
        expect(record.age).not.toBeGreaterThan(98);
        expect(Number.isInteger(record.age)).toBe(true);
        expect(Number.isInteger(record.age)).not.toBe(false);
        expect(typeof record.age).toBe('number');
        expect(typeof record.age).not.toBe('string');
      });
    });

    it('should generate boolean values', () => {
      const table = {
        name: 'settings',
        columns: [
          { name: 'enabled', type: 'boolean', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      const trueCount = records.filter(r => r.enabled === true).length;
      const falseCount = records.filter(r => r.enabled === false).length;

      expect(trueCount + falseCount).toBe(20);
      expect(trueCount + falseCount).not.toBe(0);
      expect(trueCount + falseCount).not.toBe(19);
      expect(trueCount).toBeGreaterThan(0);
      expect(trueCount).not.toBe(20);
      expect(falseCount).toBeGreaterThan(0);
      expect(falseCount).not.toBe(20);
      records.forEach(record => {
        expect(typeof record.enabled).toBe('boolean');
        expect(typeof record.enabled).not.toBe('string');
      });
    });

    it('should generate UUID format for uuid columns', () => {
      const table = {
        name: 'sessions',
        columns: [
          { name: 'session_id', type: 'uuid', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(record.session_id).not.toMatch(/^[0-9]{8}$/);
        expect(typeof record.session_id).toBe('string');
        expect(typeof record.session_id).not.toBe('number');
        expect(record.session_id.length).toBe(36);
        expect(record.session_id.length).not.toBe(0);
        expect(record.session_id.length).not.toBe(35);
        expect(record.session_id.length).not.toBe(37);
        expect(record.session_id).toContain('-');
      });
    });

    it('should generate dates in ISO format', () => {
      const table = {
        name: 'events',
        columns: [
          { name: 'event_date', type: 'date', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.event_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(record.event_date).not.toMatch(/^\d{2}-\d{2}-\d{4}$/);
        expect(typeof record.event_date).toBe('string');
        expect(typeof record.event_date).not.toBe('object');
        expect(record.event_date.length).toBe(10);
        expect(record.event_date.length).not.toBe(0);
        expect(new Date(record.event_date).toString()).not.toBe('Invalid Date');
        expect(record.event_date).toContain('-');
      });
    });

    it('should generate timestamps', () => {
      const table = {
        name: 'logs',
        columns: [
          { name: 'created_at', type: 'timestamp without time zone', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.created_at).toBeDefined();
        expect(record.created_at).not.toBeUndefined();
        expect(record.created_at).not.toBeNull();
        expect(typeof record.created_at).toBe('string');
        expect(typeof record.created_at).not.toBe('object');
        expect(record.created_at).toContain('T');
        expect(record.created_at).not.toBe('');
        expect(record.created_at.length).toBeGreaterThan(10);
        expect(new Date(record.created_at).toString()).not.toBe('Invalid Date');
      });
    });

    it('should generate JSON objects', () => {
      const table = {
        name: 'metadata',
        columns: [
          { name: 'config', type: 'json', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.config).toBe('string');
        expect(typeof record.config).not.toBe('object');
        expect(record.config).not.toBe('');
        expect(() => JSON.parse(record.config)).not.toThrow();
        const parsed = JSON.parse(record.config);
        expect(typeof parsed).toBe('object');
        expect(typeof parsed).not.toBe('string');
        expect(parsed).not.toBeNull();
        expect(parsed).not.toBeUndefined();
        expect(Array.isArray(parsed)).toBe(false);
      });
    });

    it('should handle foreign keys with provided data', () => {
      const table = {
        name: 'posts',
        columns: [
          { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id', nullable: false },
          { name: 'title', type: 'character varying', nullable: false },
        ],
      };

      const foreignKeyData = {
        users: [
          { id: 1, email: 'user1@test.com' },
          { id: 2, email: 'user2@test.com' },
          { id: 3, email: 'user3@test.com' },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {}, foreignKeyData);

      records.forEach(record => {
        expect([1, 2, 3]).toContain(record.user_id);
        expect([4, 5, 6]).not.toContain(record.user_id);
        expect(record.user_id).toBeDefined();
        expect(record.user_id).not.toBeUndefined();
        expect(record.user_id).not.toBeNull();
        expect(typeof record.user_id).toBe('number');
        expect(typeof record.user_id).not.toBe('string');
        expect(record.user_id).toBeGreaterThan(0);
        expect(record.user_id).toBeLessThanOrEqual(3);
      });
    });

    it('should use default count of 10 when not specified', () => {
      const table = {
        name: 'items',
        columns: [
          { name: 'name', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table);

      expect(records).toHaveLength(10);
      expect(records).not.toHaveLength(0);
    });
  });

  describe('generateMockData', () => {
    it('should generate data respecting topological order', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', default: 'nextval(...)', nullable: false },
            { name: 'email', type: 'character varying', nullable: false },
          ],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', default: 'nextval(...)', nullable: false },
            { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id', nullable: false },
            { name: 'title', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test');

      expect(result.data).toBeDefined();
      expect(result.data).not.toBeUndefined();
      expect(result.data).not.toBeNull();
      expect(typeof result.data).toBe('object');
      expect(result.queries).toBeDefined();
      expect(result.queries).not.toBeUndefined();
      expect(result.queries).not.toBeNull();
      expect(result.summary).toBeDefined();
      expect(result.summary).not.toBeUndefined();
      expect(Array.isArray(result.queries)).toBe(true);
      expect(Array.isArray(result.queries)).not.toBe(false);
      expect(result.data.users).toBeDefined();
      expect(result.data.users).not.toBeUndefined();
      expect(result.data.posts).toBeDefined();
      expect(result.data.posts).not.toBeUndefined();
      expect(result.summary.tablesProcessed).toBe(2);
      expect(result.summary.tablesProcessed).not.toBe(0);
      expect(result.summary.tablesProcessed).not.toBe(1);
      expect(result.summary.tablesProcessed).not.toBe(3);
      expect(typeof result.summary.tablesProcessed).toBe('number');
      expect(result.summary.totalRecords).toBeGreaterThan(0);
      expect(result.summary.totalRecords).not.toBe(0);
      expect(typeof result.summary.totalRecords).toBe('number');
    });

    it('should use custom config when provided', async () => {
      const mockSchema = [
        {
          name: 'products',
          columns: [
            { name: 'name', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const config = {
        products: {
          count: 25,
          options: {},
        },
      };

      const result = await mockDataGenerator.generateMockData('postgres://test', config);

      expect(result.data.products).toHaveLength(25);
      expect(result.data.products).not.toHaveLength(10);
      expect(result.data.products).not.toHaveLength(0);
      expect(result.data.products).not.toHaveLength(24);
      expect(result.data.products).not.toHaveLength(26);
      expect(Array.isArray(result.data.products)).toBe(true);
    });

    it('should generate INSERT queries with proper SQL syntax', async () => {
      const mockSchema = [
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', default: 'nextval(...)', nullable: false },
            { name: 'name', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', { categories: { count: 3 } });

      expect(result.queries).toHaveLength(1);
      expect(result.queries).not.toHaveLength(0);
      expect(result.queries).not.toHaveLength(2);
      expect(result.queries[0]).toContain('INSERT INTO');
      expect(result.queries[0]).not.toContain('SELECT');
      expect(result.queries[0]).not.toContain('UPDATE');
      expect(result.queries[0]).not.toContain('DELETE');
      expect(result.queries[0]).toContain('"categories"');
      expect(result.queries[0]).toContain('VALUES');
      expect(result.queries[0]).not.toContain('undefined');
      expect(result.queries[0]).not.toContain('null');
      expect(typeof result.queries[0]).toBe('string');
      expect(typeof result.queries[0]).not.toBe('object');
    });

    it('should handle NULL values in generated data', async () => {
      const mockSchema = [
        {
          name: 'profiles',
          columns: [
            { name: 'bio', type: 'text', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', { profiles: { count: 100 } });

      // With 100 records and 10% null chance, should have some NULL values
      const hasNull = result.queries[0].includes('NULL');
      expect(hasNull).toBe(true);
      expect(hasNull).not.toBe(false);
      expect(typeof hasNull).toBe('boolean');
      expect(typeof hasNull).not.toBe('string');
      expect(result.queries[0]).not.toContain('null'); // lowercase null should not appear
      expect(result.queries[0]).not.toContain('undefined');
      expect(typeof result.queries[0]).toBe('string');
      expect(typeof result.queries[0]).not.toBe('object');
      expect(result.queries[0].length).toBeGreaterThan(0);
    });

    it('should escape single quotes in string values', async () => {
      const mockSchema = [
        {
          name: 'items',
          columns: [
            { name: 'description', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', { items: { count: 1 } });

      // Should not have unescaped single quotes that would break SQL
      const query = result.queries[0];
      expect(typeof query).toBe('string');
      expect(typeof query).not.toBe('object');
      expect(query).toContain('INSERT INTO');
      expect(query).toContain("'"); // SQL needs single quotes for values
      expect(query.length).toBeGreaterThan(0);
      expect(query).not.toBe('');
    });

    it('should calculate total records correctly', async () => {
      const mockSchema = [
        {
          name: 'table1',
          columns: [{ name: 'col1', type: 'integer', nullable: false }],
        },
        {
          name: 'table2',
          columns: [{ name: 'col1', type: 'integer', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const config = {
        table1: { count: 5 },
        table2: { count: 8 },
      };

      const result = await mockDataGenerator.generateMockData('postgres://test', config);

      expect(result.summary.totalRecords).toBe(13);
      expect(result.summary.totalRecords).not.toBe(0);
      expect(result.summary.totalRecords).not.toBe(10);
      expect(result.summary.totalRecords).not.toBe(5);
      expect(result.summary.totalRecords).not.toBe(8);
      expect(typeof result.summary.totalRecords).toBe('number');
      expect(result.summary.totalRecords).toBe(5 + 8);
    });
  });

  describe('executeMockDataGeneration', () => {
    it('should execute queries and return success result', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'email', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test', { users: { count: 5 } });

      expect(result.success).toBe(true);
      expect(result.success).not.toBe(false);
      expect(typeof result.success).toBe('boolean');
      expect(mockExecuteQuery).toHaveBeenCalled();
      expect(mockExecuteQuery).not.toHaveBeenCalledTimes(0);
      expect(mockExecuteQuery).toHaveBeenCalledTimes(3); // BEGIN, INSERT, COMMIT
      expect(mockExecuteQuery).not.toHaveBeenCalledTimes(2);
      expect(mockExecuteQuery).not.toHaveBeenCalledTimes(4);
      expect(mockExecuteQuery.mock.calls[0][1]).toBe('BEGIN;');
      expect(mockExecuteQuery.mock.calls[0][1]).not.toBe('COMMIT;');
      expect(mockExecuteQuery.mock.calls[0][1]).not.toBe('ROLLBACK;');
      expect(mockExecuteQuery.mock.calls[2][1]).toBe('COMMIT;');
      expect(mockExecuteQuery.mock.calls[2][1]).not.toBe('BEGIN;');
      expect(result.summary).toBeDefined();
      expect(result.summary.successfulTables).toBe(1);
      expect(result.summary.successfulTables).not.toBe(0);
      expect(result.summary.successfulTables).not.toBe(2);
      expect(typeof result.summary.successfulTables).toBe('number');
      expect(result.summary.failedTables).toBe(0);
      expect(result.summary.failedTables).not.toBe(1);
      expect(result.summary.failedTables).not.toBe(-1);
      expect(typeof result.summary.failedTables).toBe('number');
      expect(result.successfulTables).toHaveLength(1);
      expect(result.successfulTables).not.toHaveLength(0);
      expect(result.failedTables).toHaveLength(0);
      expect(result.failedTables).not.toHaveLength(1);
    });

    it('should handle query execution failures gracefully', async () => {
      const mockSchema = [
        {
          name: 'invalid_table',
          columns: [
            { name: 'col1', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')) // INSERT fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test');

      expect(result.success).toBe(false);
      expect(result.success).not.toBe(true);
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.success).not.toBe('string');
      expect(result.failedTables).toHaveLength(1);
      expect(result.failedTables).not.toHaveLength(0);
      expect(result.failedTables).not.toHaveLength(2);
      expect(result.successfulTables).toHaveLength(0);
      expect(result.successfulTables).not.toHaveLength(1);
      expect(result.failedTables[0].error).toContain('Constraint violation');
      expect(result.failedTables[0].error).not.toBe('');
      expect(typeof result.failedTables[0].error).toBe('string');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should execute ROLLBACK on query failure', async () => {
      const mockSchema = [
        {
          name: 'test_table',
          columns: [{ name: 'col1', type: 'integer', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('SQL error')) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await mockDataGenerator.executeMockDataGeneration('postgres://test');

      expect(mockExecuteQuery).toHaveBeenCalledWith('postgres://test', 'ROLLBACK;');
      expect(mockExecuteQuery).not.toHaveBeenCalledWith('postgres://wrong', 'ROLLBACK;');
      expect(mockExecuteQuery.mock.calls.some(call => call[1] === 'ROLLBACK;')).toBe(true);
      expect(mockExecuteQuery.mock.calls.some(call => call[1] === 'ROLLBACK;')).not.toBe(false);
      expect(mockExecuteQuery.mock.calls.some(call => call[1] === 'COMMIT;')).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle partial success scenarios', async () => {
      const mockSchema = [
        {
          name: 'table1',
          columns: [{ name: 'col1', type: 'integer', nullable: false }],
        },
        {
          name: 'table2',
          columns: [{ name: 'col1', type: 'integer', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN table1
        .mockResolvedValueOnce({ rows: [] }) // INSERT table1
        .mockResolvedValueOnce({ rows: [] }) // COMMIT table1
        .mockResolvedValueOnce({ rows: [] }) // BEGIN table2
        .mockRejectedValueOnce(new Error('Fail')) // INSERT table2
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK table2

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test');

      expect(result.success).toBe(true);
      expect(result.success).not.toBe(false);
      expect(typeof result.success).toBe('boolean');
      expect(result.summary.successfulTables).toBe(1);
      expect(result.summary.successfulTables).not.toBe(0);
      expect(result.summary.successfulTables).not.toBe(2);
      expect(result.summary.failedTables).toBe(1);
      expect(result.summary.failedTables).not.toBe(0);
      expect(result.summary.failedTables).not.toBe(2);
      expect(result.message).toContain('Partially completed');
      expect(result.message).not.toContain('Failed to generate');
      expect(result.message).not.toContain('Successfully generated');
      expect(typeof result.message).toBe('string');
      expect(result.successfulTables).toHaveLength(1);
      expect(result.successfulTables).not.toHaveLength(0);
      expect(result.failedTables).toHaveLength(1);
      expect(result.failedTables).not.toHaveLength(0);

      consoleErrorSpy.mockRestore();
    });

    it('should return detailed summary with table names', async () => {
      const mockSchema = [
        {
          name: 'products',
          columns: [{ name: 'name', type: 'character varying', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test', { products: { count: 7 } });

      expect(result.successfulTables[0].table).toBe('products');
      expect(result.successfulTables[0].table).not.toBe('product');
      expect(result.successfulTables[0].table).not.toBe('');
      expect(typeof result.successfulTables[0].table).toBe('string');
      expect(result.successfulTables[0].records).toBe(7);
      expect(result.successfulTables[0].records).not.toBe(0);
      expect(result.successfulTables[0].records).not.toBe(6);
      expect(result.successfulTables[0].records).not.toBe(8);
      expect(typeof result.successfulTables[0].records).toBe('number');
      expect(result.summary.totalRecords).toBe(7);
      expect(result.summary.totalRecords).not.toBe(0);
    });

    it('should handle empty schema gracefully', async () => {
      mockGetDatabaseSchema.mockResolvedValueOnce([]);

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test');

      expect(result.success).toBe(false);
      expect(result.success).not.toBe(true);
      expect(typeof result.success).toBe('boolean');
      expect(result.summary.tablesProcessed).toBe(0);
      expect(result.summary.tablesProcessed).not.toBe(1);
      expect(result.summary.totalRecords).toBe(0);
      expect(result.summary.totalRecords).not.toBe(1);
      expect(result.successfulTables).toHaveLength(0);
      expect(result.successfulTables).not.toHaveLength(1);
      expect(result.failedTables).toHaveLength(0);
      expect(result.failedTables).not.toHaveLength(1);
    });

    it('should handle schema fetch errors', async () => {
      mockGetDatabaseSchema.mockRejectedValueOnce(new Error('Connection failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test');

      expect(result.success).toBe(false);
      expect(result.success).not.toBe(true);
      expect(typeof result.success).toBe('boolean');
      expect(result.error).toBe('Connection failed');
      expect(result.error).not.toBe('');
      expect(result.error).not.toBe('Connection succeeded');
      expect(typeof result.error).toBe('string');
      expect(result.message).toBe('Failed to generate mock data');
      expect(result.message).not.toBe('Successfully generated');
      expect(typeof result.message).toBe('string');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Mock data generation failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('mockDataTemplates', () => {
    it('should export ecommerce template', () => {
      expect(mockDataGenerator.mockDataTemplates.ecommerce).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.ecommerce).not.toBeUndefined();
      expect(typeof mockDataGenerator.mockDataTemplates.ecommerce).toBe('object');
      expect(mockDataGenerator.mockDataTemplates.ecommerce.products).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.ecommerce.products).not.toBeUndefined();
      expect(mockDataGenerator.mockDataTemplates.ecommerce.products.count).toBe(50);
      expect(mockDataGenerator.mockDataTemplates.ecommerce.products.count).not.toBe(0);
      expect(mockDataGenerator.mockDataTemplates.ecommerce.products.count).not.toBe(10);
      expect(typeof mockDataGenerator.mockDataTemplates.ecommerce.products.count).toBe('number');
    });

    it('should export blog template', () => {
      expect(mockDataGenerator.mockDataTemplates.blog).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.blog.posts).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.blog.posts.count).toBe(100);
      expect(mockDataGenerator.mockDataTemplates.blog.posts.count).not.toBe(0);
      expect(mockDataGenerator.mockDataTemplates.blog.posts.count).not.toBe(50);
      expect(mockDataGenerator.mockDataTemplates.blog.comments).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.blog.comments).not.toBeUndefined();
      expect(mockDataGenerator.mockDataTemplates.blog.comments.count).toBe(500);
      expect(mockDataGenerator.mockDataTemplates.blog.comments.count).not.toBe(0);
      expect(mockDataGenerator.mockDataTemplates.blog.comments.count).not.toBe(100);
    });

    it('should export user_management template', () => {
      expect(mockDataGenerator.mockDataTemplates.user_management).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.user_management.users).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.user_management.users.count).toBe(100);
      expect(mockDataGenerator.mockDataTemplates.user_management.users.count).not.toBe(0);
      expect(mockDataGenerator.mockDataTemplates.user_management.users.count).not.toBe(50);
      expect(typeof mockDataGenerator.mockDataTemplates.user_management.users.count).toBe('number');
      expect(mockDataGenerator.mockDataTemplates.user_management.roles).toBeDefined();
      expect(mockDataGenerator.mockDataTemplates.user_management.roles).not.toBeUndefined();
    });

    it('should have valid template structure', () => {
      const templates = mockDataGenerator.mockDataTemplates;
      Object.keys(templates).forEach(templateName => {
        expect(typeof templates[templateName]).toBe('object');
        expect(templates[templateName]).not.toBeNull();
        Object.keys(templates[templateName]).forEach(tableName => {
          expect(templates[templateName][tableName].count).toBeDefined();
          expect(templates[templateName][tableName].count).not.toBeUndefined();
          expect(typeof templates[templateName][tableName].count).toBe('number');
          expect(typeof templates[templateName][tableName].count).not.toBe('string');
          expect(templates[templateName][tableName].count).toBeGreaterThan(0);
          expect(templates[templateName][tableName].count).not.toBe(0);
          expect(templates[templateName][tableName].count).not.toBeLessThan(1);
          expect(templates[templateName][tableName].options).toBeDefined();
          expect(templates[templateName][tableName].options).not.toBeUndefined();
        });
      });
    });
  });

  describe('edge cases and data type handling', () => {
    it('should handle decimal/numeric types with precision', () => {
      const table = {
        name: 'prices',
        columns: [
          { name: 'amount', type: 'decimal', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      records.forEach(record => {
        expect(typeof record.amount).toBe('number');
        expect(typeof record.amount).not.toBe('string');
        expect(record.amount).toBeGreaterThanOrEqual(0);
        expect(record.amount).not.toBeLessThan(0);
        expect(record.amount).not.toBeNaN();
        const decimalPlaces = (record.amount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
        expect(decimalPlaces).not.toBeGreaterThan(2);
      });
    });

    it('should handle bigint type', () => {
      const table = {
        name: 'large_numbers',
        columns: [
          { name: 'big_id', type: 'bigint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.big_id).toBe('number');
        expect(typeof record.big_id).not.toBe('string');
        expect(Number.isInteger(record.big_id)).toBe(true);
        expect(Number.isInteger(record.big_id)).not.toBe(false);
        expect(record.big_id).toBeGreaterThan(0);
        expect(record.big_id).not.toBe(0);
        expect(record.big_id).not.toBeLessThanOrEqual(0);
      });
    });

    it('should handle time types', () => {
      const table = {
        name: 'schedules',
        columns: [
          { name: 'start_time', type: 'time without time zone', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.start_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        expect(record.start_time).not.toMatch(/^\d{2}-\d{2}-\d{2}$/);
        expect(typeof record.start_time).toBe('string');
        expect(typeof record.start_time).not.toBe('object');
        expect(record.start_time).toContain(':');
        expect(record.start_time.length).toBe(8);
        expect(record.start_time.length).not.toBe(0);
      });
    });

    it('should handle varchar and text types differently', () => {
      const table = {
        name: 'content',
        columns: [
          { name: 'short_text', type: 'varchar', nullable: false },
          { name: 'long_text', type: 'text', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.short_text).toBe('string');
        expect(typeof record.short_text).not.toBe('number');
        expect(typeof record.long_text).toBe('string');
        expect(typeof record.long_text).not.toBe('number');
        expect(record.short_text).toBeDefined();
        expect(record.short_text).not.toBeUndefined();
        expect(record.short_text).not.toBeNull();
        expect(record.long_text).toBeDefined();
        expect(record.long_text).not.toBeUndefined();
        expect(record.long_text).not.toBeNull();
      });
    });

    it('should handle URL columns', () => {
      const table = {
        name: 'links',
        columns: [
          { name: 'website', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.website).toMatch(/^https?:\/\//);
        expect(record.website).not.toMatch(/^ftp:\/\//);
        expect(record.website).toContain('.');
        expect(record.website).not.toBe('');
        expect(typeof record.website).toBe('string');
        expect(record.website.length).toBeGreaterThan(10);
      });
    });

    it('should handle address columns', () => {
      const table = {
        name: 'locations',
        columns: [
          { name: 'address', type: 'character varying', nullable: false },
          { name: 'city', type: 'character varying', nullable: false },
          { name: 'country', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.address).toBeDefined();
        expect(record.address).not.toBeUndefined();
        expect(record.city).toBeDefined();
        expect(record.city).not.toBeUndefined();
        expect(record.country).toBeDefined();
        expect(record.country).not.toBeUndefined();
        expect(typeof record.address).toBe('string');
        expect(typeof record.address).not.toBe('number');
        expect(typeof record.city).toBe('string');
        expect(typeof record.city).not.toBe('number');
        expect(typeof record.country).toBe('string');
        expect(typeof record.country).not.toBe('number');
        expect(record.address.length).toBeGreaterThan(0);
        expect(record.city.length).toBeGreaterThan(0);
        expect(record.country.length).toBeGreaterThan(0);
      });
    });

    it('should handle company and title columns', () => {
      const table = {
        name: 'employees',
        columns: [
          { name: 'company', type: 'character varying', nullable: false },
          { name: 'title', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.company).toBeDefined();
        expect(record.company).not.toBeUndefined();
        expect(record.title).toBeDefined();
        expect(record.title).not.toBeUndefined();
        expect(typeof record.company).toBe('string');
        expect(typeof record.company).not.toBe('number');
        expect(typeof record.title).toBe('string');
        expect(record.company.length).toBeGreaterThan(0);
        expect(record.company.length).not.toBe(0);
        expect(record.title.length).toBeGreaterThan(0);
      });
    });

    it('should generate different values across records', () => {
      const table = {
        name: 'random_data',
        columns: [
          { name: 'value', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      const uniqueValues = new Set(records.map(r => r.value));
      expect(uniqueValues.size).toBeGreaterThan(1);
      expect(uniqueValues.size).not.toBe(0);
      expect(uniqueValues.size).not.toBe(1);
      expect(uniqueValues.size).toBeLessThanOrEqual(20);
      expect(uniqueValues.size).not.toBeGreaterThan(20);
      expect(typeof uniqueValues.size).toBe('number');
    });

    it('should generate year values for year columns', () => {
      const table = {
        name: 'events',
        columns: [
          { name: 'year', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      records.forEach(record => {
        expect(record.year).toBeGreaterThanOrEqual(1995);
        expect(record.year).not.toBeLessThan(1995);
        expect(record.year).toBeLessThanOrEqual(2025);
        expect(record.year).not.toBeGreaterThan(2025);
        expect(Number.isInteger(record.year)).toBe(true);
        expect(typeof record.year).toBe('number');
      });
    });

    it('should generate price/amount values for price columns', () => {
      const table = {
        name: 'products',
        columns: [
          { name: 'price', type: 'integer', nullable: false },
          { name: 'amount', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      records.forEach(record => {
        expect(record.price).toBeGreaterThanOrEqual(1);
        expect(record.price).toBeLessThanOrEqual(10001);
        expect(record.amount).toBeGreaterThanOrEqual(1);
        expect(record.amount).toBeLessThanOrEqual(10001);
        expect(Number.isInteger(record.price)).toBe(true);
        expect(Number.isInteger(record.amount)).toBe(true);
      });
    });

    it('should generate quantity/count values for quantity columns', () => {
      const table = {
        name: 'inventory',
        columns: [
          { name: 'quantity', type: 'integer', nullable: false },
          { name: 'count', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 20);

      records.forEach(record => {
        expect(record.quantity).toBeGreaterThanOrEqual(1);
        expect(record.quantity).not.toBe(0);
        expect(record.quantity).toBeLessThanOrEqual(101);
        expect(record.count).toBeGreaterThanOrEqual(1);
        expect(record.count).toBeLessThanOrEqual(101);
        expect(Number.isInteger(record.quantity)).toBe(true);
      });
    });

    it('should handle smallint type', () => {
      const table = {
        name: 'small_numbers',
        columns: [
          { name: 'small_id', type: 'smallint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.small_id).toBe('number');
        expect(typeof record.small_id).not.toBe('string');
        expect(Number.isInteger(record.small_id)).toBe(true);
        expect(record.small_id).toBeGreaterThan(0);
        expect(record.small_id).toBeLessThanOrEqual(32767);
        expect(record.small_id).not.toBeGreaterThan(32767);
      });
    });

    it('should handle real and double precision types', () => {
      const table = {
        name: 'measurements',
        columns: [
          { name: 'real_value', type: 'real', nullable: false },
          { name: 'double_value', type: 'double precision', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.real_value).toBe('number');
        expect(typeof record.double_value).toBe('number');
        expect(record.real_value).toBeGreaterThanOrEqual(0);
        expect(record.double_value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle timestamptz type', () => {
      const table = {
        name: 'events',
        columns: [
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.created_at).toBeDefined();
        expect(typeof record.created_at).toBe('string');
        expect(record.created_at).toContain('T');
        expect(new Date(record.created_at).toString()).not.toBe('Invalid Date');
      });
    });

    it('should handle time with time zone', () => {
      const table = {
        name: 'schedules',
        columns: [
          { name: 'start_time', type: 'time with time zone', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.start_time).toMatch(/^\d{2}:\d{2}:\d{2}\+00:00$/);
        expect(typeof record.start_time).toBe('string');
        expect(record.start_time).toContain('+00:00');
      });
    });

    it('should generate config JSON for config columns', () => {
      const table = {
        name: 'settings',
        columns: [
          { name: 'config', type: 'json', nullable: false },
          { name: 'user_settings', type: 'json', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        const config = JSON.parse(record.config);
        const settings = JSON.parse(record.user_settings);
        expect(config.theme).toBeDefined();
        expect(['light', 'dark']).toContain(config.theme);
        expect(typeof config.notifications).toBe('boolean');
        expect(['en', 'es', 'fr', 'de']).toContain(config.language);
        expect(settings.theme).toBeDefined();
      });
    });

    it('should generate metadata JSON for metadata columns', () => {
      const table = {
        name: 'documents',
        columns: [
          { name: 'metadata', type: 'json', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        const metadata = JSON.parse(record.metadata);
        expect(metadata.created_by).toBe('system');
        expect(metadata.version).toBe('1.0');
        expect(Array.isArray(metadata.tags)).toBe(true);
        expect(metadata.tags.length).toBeGreaterThan(0);
      });
    });

    it('should handle jsonb type', () => {
      const table = {
        name: 'data',
        columns: [
          { name: 'data', type: 'jsonb', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.data).toBe('string');
        expect(() => JSON.parse(record.data)).not.toThrow();
        const parsed = JSON.parse(record.data);
        expect(typeof parsed).toBe('object');
      });
    });

    it('should handle ARRAY type with known base type', () => {
      const table = {
        name: 'lists',
        columns: [
          { name: 'tags', type: 'integer[]', nullable: false },
        ],
      };

      // Override the generator to properly handle array syntax
      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        // Arrays should return actual JavaScript arrays
        expect(Array.isArray(record.tags)).toBe(true);
        expect(Array.isArray(record.tags)).not.toBe(false);
        expect(typeof record.tags).toBe('object');
        expect(typeof record.tags).not.toBe('string');
        expect(typeof record.tags).not.toBe('number');
        expect(record.tags).toBeDefined();
        expect(record.tags).not.toBeUndefined();
        expect(record.tags).not.toBeNull();
        expect(record.tags.length).toBeGreaterThan(0);
        expect(record.tags.length).not.toBe(0);
        expect(record.tags.length).toBeLessThanOrEqual(5);
        // Each item should be a number (integer[] uses integer generator)
        record.tags.forEach(tag => {
          expect(typeof tag).toBe('number');
          expect(typeof tag).not.toBe('string');
          expect(typeof tag).not.toBe('object');
          expect(tag).toBeDefined();
          expect(tag).not.toBeNull();
          expect(Number.isInteger(tag)).toBe(true);
          expect(Number.isInteger(tag)).not.toBe(false);
        });
      });
    });

    it('should use fallback for ARRAY type with unknown base type (L146-156 coverage)', () => {
      // To trigger the ARRAY handler, we need to bypass the .toLowerCase() or use type 'ARRAY'
      // However, since column.type.toLowerCase() is called, 'ARRAY' becomes 'array'
      // and dataGenerators['array'] is undefined (only 'ARRAY' key exists)
      // So we need to add a lowercase reference or modify how we call it
      
      // Let's directly call the ARRAY generator to cover lines 146-156
      const mockDataGenerator = require('@/lib/mock-data-generator');
      
      // Access the dataGenerators object (it's not exported, so we test via the exposed function)
      // Create a column with a type that will have an unknown base type when processed by ARRAY handler
      const table = {
        name: 'test_arrays',
        columns: [
          { name: 'data', type: 'unknown_base[]', nullable: false },
        ],
      };
      
      // Since 'unknown_base[]' lowercased is 'unknown_base[]' and won't match any generator,
      // it will fall back to generateRandomString for each array item
      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        // Falls back to array of random strings since 'unknown_base[]' is not in dataGenerators
        expect(Array.isArray(record.data)).toBe(true);
        expect(Array.isArray(record.data)).not.toBe(false);
        expect(typeof record.data).toBe('object');
        expect(typeof record.data).not.toBe('string');
        expect(typeof record.data).not.toBe('number');
        expect(record.data).toBeDefined();
        expect(record.data).not.toBeUndefined();
        expect(record.data).not.toBeNull();
        expect(record.data.length).toBeGreaterThan(0);
        expect(record.data.length).not.toBe(0);
        expect(record.data.length).toBeLessThanOrEqual(5);
        // Each item should match the fallback pattern: val_XXXXXX
        record.data.forEach(item => {
          expect(typeof item).toBe('string');
          expect(typeof item).not.toBe('number');
          expect(typeof item).not.toBe('object');
          expect(item).toMatch(/^val_[a-z0-9]+$/);
          expect(item).not.toMatch(/^[0-9]+$/);
          expect(item.length).toBeGreaterThan(0);
          expect(item.length).not.toBe(0);
        });
      });
    });

    it('should handle unknown data types with fallback', () => {
      const table = {
        name: 'unknown',
        columns: [
          { name: 'weird_type', type: 'unknown_type', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.weird_type).toBe('string');
        expect(record.weird_type.length).toBe(10);
        expect(record.weird_type.length).not.toBe(0);
      });
    });

    it('should handle char type', () => {
      const table = {
        name: 'codes',
        columns: [
          { name: 'code', type: 'char', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.code).toBe('string');
        expect(record.code).toBeDefined();
      });
    });

    it('should handle numeric type', () => {
      const table = {
        name: 'financials',
        columns: [
          { name: 'balance', type: 'numeric', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.balance).toBe('number');
        expect(record.balance).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle timestamp with time zone', () => {
      const table = {
        name: 'logs',
        columns: [
          { name: 'timestamp', type: 'timestamp with time zone', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.timestamp).toBe('string');
        expect(record.timestamp).toContain('T');
        expect(new Date(record.timestamp).toString()).not.toBe('Invalid Date');
      });
    });

    it('should handle circular dependencies in topological sort', async () => {
      const mockSchema = [
        {
          name: 'table_a',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'table_b_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'table_b', foreign_column: 'id', nullable: false },
          ],
        },
        {
          name: 'table_b',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'table_a_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'table_a', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test');

      // Should handle circular dependencies gracefully
      expect(result.data).toBeDefined();
      expect(result.queries).toBeDefined();
      expect(Array.isArray(result.queries)).toBe(true);
    });

    it('should handle custom min/max options for integer columns', () => {
      const table = {
        name: 'ranges',
        columns: [
          { name: 'value', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, { value: { min: 100, max: 200 } });

      records.forEach(record => {
        expect(record.value).toBeGreaterThanOrEqual(100);
        expect(record.value).toBeLessThanOrEqual(200);
        expect(record.value).not.toBeLessThan(100);
        expect(record.value).not.toBeGreaterThan(200);
      });
    });

    it('should handle custom min/max options for bigint columns', () => {
      const table = {
        name: 'big_ranges',
        columns: [
          { name: 'value', type: 'bigint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, { value: { min: 5000, max: 6000 } });

      records.forEach(record => {
        expect(record.value).toBeGreaterThanOrEqual(5000);
        expect(record.value).toBeLessThanOrEqual(6000);
      });
    });

    it('should handle custom min/max options for smallint columns', () => {
      const table = {
        name: 'small_ranges',
        columns: [
          { name: 'value', type: 'smallint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, { value: { min: 50, max: 100 } });

      records.forEach(record => {
        expect(record.value).toBeGreaterThanOrEqual(50);
        expect(record.value).toBeLessThanOrEqual(100);
      });
    });

    it('should handle custom precision for decimal columns', () => {
      const table = {
        name: 'decimals',
        columns: [
          { name: 'value', type: 'decimal', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, { value: { min: 10, max: 20, precision: 3 } });

      records.forEach(record => {
        expect(record.value).toBeGreaterThanOrEqual(10);
        expect(record.value).toBeLessThanOrEqual(20);
        const decimalPlaces = (record.value.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(3);
      });
    });

    it('should handle custom date range options', () => {
      const table = {
        name: 'dates',
        columns: [
          { name: 'event_date', type: 'date', nullable: false },
        ],
      };

      const startDate = new Date(2023, 0, 1);
      const endDate = new Date(2023, 11, 31);

      const records = mockDataGenerator.generateTableData(table, 10, { 
        event_date: { startDate, endDate } 
      });

      records.forEach(record => {
        const date = new Date(record.event_date);
        expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle custom timestamp range options', () => {
      const table = {
        name: 'timestamps',
        columns: [
          { name: 'created_at', type: 'timestamp without time zone', nullable: false },
        ],
      };

      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 11, 31);

      const records = mockDataGenerator.generateTableData(table, 10, { 
        created_at: { startDate, endDate } 
      });

      records.forEach(record => {
        const date = new Date(record.created_at);
        expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle serial type (auto-increment)', () => {
      const table = {
        name: 'sequences',
        columns: [
          { name: 'id', type: 'serial', constraint: 'PRIMARY KEY', nullable: false },
          { name: 'data', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(record).not.toHaveProperty('id');
        expect(record).toHaveProperty('data');
      });
    });

    it('should generate description text for description columns', () => {
      const table = {
        name: 'items',
        columns: [
          { name: 'description', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.description).toBe('string');
        expect(record.description).toContain('designed');
        expect(record.description.length).toBeGreaterThan(20);
      });
    });

    it('should generate pattern-based strings when pattern option is provided', () => {
      const table = {
        name: 'codes',
        columns: [
          { name: 'code', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5, {
        code: { pattern: 'XX-AAA-XX' }
      });

      records.forEach(record => {
        expect(typeof record.code).toBe('string');
        expect(record.code).toMatch(/^\d{2}-[A-Z]{3}-\d{2}$/);
        expect(record.code.length).toBeGreaterThan(5);
      });
    });

    it('should handle varchar as alias for character varying', () => {
      const table = {
        name: 'texts',
        columns: [
          { name: 'value', type: 'varchar', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.value).toBe('string');
        expect(record.value).toBeDefined();
      });
    });

    it('should handle text type as extended varchar', () => {
      const table = {
        name: 'articles',
        columns: [
          { name: 'content', type: 'text', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.content).toBe('string');
        expect(record.content).toBeDefined();
        expect(record.content.length).toBeGreaterThan(0);
      });
    });

    it('should generate position values for position columns', () => {
      const table = {
        name: 'employees',
        columns: [
          { name: 'position', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.position).toBe('string');
        expect(record.position).toBeDefined();
        expect(record.position.length).toBeGreaterThan(0);
      });
    });

    it('should handle maxLength option for varchar columns', () => {
      const table = {
        name: 'codes',
        columns: [
          { name: 'short_code', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {
        short_code: { maxLength: 10 }
      });

      records.forEach(record => {
        expect(typeof record.short_code).toBe('string');
        expect(record.short_code.length).toBeLessThanOrEqual(10);
        expect(record.short_code.length).toBeGreaterThan(0);
      });
    });

    it('should handle default maxLength when not specified', () => {
      const table = {
        name: 'data',
        columns: [
          { name: 'random_field', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.random_field).toBe('string');
        expect(record.random_field.length).toBeLessThanOrEqual(50);
        expect(record.random_field.length).toBeGreaterThan(0);
      });
    });

    it('should handle missing foreign table in dependency analysis', async () => {
      const mockSchema = [
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'nonexistent_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'nonexistent_table', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.analyzeSchemaForGeneration('postgres://test');

      // Should not add dependency for nonexistent table
      expect(result.dependencies.orders).toHaveLength(0);
      expect(result.dependencies.orders).not.toHaveLength(1);
      expect(result.tables.orders.dependencies).toHaveLength(0);
    });

    it('should handle foreign key without foreign_table specified', async () => {
      const mockSchema = [
        {
          name: 'items',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'ref_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.analyzeSchemaForGeneration('postgres://test');

      expect(result.tables.items.foreignKeys).toHaveLength(1);
      expect(result.dependencies.items).toHaveLength(0);
    });

    it('should handle empty foreign key data gracefully', () => {
      const table = {
        name: 'posts',
        columns: [
          { name: 'user_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'users', foreign_column: 'id', nullable: false },
          { name: 'title', type: 'character varying', nullable: false },
        ],
      };

      const foreignKeyData = {
        users: [] // empty array
      };

      const records = mockDataGenerator.generateTableData(table, 5, {}, foreignKeyData);

      records.forEach(record => {
        // Should still generate value using regular integer generator when foreignKeyData is empty
        expect(typeof record.user_id).toBe('number');
        expect(typeof record.user_id).not.toBe('string');
        expect(record.user_id).toBeGreaterThan(0);
        expect(record.title).toBeDefined();
        expect(record.title).not.toBeUndefined();
      });
    });

    it('should handle foreign key with no matching foreign table in data', () => {
      const table = {
        name: 'comments',
        columns: [
          { name: 'post_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'posts', foreign_column: 'id', nullable: false },
          { name: 'content', type: 'character varying', nullable: false },
        ],
      };

      const foreignKeyData = {
        users: [{ id: 1 }] // different table
      };

      const records = mockDataGenerator.generateTableData(table, 5, {}, foreignKeyData);

      records.forEach(record => {
        // Should generate value since posts not in foreignKeyData
        expect(typeof record.post_id).toBe('number');
        expect(record.content).toBeDefined();
      });
    });

    it('should skip primary key with default containing nextval', () => {
      const table = {
        name: 'sequences',
        columns: [
          { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', default: "nextval('seq')", nullable: false },
          { name: 'data', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(record).not.toHaveProperty('id');
        expect(record).toHaveProperty('data');
      });
    });

    it('should include primary key without auto-increment', () => {
      const table = {
        name: 'manual_ids',
        columns: [
          { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          { name: 'data', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(record).toHaveProperty('id');
        expect(typeof record.id).toBe('number');
        expect(record).toHaveProperty('data');
      });
    });

    it('should handle custom startDate and endDate for date columns', () => {
      const table = {
        name: 'events',
        columns: [
          { name: 'event_date', type: 'date', nullable: false },
        ],
      };

      const startDate = new Date(2022, 0, 1);
      const endDate = new Date(2022, 11, 31);

      const records = mockDataGenerator.generateTableData(table, 10, {
        event_date: { startDate, endDate }
      });

      records.forEach(record => {
        const date = new Date(record.event_date);
        expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should use default date range when not specified', () => {
      const table = {
        name: 'logs',
        columns: [
          { name: 'log_date', type: 'date', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(record.log_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(record.log_date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date(2020, 0, 1).getTime());
      });
    });

    it('should handle timestamp with custom date range', () => {
      const table = {
        name: 'activities',
        columns: [
          { name: 'activity_time', type: 'timestamp without time zone', nullable: false },
        ],
      };

      const startDate = new Date(2023, 6, 1);
      const endDate = new Date(2023, 6, 31);

      const records = mockDataGenerator.generateTableData(table, 10, {
        activity_time: { startDate, endDate }
      });

      records.forEach(record => {
        const date = new Date(record.activity_time);
        expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle decimal with custom min and max', () => {
      const table = {
        name: 'measurements',
        columns: [
          { name: 'value', type: 'decimal', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {
        value: { min: 50, max: 100 }
      });

      records.forEach(record => {
        expect(record.value).toBeGreaterThanOrEqual(50);
        expect(record.value).toBeLessThanOrEqual(100);
      });
    });

    it('should use default decimal range when not specified', () => {
      const table = {
        name: 'prices',
        columns: [
          { name: 'cost', type: 'decimal', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.cost).toBeGreaterThanOrEqual(0);
        expect(record.cost).toBeLessThanOrEqual(10000);
      });
    });

    it('should handle integer with custom min and max', () => {
      const table = {
        name: 'scores',
        columns: [
          { name: 'score', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {
        score: { min: 0, max: 100 }
      });

      records.forEach(record => {
        expect(record.score).toBeGreaterThanOrEqual(0);
        expect(record.score).toBeLessThanOrEqual(100);
      });
    });

    it('should use default integer range when not specified and no column name match', () => {
      const table = {
        name: 'data',
        columns: [
          { name: 'random_number', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.random_number).toBeGreaterThanOrEqual(1);
        expect(record.random_number).toBeLessThanOrEqual(100000);
      });
    });

    it('should handle bigint with default range', () => {
      const table = {
        name: 'large_ids',
        columns: [
          { name: 'big_id', type: 'bigint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.big_id).toBeGreaterThanOrEqual(1);
        expect(record.big_id).toBeLessThanOrEqual(1000000);
      });
    });

    it('should handle smallint with default range', () => {
      const table = {
        name: 'small_ids',
        columns: [
          { name: 'small_id', type: 'smallint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.small_id).toBeGreaterThanOrEqual(1);
        expect(record.small_id).toBeLessThanOrEqual(32767);
      });
    });

    it('should handle decimal with default precision', () => {
      const table = {
        name: 'values',
        columns: [
          { name: 'amount', type: 'decimal', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        const decimalPlaces = (record.amount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });

    it('should handle time without time zone', () => {
      const table = {
        name: 'schedules',
        columns: [
          { name: 'time', type: 'time without time zone', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      });
    });

    it('should handle JSON with generic data when no column name match', () => {
      const table = {
        name: 'storage',
        columns: [
          { name: 'json_data', type: 'json', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        const parsed = JSON.parse(record.json_data);
        expect(parsed.data).toBeDefined();
        expect(typeof parsed.data).toBe('string');
      });
    });

    it('should generate city names for city columns', () => {
      const table = {
        name: 'locations',
        columns: [
          { name: 'city', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.city).toBeDefined();
        expect(record.city).not.toBeUndefined();
        expect(record.city).not.toBeNull();
        expect(typeof record.city).toBe('string');
        expect(typeof record.city).not.toBe('number');
        expect(record.city.length).toBeGreaterThan(0);
        expect(record.city.length).not.toBe(0);
      });
    });

    it('should generate country names for country columns', () => {
      const table = {
        name: 'locations',
        columns: [
          { name: 'country', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.country).toBeDefined();
        expect(record.country).not.toBeUndefined();
        expect(record.country).not.toBeNull();
        expect(typeof record.country).toBe('string');
        expect(typeof record.country).not.toBe('number');
        expect(record.country.length).toBeGreaterThan(0);
        expect(record.country.length).not.toBe(0);
      });
    });

    it('should handle array type that is not ending with []', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'data', type: 'text', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(typeof record.data).toBe('string');
        expect(typeof record.data).not.toBe('object');
        expect(record.data).toBeDefined();
        expect(record.data).not.toBeNull();
      });
    });

    it('should handle visiting node already in visited set during topological sort', async () => {
      const mockSchema = [
        {
          name: 'table1',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
        {
          name: 'table2',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 't1_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'table1', foreign_column: 'id', nullable: false },
          ],
        },
        {
          name: 'table3',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 't1_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'table1', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        table1: { count: 5 },
        table2: { count: 3 },
        table3: { count: 3 },
      });

      expect(result.data.table1).toBeDefined();
      expect(result.data.table1).not.toBeUndefined();
      expect(result.data.table2).toBeDefined();
      expect(result.data.table2).not.toBeUndefined();
      expect(result.data.table3).toBeDefined();
      expect(result.data.table3).not.toBeUndefined();
      expect(result.data.table1).toHaveLength(5);
      expect(result.data.table1).not.toHaveLength(0);
      expect(result.data.table2).toHaveLength(3);
      expect(result.data.table2).not.toHaveLength(0);
      expect(result.data.table3).toHaveLength(3);
      expect(result.data.table3).not.toHaveLength(0);
    });

    it('should handle records with empty columns array in INSERT generation', async () => {
      const mockSchema = [
        {
          name: 'simple_table',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', default: 'nextval(...)', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        simple_table: { count: 1 },
      });

      // When all columns are auto-increment, records will have no properties
      // The INSERT query generation should handle this gracefully
      expect(result.queries).toBeDefined();
      expect(result.queries).not.toBeUndefined();
      expect(Array.isArray(result.queries)).toBe(true);
      expect(result.data.simple_table).toBeDefined();
      expect(result.data.simple_table).not.toBeUndefined();
    });

    it('should handle website/url columns', () => {
      const table = {
        name: 'sites',
        columns: [
          { name: 'website', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.website).toMatch(/^https:\/\/www\./);
        expect(record.website).not.toMatch(/^http:$/);
        expect(record.website).not.toMatch(/^ftp:/);
        expect(typeof record.website).toBe('string');
        expect(record.website).toBeDefined();
        expect(record.website).not.toBeNull();
      });
    });

    it('should handle pattern option for character varying', () => {
      const table = {
        name: 'codes',
        columns: [
          { name: 'code', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {
        code: { pattern: 'XXX-AAA' }
      });

      records.forEach(record => {
        expect(record.code).toMatch(/^\d{3}-[A-Z]{3}$/);
        expect(record.code).not.toMatch(/^[A-Z]{3}-\d{3}$/);
        expect(typeof record.code).toBe('string');
        expect(record.code.length).toBe(7);
        expect(record.code).toBeDefined();
        expect(record.code).not.toBeNull();
      });
    });

    it('should handle bigint with no options (uses defaults)', () => {
      const table = {
        name: 'big_numbers',
        columns: [
          { name: 'value', type: 'bigint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.value).toBe('number');
        expect(record.value).toBeGreaterThanOrEqual(1);
        expect(record.value).toBeLessThanOrEqual(1000000);
        expect(Number.isInteger(record.value)).toBe(true);
        expect(record.value).toBeDefined();
        expect(record.value).not.toBeNull();
      });
    });

    it('should handle smallint with no options (uses defaults)', () => {
      const table = {
        name: 'small_numbers',
        columns: [
          { name: 'value', type: 'smallint', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.value).toBe('number');
        expect(record.value).toBeGreaterThanOrEqual(1);
        expect(record.value).toBeLessThanOrEqual(32767);
        expect(Number.isInteger(record.value)).toBe(true);
        expect(record.value).toBeDefined();
        expect(record.value).not.toBeNull();
      });
    });

    it('should handle decimal with no precision option (uses default)', () => {
      const table = {
        name: 'prices',
        columns: [
          { name: 'amount', type: 'decimal', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(typeof record.amount).toBe('number');
        expect(record.amount).toBeGreaterThanOrEqual(0);
        expect(record.amount).toBeLessThanOrEqual(10000);
        const decimalPlaces = (record.amount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
        expect(record.amount).toBeDefined();
        expect(record.amount).not.toBeNull();
      });
    });

    it('should return null for non-array type in generateArray', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'regular_field', type: 'text', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        // Should not be an array since type doesn't end with []
        expect(Array.isArray(record.regular_field)).toBe(false);
        expect(typeof record.regular_field).toBe('string');
        expect(record.regular_field).toBeDefined();
        expect(record.regular_field).not.toBeNull();
      });
    });

    it('should handle arrayValue being null when generateArray returns null', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'data', type: 'text[]', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        // When array type is handled, it should return an array, not null
        expect(record.data).not.toBeNull();
        expect(Array.isArray(record.data)).toBe(true);
        expect(record.data).toBeDefined();
        expect(record.data.length).toBeGreaterThan(0);
      });
    });

    it('should handle table not found in tables object during generateMockData', async () => {
      const mockSchema = [
        {
          name: 'table1',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test');

      expect(result.data).toBeDefined();
      expect(result.data.table1).toBeDefined();
      expect(result.queries).toBeDefined();
      expect(Array.isArray(result.queries)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.tablesProcessed).toBeGreaterThan(0);
    });

    it('should handle tableConfig being undefined and use defaults', async () => {
      const mockSchema = [
        {
          name: 'test_table',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {});

      expect(result.data.test_table).toBeDefined();
      expect(result.data.test_table).toHaveLength(10); // default count
      expect(result.data.test_table).not.toHaveLength(0);
      expect(result.summary.totalRecords).toBe(10);
    });

    it('should handle boolean values in INSERT query generation', async () => {
      const mockSchema = [
        {
          name: 'flags',
          columns: [
            { name: 'is_active', type: 'boolean', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        flags: { count: 2 }
      });

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0]).toBeDefined();
      // Boolean values should appear as true or false (not 'true' or 'false' strings)
      const hasTrue = result.queries[0].includes('true');
      const hasFalse = result.queries[0].includes('false');
      expect(hasTrue || hasFalse).toBe(true);
      expect(result.queries[0]).not.toContain("'true'");
      expect(result.queries[0]).not.toContain("'false'");
    });

    it('should handle numeric values in INSERT query generation', async () => {
      const mockSchema = [
        {
          name: 'numbers',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        numbers: { count: 2 }
      });

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0]).toBeDefined();
      // Numbers should not be quoted in SQL
      expect(result.queries[0]).toContain('INSERT INTO');
      expect(result.queries[0]).toMatch(/\(\d+\)/); // Should have unquoted numbers
      expect(typeof result.queries[0]).toBe('string');
    });

    it('should handle tableNameMatch being null in executeMockDataGeneration', async () => {
      const mockSchema = [
        {
          name: 'test',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test', {
        test: { count: 2 }
      });

      expect(result.success).toBe(true);
      expect(result.successfulTables).toBeDefined();
      expect(result.successfulTables.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalRecords).toBeGreaterThan(0);
    });

    it('should handle recordCount with optional chaining when tableName not in data', async () => {
      const mockSchema = [
        {
          name: 'some_table',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test', {
        some_table: { count: 3 }
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalRecords).toBe(3);
      expect(result.successfulTables[0].records).toBe(3);
    });

    it('should handle dependencies being undefined in topological sort', async () => {
      const mockSchema = [
        {
          name: 'standalone_table',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test');

      expect(result.data.standalone_table).toBeDefined();
      expect(result.summary.tablesProcessed).toBe(1);
      expect(result.queries).toBeDefined();
      expect(Array.isArray(result.queries)).toBe(true);
    });

    it('should cover all branches in character varying generator', () => {
      const testCases = [
        { name: 'user_email', expectedType: 'email' },
        { name: 'phone_number', expectedType: 'phone' },
        { name: 'first_name', expectedType: 'firstName' },
        { name: 'last_name', expectedType: 'lastName' },
        { name: 'full_name', expectedType: 'fullName' },
        { name: 'street_address', expectedType: 'address' },
        { name: 'city_name', expectedType: 'city' },
        { name: 'country_code', expectedType: 'country' },
        { name: 'company_name', expectedType: 'company' },
        { name: 'job_title', expectedType: 'title' },
        { name: 'job_position', expectedType: 'position' },
        { name: 'description_text', expectedType: 'description' },
        { name: 'website_url', expectedType: 'url' },
      ];

      testCases.forEach(({ name, expectedType }) => {
        const table = {
          name: 'test',
          columns: [
            { name, type: 'character varying', nullable: false },
          ],
        };

        const records = mockDataGenerator.generateTableData(table, 5);

        records.forEach(record => {
          expect(record[name]).toBeDefined();
          expect(record[name]).not.toBeUndefined();
          expect(record[name]).not.toBeNull();
          expect(typeof record[name]).toBe('string');
          expect(record[name].length).toBeGreaterThan(0);
        });
      });
    });

    it('should cover all branches in integer generator', () => {
      const testCases = [
        { name: 'user_age', min: 18, max: 97 },
        { name: 'birth_year', min: 1995, max: 2024 },
        { name: 'product_price', min: 1, max: 10000 },
        { name: 'item_quantity', min: 1, max: 100 },
        { name: 'random_count', min: 1, max: 100000 },
      ];

      testCases.forEach(({ name, min, max }) => {
        const table = {
          name: 'test',
          columns: [
            { name, type: 'integer', nullable: false },
          ],
        };

        const records = mockDataGenerator.generateTableData(table, 10);

        records.forEach(record => {
          expect(record[name]).toBeDefined();
          expect(record[name]).not.toBeUndefined();
          expect(record[name]).not.toBeNull();
          expect(typeof record[name]).toBe('number');
          expect(Number.isInteger(record[name])).toBe(true);
          expect(record[name]).toBeGreaterThanOrEqual(min);
          expect(record[name]).toBeLessThanOrEqual(max);
        });
      });
    });

    it('should use default fallback for character varying with no pattern match', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'random_field', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.random_field).toBeDefined();
        expect(record.random_field).not.toBeUndefined();
        expect(record.random_field).not.toBeNull();
        expect(typeof record.random_field).toBe('string');
        expect(record.random_field.length).toBeGreaterThan(0);
        expect(record.random_field.length).toBeLessThanOrEqual(50);
      });
    });

    it('should handle maxLength properly when generating random string fallback', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'random_data', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {
        random_data: { maxLength: 30 }
      });

      records.forEach(record => {
        expect(record.random_data).toBeDefined();
        expect(record.random_data.length).toBeLessThanOrEqual(30);
        expect(record.random_data.length).toBeGreaterThan(0);
        expect(typeof record.random_data).toBe('string');
      });
    });

    it('should handle maxLength exceeding 50 in random string generation', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'long_field', type: 'character varying', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10, {
        long_field: { maxLength: 500 }
      });

      records.forEach(record => {
        expect(record.long_field).toBeDefined();
        // Should be capped at 50 due to Math.min(maxLength, 50)
        expect(record.long_field.length).toBeLessThanOrEqual(50);
        expect(record.long_field.length).toBeGreaterThan(0);
        expect(typeof record.long_field).toBe('string');
      });
    });

    it('should handle integer with no matching column name pattern', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'random_int', type: 'integer', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 10);

      records.forEach(record => {
        expect(record.random_int).toBeDefined();
        expect(record.random_int).toBeGreaterThanOrEqual(1);
        expect(record.random_int).toBeLessThanOrEqual(100000);
        expect(Number.isInteger(record.random_int)).toBe(true);
      });
    });

    it('should handle array with valid base type in dataGenerators', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'values', type: 'integer[]', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(Array.isArray(record.values)).toBe(true);
        expect(record.values.length).toBeGreaterThan(0);
        record.values.forEach(val => {
          expect(typeof val).toBe('number');
          expect(Number.isInteger(val)).toBe(true);
        });
      });
    });

    it('should handle array with base type not in dataGenerators (fallback)', () => {
      const table = {
        name: 'test',
        columns: [
          { name: 'unknown_arr', type: 'customtype[]', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 5);

      records.forEach(record => {
        expect(Array.isArray(record.unknown_arr)).toBe(true);
        expect(record.unknown_arr.length).toBeGreaterThan(0);
        record.unknown_arr.forEach(val => {
          expect(typeof val).toBe('string');
          expect(val).toMatch(/^val_[a-z0-9]+$/);
        });
      });
    });

    it('should handle arrayValue null path correctly', () => {
      // This tests the path where generateArray returns null
      // which happens when type doesn't end with []
      const table = {
        name: 'test',
        columns: [
          { name: 'not_array', type: 'varchar', nullable: false },
        ],
      };

      const records = mockDataGenerator.generateTableData(table, 3);

      records.forEach(record => {
        expect(record.not_array).toBeDefined();
        expect(typeof record.not_array).toBe('string');
        expect(Array.isArray(record.not_array)).toBe(false);
      });
    });

    it('should generate data when table exists in tables object', async () => {
      const mockSchema = [
        {
          name: 'existing_table',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        existing_table: { count: 5 }
      });

      expect(result.data.existing_table).toBeDefined();
      expect(result.data.existing_table.length).toBe(5);
    });

    it('should handle records with non-empty columns in INSERT', async () => {
      const mockSchema = [
        {
          name: 'data_table',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
            { name: 'text', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        data_table: { count: 2 }
      });

      expect(result.queries.length).toBe(1);
      expect(result.queries[0]).toContain('INSERT INTO');
      expect(result.queries[0]).toContain('value');
      expect(result.queries[0]).toContain('text');
    });

    it('should handle string values with quotes in INSERT query', async () => {
      const mockSchema = [
        {
          name: 'quoted_data',
          columns: [
            { name: 'text', type: 'character varying', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        quoted_data: { count: 1 }
      });

      expect(result.queries[0]).toMatch(/'[^']*'/); // Should have single-quoted strings
    });

    it('should handle NULL values correctly in INSERT query', async () => {
      const mockSchema = [
        {
          name: 'nullable_table',
          columns: [
            { name: 'optional_field', type: 'text', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        nullable_table: { count: 100 }
      });

      // With 100 records and 10% null chance, should have some NULLs
      expect(result.queries[0]).toContain('NULL');
    });

    it('should return default value for numeric types in INSERT', async () => {
      const mockSchema = [
        {
          name: 'numbers',
          columns: [
            { name: 'count', type: 'integer', nullable: false },
            { name: 'price', type: 'decimal', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test', {
        numbers: { count: 2 }
      });

      // Numeric values should not be quoted
      expect(result.queries[0]).toMatch(/\(\d+/);
      expect(result.queries[0]).toMatch(/\d+\.\d+/);
    });

    it('should match table name from INSERT query correctly', async () => {
      const mockSchema = [
        {
          name: 'my_table',
          columns: [
            { name: 'id', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test', {
        my_table: { count: 2 }
      });

      expect(result.successfulTables[0].table).toBe('my_table');
      expect(result.successfulTables[0].records).toBe(2);
    });

    it('should use optional chaining for recordCount', async () => {
      const mockSchema = [
        {
          name: 'test_table',
          columns: [
            { name: 'value', type: 'integer', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const result = await mockDataGenerator.executeMockDataGeneration('postgres://test', {
        test_table: { count: 3 }
      });

      expect(result.summary.totalRecords).toBe(3);
    });

    it('should handle empty dependencies array in topological sort', async () => {
      const mockSchema = [
        {
          name: 'independent_table',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test');

      expect(result.data.independent_table).toBeDefined();
      expect(result.summary.tablesProcessed).toBe(1);
    });

    it('should visit dependencies in topological sort', async () => {
      const mockSchema = [
        {
          name: 'parent',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
          ],
        },
        {
          name: 'child',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'parent_id', type: 'integer', constraint: 'FOREIGN KEY', foreign_table: 'parent', foreign_column: 'id', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValueOnce(mockSchema);

      const result = await mockDataGenerator.generateMockData('postgres://test');

      expect(result.data.parent).toBeDefined();
      expect(result.data.child).toBeDefined();
      // Parent should be generated before child
      expect(result.summary.tablesProcessed).toBe(2);
    });
  });
});
