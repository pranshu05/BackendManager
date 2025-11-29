/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn(() => 'UPDATE');
const mockCreateTimer = jest.fn(() => ({ elapsed: () => 100 }));
const mockExecuteQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();

jest.mock('@/lib/api-helpers', () => ({
  withProjectAuth: mockWithProjectAuth,
  logQueryHistory: mockLogQueryHistory,
  detectQueryType: mockDetectQueryType,
  createTimer: mockCreateTimer,
}));

jest.mock('@/lib/db', () => ({
  executeQuery: mockExecuteQuery,
  getDatabaseSchema: mockGetDatabaseSchema,
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

const { POST } = require('@/app/api/projects/[projectId]/update/route');

describe('Project Update API Route', () => {
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

  describe('POST - Update data', () => {
    it('should update a record successfully', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'varchar', nullable: true },
            { name: 'email', type: 'varchar', nullable: true },
          ],
        },
      ];

      const updatedRow = { id: 1, name: 'Updated Name', email: 'updated@test.com' };

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [updatedRow] });

      const request = {
        json: async () => ({
          table: 'users',
          pkColumn: 'id',
          pkValue: 1,
          column: 'name',
          newValue: 'Updated Name',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.message).toBe('Update successful');
      expect(data.row).toEqual(updatedRow);
      expect(mockExecuteQuery).toHaveBeenCalled();
      expect(mockLogQueryHistory).toHaveBeenCalled();
    });

    it('should return error if required fields are missing', async () => {
      const request = {
        json: async () => ({ table: 'users', column: 'name' }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error if project information is missing', async () => {
      const invalidProject = { id: 'proj-123' };

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, invalidProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Project information is missing');
    });

    it('should return error if table not found in schema', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {
        json: async () => ({
          table: 'nonexistent',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Table not found');
    });

    it('should return error if primary key column not found', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'name', type: 'varchar', nullable: true }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Primary key column could not be determined');
    });

    it('should return error if column not found in table', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'varchar', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'nonexistent',
          newValue: 'Test',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Column not found');
    });

    it('should handle update with oldValue for optimistic locking', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'name', type: 'varchar', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'New Name' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'New Name',
          oldValue: 'Old Name',
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('IS NOT DISTINCT FROM'),
        expect.any(Array)
      );
    });

    it('should handle database update errors', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'email', type: 'varchar', nullable: true },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Unique constraint violation'));

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'email',
          newValue: 'duplicate@test.com',
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

        // NEW TESTCASES TO KILL MUTANTS
    // ==============================

    it('should reject when pkValue === undefined explicitly', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {
        json: async () => ({
          table: 'users',
          column: 'name',
          pkValue: undefined,
          newValue: 'A'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });


    it('should return 500 when getDatabaseSchema throws error', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Schema load failed'));

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'X'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load project database schema');
    });


    it('should match table using String(table) when schema stores names as strings', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: new String('users'), // tricky mutation killer
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200); // Table found
    });


    it('should use PRIMARY KEY metadata when pkColumn not provided', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', constraint: 'PRIMARY KEY', type: 'integer' },
            { name: 'name', type: 'varchar' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          column: 'name',
          pkValue: 1,
          newValue: 'X'
        })
      };

      await POST(request, mockContext, mockUser, mockProject);
      // If pkMeta (PRIMARY KEY) isn't used, mutation survives
      expect(mockExecuteQuery).toHaveBeenCalled();
    });


    it('should detect missing column metadata and return error', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'missing_col',
          newValue: 'X'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Column not found');
    });


    it('should throw validation error when handledatatype rejects invalid integer', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY', nullable: false },
            { name: 'age', type: 'integer', nullable: false }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'age',
          newValue: 'NOT_AN_INT'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid integer value');
    });


    it('should throw validation error for invalid boolean', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'active', type: 'boolean' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: 'maybe'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid boolean value');
    });


    it('should throw validation error for invalid UUID format', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', constraint: 'PRIMARY KEY' },
            { name: 'token', type: 'uuid' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 'not-a-uuid',
          column: 'token',
          newValue: 'also-bad'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid UUID value');
    });


    it('should correctly escape identifiers including weird characters', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'strange"table',
          columns: [
            { name: 'weird"col', constraint: 'PRIMARY KEY', type: 'integer' },
            { name: 'value', type: 'varchar' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const request = {
        json: async () => ({
          table: 'strange"table',
          pkColumn: 'weird"col',
          pkValue: 1,
          column: 'value',
          newValue: 'X'
        })
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('"strange""table"'),
        expect.any(Array)
      );
    });


    it('should hit the oldValue !== undefined branch for optimistic locking logic', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'name', type: 'varchar' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'X' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'X',
          oldValue: 'OLD_VALUE'
        })
      };

      await POST(request, mockContext, mockUser, mockProject);

      // Must use 3 parameters when oldValue provided
      expect(mockExecuteQuery.mock.calls[0][2].length).toBe(3);
    });

    it('should handle timestamp data type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'events',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'created_at', type: 'timestamp' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, created_at: '2025-01-01 10:00:00' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'created_at',
          newValue: '2025-01-01 10:00:00'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle date data type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'events',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'event_date', type: 'date' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, event_date: '2025-01-01' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'event_date',
          newValue: '2025-01-01'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle time data type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'schedule',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'start_time', type: 'time' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, start_time: '10:00:00' }] });

      const request = {
        json: async () => ({
          table: 'schedule',
          pkValue: 1,
          column: 'start_time',
          newValue: '10:00:00'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle JSON data type with object', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'config',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'settings', type: 'json' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, settings: { key: 'value' } }] });

      const request = {
        json: async () => ({
          table: 'config',
          pkValue: 1,
          column: 'settings',
          newValue: { key: 'value' }
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle JSON data type with string parsing', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'config',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'settings', type: 'json' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, settings: { parsed: true } }] });

      const request = {
        json: async () => ({
          table: 'config',
          pkValue: 1,
          column: 'settings',
          newValue: '{"parsed": true}'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should throw error for invalid JSON string', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'config',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'settings', type: 'json' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'config',
          pkValue: 1,
          column: 'settings',
          newValue: 'not valid json{'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON value');
    });

    it('should handle numeric/decimal data types', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'price', type: 'numeric' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, price: 99.99 }] });

      const request = {
        json: async () => ({
          table: 'products',
          pkValue: 1,
          column: 'price',
          newValue: '99.99'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle real/float data types', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'measurements',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'value', type: 'real' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, value: 3.14 }] });

      const request = {
        json: async () => ({
          table: 'measurements',
          pkValue: 1,
          column: 'value',
          newValue: '3.14'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should throw error for invalid numeric value', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'price', type: 'numeric' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'products',
          pkValue: 1,
          column: 'price',
          newValue: 'not-a-number'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid numeric value');
    });

    it('should handle boolean true values', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'active', type: 'boolean' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: true }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: true
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle boolean string "true"', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'active', type: 'boolean' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: true }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: 'true'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle boolean number 1', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'active', type: 'boolean' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: true }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: 1
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle boolean false values', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'active', type: 'boolean' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: false }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: false
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle boolean string "0"', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'active', type: 'boolean' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: false }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: '0'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle valid UUID format', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', constraint: 'PRIMARY KEY' },
            { name: 'token', type: 'uuid' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: '123e4567-e89b-12d3-a456-426614174000', token: '123e4567-e89b-12d3-a456-426614174001' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: '123e4567-e89b-12d3-a456-426614174000',
          column: 'token',
          newValue: '123e4567-e89b-12d3-a456-426614174001'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle nullable column with null value', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'email', type: 'varchar', nullable: true }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, email: null }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'email',
          newValue: null
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle nullable column with empty string', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'email', type: 'varchar', nullable: true }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, email: null }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'email',
          newValue: ''
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle integer types (smallint, bigint)', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'data',
          columns: [
            { name: 'id', type: 'bigint', constraint: 'PRIMARY KEY' },
            { name: 'count', type: 'smallint' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, count: 42 }] });

      const request = {
        json: async () => ({
          table: 'data',
          pkValue: '1',
          column: 'count',
          newValue: '42'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should throw error for invalid integer', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'data',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'count', type: 'integer' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'data',
          pkValue: 1,
          column: 'count',
          newValue: '3.14'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid integer value');
    });

    it('should handle column not found in table', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'name', type: 'varchar' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'nonexistent',
          newValue: 'test'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Column not found');
    });

    it('should handle primary key not determined', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' }
          ]
        }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'test'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Primary key column could not be determined');
    });

    it('should use provided pkColumn when specified', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'user_id', type: 'integer' },
            { name: 'name', type: 'varchar' }
          ]
        }
      ]);

      mockExecuteQuery.mockResolvedValue({ rows: [{ user_id: 1, name: 'test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkColumn: 'user_id',
          pkValue: 1,
          column: 'name',
          newValue: 'test'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should log error message on executeQuery failure', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', constraint: 'PRIMARY KEY' },
            { name: 'name', type: 'varchar' }
          ]
        }
      ]);

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockExecuteQuery.mockRejectedValue(new Error('DB connection failed'));

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'test'
        })
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Failed to execute update');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should handle outer catch block for unexpected errors', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = {
        json: async () => {
          throw new Error('Unexpected error');
        }
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    // Tests to kill surviving mutants related to null/undefined handling
    it('should handle null value correctly', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar', nullable: true }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: null }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: null
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle empty string with nullable column', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar', nullable: true }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: null }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: ''
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(mockExecuteQuery).toHaveBeenCalled();
    });

    // Tests for different boolean values to kill boolean mutants
    it('should handle boolean false value', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'active', type: 'boolean' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: false }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: false
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle boolean string false', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'active', type: 'boolean' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: false }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: 'false'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test for timestamp/date/time string conversion
    it('should convert timestamp value to string', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'events', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'created_at', type: 'timestamp' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, created_at: '2023-01-01T00:00:00Z' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'created_at',
          newValue: '2023-01-01T00:00:00Z'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['2023-01-01T00:00:00Z'])
      );
    });

    it('should handle date type conversion', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'events', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'event_date', type: 'date' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, event_date: '2023-01-01' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'event_date',
          newValue: '2023-01-01'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle time type conversion', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'events', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'start_time', type: 'time' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, start_time: '14:30:00' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'start_time',
          newValue: '14:30:00'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test for real/float types
    it('should handle real/float data type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'products', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'rating', type: 'real' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, rating: 4.5 }] });

      const request = {
        json: async () => ({
          table: 'products',
          pkValue: 1,
          column: 'rating',
          newValue: 4.5
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle double precision data type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'products', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'price', type: 'double precision' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, price: 99.99 }] });

      const request = {
        json: async () => ({
          table: 'products',
          pkValue: 1,
          column: 'price',
          newValue: 99.99
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test for JSON string parsing
    it('should parse JSON string value', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'settings', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'config', type: 'json' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, config: { theme: 'dark' } }] });

      const request = {
        json: async () => ({
          table: 'settings',
          pkValue: 1,
          column: 'config',
          newValue: '{"theme":"dark"}'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test for integer type variants
    it('should handle smallint type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'items', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'quantity', type: 'smallint' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, quantity: 10 }] });

      const request = {
        json: async () => ({
          table: 'items',
          pkValue: 1,
          column: 'quantity',
          newValue: 10
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    it('should handle bigint type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'items', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'big_number', type: 'bigint' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, big_number: 9007199254740991 }] });

      const request = {
        json: async () => ({
          table: 'items',
          pkValue: 1,
          column: 'big_number',
          newValue: 9007199254740991
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test to verify query with oldValue uses 3 parameters
    it('should use 3 parameters when oldValue is provided', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Updated' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Updated',
          oldValue: 'Original'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.stringContaining('IS NOT DISTINCT FROM'),
        expect.arrayContaining(['Updated', 1, 'Original'])
      );
    });

    // Test for verifying logQueryHistory is called with correct params
    it('should log query history with correct parameters on success', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);
      
      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProject.id,
          userId: mockUser.id,
          success: true
        })
      );
    });

    // Test default string type handling
    it('should handle unknown data type as string', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'data', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'value', type: 'custom_type' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, value: 'some_value' }] });

      const request = {
        json: async () => ({
          table: 'data',
          pkValue: 1,
          column: 'value',
          newValue: 'some_value'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test to ensure updateRes check works correctly
    it('should return 409 when update returns empty result', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 999,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(409);
    });

    it('should return 409 when updateRes is null', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue(null);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 999,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(409);
    });

    // Kill mutants for empty string in non-nullable field
    it('should handle empty string in non-nullable field', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'email', type: 'varchar', nullable: false }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, email: '' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'email',
          newValue: ''
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill mutants for undefined dataType parameter
    it('should handle undefined dataType gracefully', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'data', type: undefined }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, data: 'test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'data',
          newValue: 'test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill mutants for exact type matching
    it('should match exact integer type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'items', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'count', type: 'integer' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, count: 42 }] });

      const request = {
        json: async () => ({
          table: 'items',
          pkValue: 1,
          column: 'count',
          newValue: 42
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill mutants for decimal type
    it('should match exact decimal type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'products', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'price', type: 'decimal' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, price: 19.99 }] });

      const request = {
        json: async () => ({
          table: 'products',
          pkValue: 1,
          column: 'price',
          newValue: 19.99
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill boolean value '1' string mutants
    it('should handle boolean string "1"', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'verified', type: 'boolean' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, verified: true }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'verified',
          newValue: '1'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill mutants for boolean number 0
    it('should handle boolean number 0', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'active', type: 'boolean' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: false }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: 0
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill mutants for UUID validation with anchors
    it('should reject UUID without start anchor', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'records', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'guid', type: 'uuid' }] }
      ]);

      const request = {
        json: async () => ({
          table: 'records',
          pkValue: 1,
          column: 'guid',
          newValue: 'xxx123e4567-e89b-12d3-a456-426614174000'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid UUID');
    });

    it('should reject UUID without end anchor', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'records', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'guid', type: 'uuid' }] }
      ]);

      const request = {
        json: async () => ({
          table: 'records',
          pkValue: 1,
          column: 'guid',
          newValue: '123e4567-e89b-12d3-a456-426614174000xxx'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid UUID');
    });

    // Kill mutants for missing table
    it('should handle missing table in request', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }] }
      ]);

      const request = {
        json: async () => ({
          table: null,
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    // Kill mutants for missing column
    it('should handle missing column in request', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }] }
      ]);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: null,
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    // Kill mutants for table.name !== table comparison
    it('should find table when table name does not match string conversion', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill mutants for logQueryHistory error case
    it('should log failed query with error details', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      const testError = new Error('DB connection failed');
      mockExecuteQuery.mockRejectedValue(testError);

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'DB connection failed'
        })
      );
    });

    // Kill mutants for data_type fallback
    it('should use data_type when type is not available', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', data_type: 'integer' }, { name: 'age', data_type: 'integer' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, age: 25 }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'age',
          newValue: 25
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill float type mutants
    it('should handle float type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'measurements', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'value', type: 'float' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, value: 3.14 }] });

      const request = {
        json: async () => ({
          table: 'measurements',
          pkValue: 1,
          column: 'value',
          newValue: 3.14
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Kill oldValue type checking mutants
    it('should not use oldValue when it is undefined', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test',
          oldValue: undefined
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        mockProject.connection_string,
        expect.not.stringContaining('IS NOT DISTINCT FROM'),
        expect.arrayContaining(['Test', 1])
      );
      expect(mockExecuteQuery.mock.calls[0][2].length).toBe(2);
    });

    // Kill error message mutants
    it('should return specific error message for row not found', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 999,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();
      expect(data.error).toBe('Update failed (row not found or value mismatch)');
    });

    // Kill pkColumn mutants when specified
    it('should use exact pkColumn when provided and exists', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [
          { name: 'id', constraint: 'PRIMARY KEY', type: 'integer' },
          { name: 'user_id', type: 'integer' },
          { name: 'name', type: 'varchar' }
        ]}
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ user_id: 10, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkColumn: 'user_id',
          pkValue: 10,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Tests targeting remaining conditional expression mutants
    it('should handle explicit true boolean value', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'active', type: 'boolean' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, active: true }] });

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'active',
          newValue: true
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test for timestamp without include check
    it('should handle timestamptz type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'events', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'created', type: 'timestamptz' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, created: '2023-01-01T00:00:00Z' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'created',
          newValue: '2023-01-01T00:00:00Z'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test for datetime type
    it('should handle datetime type', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'events', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'happened_at', type: 'datetime' }] }
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, happened_at: '2023-01-01 14:30:00' }] });

      const request = {
        json: async () => ({
          table: 'events',
          pkValue: 1,
          column: 'happened_at',
          newValue: '2023-01-01 14:30:00'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });

    // Test that requires both table and column conditions
    it('should fail when both table and column are missing', async () => {
      const request = {
        json: async () => ({
          table: '',
          pkValue: 1,
          column: '',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    // Test with only table missing
    it('should fail when only table is missing', async () => {
      const request = {
        json: async () => ({
          table: '',
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    // Test with only column missing  
    it('should fail when only column is missing', async () => {
      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: '',
          newValue: 'Test'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(400);
    });

    // Verify error message content isn't empty
    it('should have non-empty error message for schema load failure', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Connection timeout'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);
      expect(spy).toHaveBeenCalledWith('Failed to load schema for project DB:', expect.any(Error));
      spy.mockRestore();
    });

    // Verify update error console output
    it('should have non-empty console error for update failure', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'users', columns: [{ name: 'id', constraint: 'PRIMARY KEY', type: 'integer' }, { name: 'name', type: 'varchar' }] }
      ]);
      mockExecuteQuery.mockRejectedValue(new Error('Update failed'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const request = {
        json: async () => ({
          table: 'users',
          pkValue: 1,
          column: 'name',
          newValue: 'Test'
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);
      expect(spy).toHaveBeenCalledWith('User DB update error:', expect.any(Error));
      spy.mockRestore();
    });

    // Verify outer catch console error
    it('should have non-empty console error for unexpected error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = {
        json: async () => {
          throw new Error('JSON parse failed');
        }
      };

      await POST(request, mockContext, mockUser, mockProject);
      expect(spy).toHaveBeenCalledWith('Update route error:', expect.any(Error));
      spy.mockRestore();
    });

    // Test to ensure pkColumn fallback works
    it('should find PRIMARY KEY when pkColumn not provided', async () => {
      mockGetDatabaseSchema.mockResolvedValue([
        { name: 'items', columns: [
          { name: 'item_id', constraint: 'PRIMARY KEY', type: 'integer' },
          { name: 'description', type: 'varchar' }
        ]}
      ]);
      mockExecuteQuery.mockResolvedValue({ rows: [{ item_id: 5, description: 'Item' }] });

      const request = {
        json: async () => ({
          table: 'items',
          pkValue: 5,
          column: 'description',
          newValue: 'Item'
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(response.status).toBe(200);
    });
    
  });
});
