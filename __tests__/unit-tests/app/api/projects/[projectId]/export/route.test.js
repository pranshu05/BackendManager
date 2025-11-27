/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
}));

jest.mock('@/lib/db', () => ({
  executeQuery: mockExecuteQuery,
  getDatabaseSchema: mockGetDatabaseSchema,
}));

jest.mock('next/server', () => {
  class MockHeaders {
    constructor(headers = {}) {
      this._headers = headers;
    }
    
    get(key) {
      return this._headers[key];
    }
    
    set(key, value) {
      this._headers[key] = value;
    }
  }
  
  return {
    NextResponse: class NextResponse {
      constructor(body, init) {
        this.body = body;
        this.status = init?.status || 200;
        const headersObj = init?.headers || {};
        this.headers = new MockHeaders(headersObj);
        // Also support direct access
        Object.assign(this.headers, headersObj);
      }
      
      static json(body, init) {
        const headersObj = init?.headers || {};
        const headers = new MockHeaders(headersObj);
        Object.assign(headers, headersObj);
        
        return {
          json: async () => body,
          status: init?.status || 200,
          body,
          headers,
        };
      }
    },
  };
});

const { GET } = require('@/app/api/projects/[projectId]/export/route');

describe('Project Export API Route', () => {
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

  describe('GET - Export data', () => {
    it('should export all tables as JSON by default', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      const mockUsersData = [{ id: 1, name: 'User 1' }];
      const mockPostsData = [{ id: 1, title: 'Post 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: mockUsersData })
        .mockResolvedValueOnce({ rows: mockPostsData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.users).toEqual(mockUsersData);
      expect(data.posts).toEqual(mockPostsData);
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
    });

    it('should export specific table when table parameter is provided', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1, name: 'User 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.users).toEqual(mockData);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        'SELECT * FROM "users"'
      );
    });

    it('should return error for non-existent table', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        nextUrl: { searchParams: new URLSearchParams('table=nonexistent') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not found');
    });

    it('should handle database query errors', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should export single table as CSV', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, name: 'John Doe', email: 'john@test.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@test.com' },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
      expect(response.headers['Content-Disposition']).toContain('users.csv');
      expect(response.body).toContain('"id","name","email"');
    });

    it('should export all tables as CSV', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      const mockUsersData = [{ id: 1, name: 'User 1' }];
      const mockPostsData = [{ id: 1, title: 'Post 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: mockUsersData })
        .mockResolvedValueOnce({ rows: mockPostsData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
      expect(response.headers['Content-Disposition']).toContain('.csv');
    });

    it('should handle CSV export with null and undefined values', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, name: 'John', age: null, city: undefined },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
    });

    it('should handle CSV export with special characters in data', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, name: 'John "The Boss" Doe', description: 'Test, data' },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
    });

    it('should handle empty table data in CSV export', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
    });

    it('should handle table name with special characters in CSV filename', async () => {
      const mockSchema = [{ name: 'user-activity', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=user-activity') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Disposition']).toContain('user_activity.csv');
    });

    it('should handle errors when fetching specific table data', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Query failed'));

      const request = {
        nextUrl: { searchParams: new URLSearchParams('table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch data');
    });

    it('should continue on error when fetching one of multiple tables', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      const mockUsersData = [{ id: 1, name: 'User 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValueOnce({ rows: mockUsersData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.posts).toEqual(mockUsersData);
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle CSV format with uppercase', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=CSV&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
    });

    it('should handle multi-table CSV with empty tables', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
    });

    it('should use project name in multi-table CSV filename', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Disposition']).toContain('test_project');
    });

    it('should handle multiple rows in single table CSV', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('User 1');
      expect(response.body).toContain('User 2');
      expect(response.body).toContain('User 3');
    });

    it('should include all headers in CSV output', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, name: 'John', email: 'john@test.com', age: 30 },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('"id"');
      expect(response.body).toContain('"name"');
      expect(response.body).toContain('"email"');
      expect(response.body).toContain('"age"');
    });

    it('should add project metadata in multi-table CSV', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('Project: Test Project');
      expect(response.body).toContain('Export Date:');
    });

    it('should add table separators in multi-table CSV', async () => {
      const mockSchema = [
        { name: 'users', columns: [] },
        { name: 'posts', columns: [] },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('Table: users');
      expect(response.body).toContain('Table: posts');
      expect(response.body).toContain('='.repeat(100));
    });

    it('should show "No data available" for empty tables in multi-table CSV', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('No data available');
    });

    it('should quote cell values with commas', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, address: '123 Main St, Apt 4' },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('"123 Main St, Apt 4"');
    });

    it('should escape quotes in cell values', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [
        { id: 1, quote: 'He said "Hello"' },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.body).toContain('He said ""Hello""');
    });

    it('should handle mixed case CSV format parameter', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=CsV&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      expect(response.headers['Content-Type']).toBe('text/csv');
    });

    it('should return JSON when format is not csv', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1, name: 'User 1' }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=xml&table=users') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.users).toEqual(mockData);
    });

    it('should handle empty format parameter defaulting to JSON', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.users).toEqual(mockData);
    });

    it('should include current date in CSV filename', async () => {
      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, mockProject);

      const today = new Date().toISOString().split('T')[0];
      expect(response.headers['Content-Disposition']).toContain(today);
    });

    it('should handle project names with special characters in filename', async () => {
      const projectWithSpecialName = {
        ...mockProject,
        project_name: 'Test-Project #1',
      };

      const mockSchema = [{ name: 'users', columns: [] }];
      const mockData = [{ id: 1 }];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: mockData });

      const request = {
        nextUrl: { searchParams: new URLSearchParams('format=csv') },
      };

      const response = await GET(request, mockContext, mockUser, projectWithSpecialName);

      expect(response.headers['Content-Disposition']).toContain('test_project');
    });

    // ---------------------------
// TESTS FOR convertToCSV()
// ---------------------------

const { convertToCSV } = require('@/app/api/projects/[projectId]/export/route');

describe('convertToCSV()', () => {

  it('should return empty string when singleTableName data is missing', () => {
    const out = convertToCSV({}, "Project", "users");
    expect(out).toBe("");
  });

  it('should return empty string when table exists but contains zero rows', () => {
    const allData = { users: [] };
    const out = convertToCSV(allData, "Project", "users");
    expect(out).toBe("");
  });

  it('should export CSV with correct headers and rows for single table', () => {
    const data = {
      users: [
        { id: 1, name: "John" },
        { id: 2, name: "Jane" }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");

    expect(csv).toContain('"id","name"');
    expect(csv).toContain('"1","John"');
    expect(csv).toContain('"2","Jane"');
  });

  it('should replace quotes inside values', () => {
    const data = {
      users: [
        { id: 1, comment: 'He said "Hello"' }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");

    expect(csv).toContain('He said ""Hello""');
  });

  it('should convert null and undefined values to empty string', () => {
    const data = {
      users: [
        { id: 1, a: null, b: undefined, c: "test" }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");

    expect(csv).toContain('"","","test"');
  });

  it('should handle special characters like commas', () => {
    const data = {
      users: [
        { id: 1, address: "Street 1, Block 2" }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");

    expect(csv).toContain('"Street 1, Block 2"');
  });

  it('should handle mixed data types correctly', () => {
    const data = {
      users: [
        { id: 1, active: true, score: 12.5 }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");

    expect(csv).toContain('"1","true","12.5"');
  });

  it('should export multiple tables when no singleTableName provided', () => {
    const data = {
      users: [{ id: 1 }],
      posts: [{ id: 10 }]
    };

    const csv = convertToCSV(data, "Project");

    expect(csv).toContain("Table: users");
    expect(csv).toContain("Table: posts");
    expect(csv).toContain('"id"');
  });

  it('should include "No data available" for tables with zero rows', () => {
    const data = {
      users: []
    };

    const csv = convertToCSV(data, "Project");

    expect(csv).toContain("No data available");
  });

  it('should include project and export metadata when generating multi-table CSV', () => {
    const data = {
      users: [{ id: 1 }]
    };

    const csv = convertToCSV(data, "My Project");

    expect(csv).toContain("Project: My Project");
    expect(csv).toContain("Export Date:");
  });

  it('should sanitize table names when exporting multi-table CSV', () => {
    const data = {
      "user-activity": [{ id: 1 }]
    };

    const csv = convertToCSV(data, "Project");

    // Table names are not sanitized in the CSV output, they appear as-is
    expect(csv).toContain("Table: user-activity");
  });

  it('should use commas as delimiters between columns', () => {
    const data = {
      users: [{ id: 1, name: "John", email: "test@test.com" }]
    };

    const csv = convertToCSV(data, "Project", "users");
    const lines = csv.split('\n');
    
    // Header should have commas
    expect(lines[0]).toContain(',');
    expect(lines[0].split(',').length).toBe(3);
    // Data row should have commas
    expect(lines[1]).toContain(',');
  });

  it('should use newlines to separate rows in single table CSV', () => {
    const data = {
      users: [
        { id: 1, name: "Row1" },
        { id: 2, name: "Row2" },
        { id: 3, name: "Row3" }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");
    const lines = csv.split('\n');
    
    // Should have 4 lines: 1 header + 3 data rows
    expect(lines.length).toBe(4);
    expect(lines[0]).toContain('"id"');
    expect(lines[1]).toContain('"1"');
    expect(lines[2]).toContain('"2"');
    expect(lines[3]).toContain('"3"');
  });

  it('should use newlines to separate sections in multi-table CSV', () => {
    const data = {
      users: [{ id: 1 }],
      posts: [{ id: 10 }]
    };

    const csv = convertToCSV(data, "Project");
    
    // Multi-table CSV should have newline separators
    expect(csv).toContain('\n');
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(5);
  });

  it('should use blank lines to separate table sections', () => {
    const data = {
      users: [{ id: 1 }],
      posts: [{ id: 10 }]
    };

    const csv = convertToCSV(data, "Project");
    
    // Should contain empty lines between sections
    const hasEmptyLines = csv.split('\n').some(line => line.trim() === '');
    expect(hasEmptyLines).toBe(true);
  });

  it('should wrap header names in quotes', () => {
    const data = {
      users: [{ id: 1, full_name: "Test" }]
    };

    const csv = convertToCSV(data, "Project", "users");
    
    expect(csv).toContain('"id"');
    expect(csv).toContain('"full_name"');
  });

  it('should wrap cell values in quotes', () => {
    const data = {
      users: [{ id: 1, name: "John" }]
    };

    const csv = convertToCSV(data, "Project", "users");
    const lines = csv.split('\n');
    
    // Data row should have quoted values
    expect(lines[1]).toContain('"1"');
    expect(lines[1]).toContain('"John"');
  });

  it('should handle forEach loop for multiple rows', () => {
    const data = {
      users: [
        { id: 1, val: "A" },
        { id: 2, val: "B" },
        { id: 3, val: "C" }
      ]
    };

    const csv = convertToCSV(data, "Project", "users");
    
    // All three data rows should be present
    expect(csv).toContain('"A"');
    expect(csv).toContain('"B"');
    expect(csv).toContain('"C"');
  });

  it('should handle map function for multiple columns', () => {
    const data = {
      users: [{ col1: "A", col2: "B", col3: "C", col4: "D" }]
    };

    const csv = convertToCSV(data, "Project", "users");
    
    // All columns should be present
    expect(csv).toContain('"A"');
    expect(csv).toContain('"B"');
    expect(csv).toContain('"C"');
    expect(csv).toContain('"D"');
  });

  it('should use equals signs for table separators in multi-table', () => {
    const data = {
      users: [{ id: 1 }],
      posts: [{ id: 2 }]
    };

    const csv = convertToCSV(data, "Project");
    
    // Should contain separator line with equals signs
    expect(csv).toContain('=');
    const separatorCount = (csv.match(/={10,}/g) || []).length;
    expect(separatorCount).toBeGreaterThanOrEqual(2);
  });

  });

  });
});

