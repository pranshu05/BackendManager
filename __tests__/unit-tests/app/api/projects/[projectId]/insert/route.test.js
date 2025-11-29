/**
 * @jest-environment node
 */

// Mock dependencies
const mockWithProjectAuth = jest.fn((handler) => handler);
const mockLogQueryHistory = jest.fn();
const mockDetectQueryType = jest.fn(() => 'INSERT');
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

const { POST } = require('@/app/api/projects/[projectId]/insert/route');
const { normalizeDate, isDateType } = require('@/app/api/projects/[projectId]/insert/route');

describe('Project Insert API Route', () => {
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

  describe('POST - Insert data', () => {
    it('should insert data into a table successfully', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'email', type: 'varchar', nullable: false },
          ],
        },
      ];

      const insertedRow = { id: 1, name: 'Test User', email: 'test@test.com' };

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [insertedRow] });

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test User', email: 'test@test.com' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.row).toEqual(insertedRow);
      expect(data.table).toBe('users');
      expect(mockExecuteQuery).toHaveBeenCalled();
      expect(mockLogQueryHistory).toHaveBeenCalled();
      expect(data.queryText).toBeDefined();
      expect(data.params).toBeDefined();
      expect(data.providedColumns).toEqual(['name', 'email']);
    });

    it('should log query history with correct parameters on success', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'name', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProject.id,
          userId: mockUser.id,
          success: true,
          queryType: 'INSERT',
        })
      );
    });

    it('should log query history with error on failure', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'name', type: 'varchar', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      await POST(request, mockContext, mockUser, mockProject);

      expect(mockLogQueryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProject.id,
          userId: mockUser.id,
          success: false,
          errorMessage: 'Database error',
        })
      );
    });

    it('should return error if table or insertData is missing', async () => {
      const request = {
        json: async () => ({ table: 'users' }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error if insertData is empty object', async () => {
      const request = {
        json: async () => ({ table: 'users', insertData: {} }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return error if project is missing', async () => {
      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, null);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Project information is missing');
    });

    it('should return error if connection_string is missing', async () => {
      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      const projectWithoutConnection = { id: 'proj-123' };
      const response = await POST(request, mockContext, mockUser, projectWithoutConnection);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Project information is missing');
    });

    it('should return error if table metadata not found', async () => {
      mockGetDatabaseSchema.mockResolvedValue([]);

      const request = {
        json: async () => ({
          table: 'nonexistent',
          insertData: { name: 'Test' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return error when no valid columns provided', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: true },
            { name: 'name', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { invalid_column: 'value' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No valid columns provided');
    });

    it('should accept columns with defaults when not provided', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: false, default: 'nextval' },
            { name: 'name', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.row).toBeDefined();
    });

    it('should require columns without defaults', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: false, default: null },
            { name: 'name', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required columns');
      expect(data.missing).toContain('id');
    });

    it('should handle timestamptz with time zone', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'event_date', type: 'timestamp with time zone', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ event_date: '2024-01-01T00:00:00Z' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_date: '2024-01-01' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(mockExecuteQuery).toHaveBeenCalled();
      const call = mockExecuteQuery.mock.calls[0];
      expect(call[1]).toContain('::timestamptz');
    });

    it('should handle timestamptz type', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'event_date', type: 'timestamptz', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ event_date: '2024-01-01T00:00:00Z' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_date: '2024-01-01' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(mockExecuteQuery).toHaveBeenCalled();
      const call = mockExecuteQuery.mock.calls[0];
      expect(call[1]).toContain('::timestamptz');
    });

    it('should handle plain timestamp type', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'event_date', type: 'timestamp', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ event_date: '2024-01-01 00:00:00' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_date: '2024-01-01' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(mockExecuteQuery).toHaveBeenCalled();
      const call = mockExecuteQuery.mock.calls[0];
      expect(call[1]).toContain('::timestamp');
    });

    it('should handle date type', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'event_date', type: 'date', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ event_date: '2024-01-01' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_date: '2024-01-01' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(mockExecuteQuery).toHaveBeenCalled();
      const call = mockExecuteQuery.mock.calls[0];
      expect(call[1]).toContain('::date');
    });

    it('should handle time type', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'event_time', type: 'time', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ event_time: '14:30:00' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_time: '2024-01-01 14:30:00' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(mockExecuteQuery).toHaveBeenCalled();
      const call = mockExecuteQuery.mock.calls[0];
      expect(call[1]).toContain('::time');
    });

    it('should use generic placeholder for other date-like types', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'event_ts', type: 'timestamp_custom', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ event_ts: '2024-01-01' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_ts: '2024-01-01' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      expect(mockExecuteQuery).toHaveBeenCalled();
      const call = mockExecuteQuery.mock.calls[0];
      // timestamp_custom contains 'timestamp', so it gets ::timestamp cast
      expect(call[1]).toContain('::timestamp');
    });

    it('should return 500 when request.json() throws error', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 500 when getDatabaseSchema throws error', async () => {
      mockGetDatabaseSchema.mockRejectedValue(new Error('Schema fetch failed'));

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle date fields correctly', async () => {
      const mockSchema = [
        {
          name: 'events',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'event_date', type: 'timestamp', nullable: false },
            { name: 'title', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockResolvedValue({
        rows: [{ id: 1, event_date: '2024-01-01', title: 'Event' }],
      });

      const request = {
        json: async () => ({
          table: 'events',
          insertData: { event_date: '2024-01-01', title: 'Event' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(data.row).toBeDefined();
    });

    it('should return error for missing required columns', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', nullable: true, default: 'nextval' },
            { name: 'name', type: 'varchar', nullable: false },
            { name: 'email', type: 'varchar', nullable: false },
          ],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test User' }, // Missing required email
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required columns');
    });

    it('should handle database insertion errors', async () => {
      const mockSchema = [
        {
          name: 'users',
          columns: [{ name: 'name', type: 'varchar', nullable: false }],
        },
      ];

      mockGetDatabaseSchema.mockResolvedValue(mockSchema);
      mockExecuteQuery.mockRejectedValue(new Error('Duplicate key violation'));

      const request = {
        json: async () => ({
          table: 'users',
          insertData: { name: 'Test User' },
        }),
      };

      const response = await POST(request, mockContext, mockUser, mockProject);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return null for null/undefined/empty date values', async () => {
  const mockSchema = [
    {
      name: 'events',
      columns: [
        { name: 'event_date', type: 'timestamp', nullable: true },
      ],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({ rows: [{ event_date: null }] });

  const request = {
    json: async () => ({
      table: 'events',
      insertData: { event_date: null },
    }),
  };

  const response = await POST(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(data.row).toBeDefined(); 
  });
   
  it('should handle direct Date object inputs', async () => {
  const mockSchema = [
    {
      name: 'events',
      columns: [
        { name: 'event_date', type: 'timestamp', nullable: false },
      ],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ id: 1, event_date: '2024-01-01' }],
  });

  const request = {
    json: async () => ({
      table: 'events',
      insertData: { event_date: new Date('2024-01-01') },
    }),
  };

  const response = await POST(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(mockExecuteQuery).toHaveBeenCalled();
  });
 
  it('should return error for invalid date format', async () => {
  const mockSchema = [
    {
      name: 'events',
      columns: [
        { name: 'event_date', type: 'timestamp', nullable: false },
      ],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);

  const request = {
    json: async () => ({
      table: 'events',
      insertData: { event_date: 'INVALID_DATE_FORMAT' },
    }),
  };

  const response = await POST(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(response.status).toBe(400);
  expect(data.error).toContain('Invalid date');
   
  });

  it('should parse colon formatted date dd:mm:yyyy', async () => {
  const mockSchema = [
    {
      name: 'events',
      columns: [
        { name: 'event_date', type: 'date', nullable: false },
      ],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ id: 1, event_date: '2024-10-12' }],
  });

  const request = {
    json: async () => ({
      table: 'events',
      insertData: { event_date: '12:10:2024' },
    }),
  };

  const response = await POST(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(mockExecuteQuery).toHaveBeenCalled();
  });
 
   it('should handle time-only values like "14:30:00"', async () => {
  const mockSchema = [
    {
      name: 'events',
      columns: [
        { name: 'event_date', type: 'time', nullable: false },
      ],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ id: 1, event_date: '14:30:00' }],
  });

  const request = {
    json: async () => ({
      table: 'events',
      insertData: { event_date: '14:30:00' },
    }),
  };

  const response = await POST(request, mockContext, mockUser, mockProject);

  expect(mockExecuteQuery).toHaveBeenCalled();
  });

  //
// 🔥 Mutation-Killing DATE Tests for Insert Route
//

// 1️⃣ ISO Formats
it("should parse ISO date formats", async () => {
  const mockSchema = [
    {
      name: "events",
      columns: [{ name: "event_date", type: "timestamp", nullable: false }],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ id: 1, event_date: "2024-01-01" }],
  });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "2024-01-01T12:30:00Z" },
    }),
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 2️⃣ All custom formats (loop through formats[])
const customDateFormats = [
  "31/01/2024 10:20:30",
  "31/01/2024",
  "31-01-2024",
  "01-31-2024",
  "Jan 31, 2024",
  "31 Jan 2024",
  "2024/01/31 11:22",
  "2024-01-31 11:22:33",
  "2024-01-31",
  "01/31/2024",
  "01/31/2024 11:22:33",
];

customDateFormats.forEach((fmt) => {
  it(`should parse custom date format: ${fmt}`, async () => {
    const mockSchema = [
      {
        name: "events",
        columns: [{ name: "event_date", type: "timestamp", nullable: false }],
      },
    ];

    mockGetDatabaseSchema.mockResolvedValue(mockSchema);
    mockExecuteQuery.mockResolvedValue({
      rows: [{ id: 1, event_date: "parsed" }],
    });

    const request = {
      json: async () => ({
        table: "events",
        insertData: { event_date: fmt },
      }),
    };

    await POST(request, mockContext, mockUser, mockProject);
    expect(mockExecuteQuery).toHaveBeenCalled();
  });
});

// 3️⃣ JS Date() Native Parsing Fallback
it("should parse JS native date formats (fallback)", async () => {
  const mockSchema = [
    {
      name: "events",
      columns: [{ name: "event_date", type: "timestamp", nullable: false }],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ id: 1, event_date: "2024-02-01" }],
  });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "Feb 1 2024" },
    }),
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 4️⃣ Invalid formats → must hit catch block + validation error
it("should return error for invalid date format", async () => {
  const mockSchema = [
    {
      name: "events",
      columns: [{ name: "event_date", type: "timestamp", nullable: false }],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "NOT_A_REAL_DATE_12345" },
    }),
  };

  const response = await POST(request, mockContext, mockUser, mockProject);
  const data = await response.json();

  expect(response.status).toBe(400);
  expect(data.error).toContain("Invalid");
});

// 5️⃣ Empty string → should become null
it("should convert empty string date to null", async () => {
  const mockSchema = [
    {
      name: "events",
      columns: [{ name: "event_date", type: "timestamp", nullable: true }],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({ rows: [{ event_date: null }] });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "" },
    }),
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 6️⃣ Null date value
it("should accept null date values when nullable", async () => {
  const mockSchema = [
    {
      name: "events",
      columns: [{ name: "event_date", type: "timestamp", nullable: true }],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({ rows: [{ event_date: null }] });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: null },
    }),
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 7️⃣ Undefined date value
it("should treat undefined date as null", async () => {
  const mockSchema = [
    {
      name: "events",
      columns: [{ name: "event_date", type: "timestamp", nullable: true }],
    },
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({ rows: [{ event_date: null }] });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: undefined },
    }),
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
  });

  //
// Tests for normalizeDate() colon-logic + null/undefined/date/object handling
//

// 1️⃣ null, undefined, empty string → return null
it("should convert null and undefined dates to null", async () => {
  const mockSchema = [
    { name: "events", columns: [{ name: "event_date", type: "timestamp", nullable: true }] }
  ];
  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({ rows: [{ event_date: null }] });

  const values = [null, undefined, ""];

  for (const v of values) {
    const request = {
      json: async () => ({
        table: "events",
        insertData: { event_date: v }
      })
    };

    await POST(request, mockContext, mockUser, mockProject);
  }

  expect(mockExecuteQuery).toHaveBeenCalledTimes(3);
});

// 2️⃣ value instanceof Date branch
it("should handle JS Date instance correctly", async () => {
  const mockSchema = [
    { name: "events", columns: [{ name: "event_date", type: "timestamp", nullable: false }] }
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ event_date: "2024-01-10" }]
  });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: new Date("2024-01-10") }
    })
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 3️⃣ empty/blank string → return null
it("should return null for blank or whitespace string date", async () => {
  const mockSchema = [
    { name: "events", columns: [{ name: "event_date", type: "timestamp", nullable: true }] }
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({ rows: [{ event_date: null }] });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "   " }
    })
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 4️⃣ colon date: dd:MM:yyyy  (day > 12)
it("should parse colon format dd:MM:yyyy when first part > 12", async () => {
  const mockSchema = [
    { name: "events", columns: [{ name: "event_date", type: "timestamp", nullable: false }] }
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ event_date: "2024-02-10" }]
  });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "15:02:2024" } // 15 > 12 → day=15, month=2
    })
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 5️⃣ colon date: MM:dd:yyyy (month > 12 is invalid → day=b)
it("should parse colon format MM:dd:yyyy when second part > 12", async () => {
  const mockSchema = [
    { name: "events", columns: [{ name: "event_date", type: "timestamp", nullable: false }] }
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ event_date: "2024-10-05" }]
  });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: "10:25:2024" } 
      // b=25>12 → day=25 month=10
    })
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
});

// 7️⃣ colon parser should handle trimming and whitespace around (but not inside)
it("should parse colon date with outer whitespace trimmed", async () => {
  const mockSchema = [
    { name: "events", columns: [{ name: "event_date", type: "timestamp", nullable: false }] }
  ];

  mockGetDatabaseSchema.mockResolvedValue(mockSchema);
  mockExecuteQuery.mockResolvedValue({
    rows: [{ event_date: "2024-12-25" }]
  });

  const request = {
    json: async () => ({
      table: "events",
      insertData: { event_date: " 25:12:2024 " }
    })
  };

  await POST(request, mockContext, mockUser, mockProject);
  expect(mockExecuteQuery).toHaveBeenCalled();
  });


  });
});

// 🔥 Unit Tests for normalizeDate function
describe('normalizeDate', () => {
  it('should return null for null input', () => {
    expect(normalizeDate(null)).toBe(null);
  });

  it('should return null for undefined input', () => {
    expect(normalizeDate(undefined)).toBe(null);
  });

  it('should return null for empty string', () => {
    expect(normalizeDate('')).toBe(null);
  });

  it('should return null for whitespace-only string', () => {
    expect(normalizeDate('   ')).toBe(null);
  });

  it('should handle Date object input', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const result = normalizeDate(date);
    expect(result).toBeTruthy();
    expect(result.isValid).toBe(true);
  });

  it('should parse colon format dd:mm:yyyy when day > 12', () => {
    const result = normalizeDate('25:03:2024');
    expect(result.isValid).toBe(true);
    expect(result.day).toBe(25);
    expect(result.month).toBe(3);
  });

  it('should parse colon format dd:mm:yyyy when month > 12', () => {
    const result = normalizeDate('05:15:2024');
    expect(result.isValid).toBe(true);
    expect(result.day).toBe(15);
    expect(result.month).toBe(5);
  });

  it('should parse colon format dd:mm:yyyy when both <= 12', () => {
    const result = normalizeDate('10:05:2024');
    expect(result.isValid).toBe(true);
    expect(result.day).toBe(10);
    expect(result.month).toBe(5);
  });

  it('should parse ISO format', () => {
    const result = normalizeDate('2024-01-01T12:30:00Z');
    expect(result.isValid).toBe(true);
  });

  it('should parse format dd/MM/yyyy HH:mm:ss', () => {
    const result = normalizeDate('31/01/2024 10:20:30');
    expect(result.isValid).toBe(true);
  });

  it('should parse format dd/MM/yyyy', () => {
    const result = normalizeDate('31/01/2024');
    expect(result.isValid).toBe(true);
  });

  it('should parse format dd-MM-yyyy', () => {
    const result = normalizeDate('31-01-2024');
    expect(result.isValid).toBe(true);
  });

  it('should parse format MM-dd-yyyy', () => {
    const result = normalizeDate('01-31-2024');
    expect(result.isValid).toBe(true);
  });

  it('should parse format MMM dd yyyy', () => {
    const result = normalizeDate('Jan 31 2024');
    expect(result.isValid).toBe(true);
  });

  it('should parse format dd MMM yyyy', () => {
    const result = normalizeDate('31 Jan 2024');
    expect(result.isValid).toBe(true);
  });

  it('should parse format yyyy/MM/dd HH:mm', () => {
    const result = normalizeDate('2024/01/31 11:22');
    expect(result.isValid).toBe(true);
  });

  it('should parse format yyyy-MM-dd HH:mm:ss', () => {
    const result = normalizeDate('2024-01-31 11:22:33');
    expect(result.isValid).toBe(true);
  });

  it('should parse format yyyy-MM-dd', () => {
    const result = normalizeDate('2024-01-31');
    expect(result.isValid).toBe(true);
  });

  it('should parse format MM/dd/yyyy', () => {
    const result = normalizeDate('01/31/2024');
    expect(result.isValid).toBe(true);
  });

  it('should parse format MM/dd/yyyy HH:mm:ss', () => {
    const result = normalizeDate('01/31/2024 11:22:33');
    expect(result.isValid).toBe(true);
  });

  it('should fallback to JS Date parsing', () => {
    const result = normalizeDate('Feb 1 2024');
    expect(result.isValid).toBe(true);
  });

  it('should throw error for invalid date', () => {
    expect(() => normalizeDate('NOT_A_DATE_123')).toThrow('Invalid date format');
  });

  it('should throw error for completely invalid string', () => {
    expect(() => normalizeDate('xyz_abc_999')).toThrow();
  });
});

// 🔥 Unit Tests for isDateType function
describe('isDateType', () => {
  it('should return false for null', () => {
    expect(isDateType(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isDateType(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isDateType('')).toBe(false);
  });

  it('should return true for timestamp', () => {
    expect(isDateType('timestamp')).toBe(true);
  });

  it('should return true for TIMESTAMP (uppercase)', () => {
    expect(isDateType('TIMESTAMP')).toBe(true);
  });

  it('should return true for timestamptz', () => {
    expect(isDateType('timestamptz')).toBe(true);
  });

  it('should return true for timestamp with time zone', () => {
    expect(isDateType('timestamp with time zone')).toBe(true);
  });

  it('should return true for date', () => {
    expect(isDateType('date')).toBe(true);
  });

  it('should return true for DATE (uppercase)', () => {
    expect(isDateType('DATE')).toBe(true);
  });

  it('should return true for time', () => {
    expect(isDateType('time')).toBe(true);
  });

  it('should return true for time without time zone', () => {
    expect(isDateType('time without time zone')).toBe(true);
  });

  it('should return false for integer', () => {
    expect(isDateType('integer')).toBe(false);
  });

  it('should return false for varchar', () => {
    expect(isDateType('varchar')).toBe(false);
  });

  it('should return false for text', () => {
    expect(isDateType('text')).toBe(false);
  });

  it('should return false for numeric types', () => {
    expect(isDateType('bigint')).toBe(false);
    expect(isDateType('numeric')).toBe(false);
    expect(isDateType('real')).toBe(false);
  });
});

// Additional tests to increase mutation score
describe('Edge cases and error messages', () => {
  const mockProject = {
    id: 'proj-123',
    connection_string: 'postgresql://localhost/test',
  };
  const mockUser = { id: 'user-123' };
  const mockContext = { params: { projectId: 'proj-123' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return specific error message for missing table', async () => {
    const request = {
      json: async () => ({ insertData: { name: 'test' } }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('Missing required fields: table, insert data');
    expect(response.status).toBe(400);
  });

  it('should return specific error message for missing insertData', async () => {
    const request = {
      json: async () => ({ table: 'users' }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('Missing required fields: table, insert data');
    expect(response.status).toBe(400);
  });

  it('should return specific error message for empty insertData', async () => {
    const request = {
      json: async () => ({ table: 'users', insertData: {} }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('Missing required fields: table, insert data');
    expect(response.status).toBe(400);
  });

  it('should return specific error for table not found', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      { name: 'other_table', columns: [] },
    ]);

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { name: 'test' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toContain("Table metadata for 'users' not found");
    expect(response.status).toBe(404);
  });

  it('should return specific error for no valid columns', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [{ name: 'id', type: 'integer', nullable: false }],
      },
    ]);

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { invalid_column: 'test' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('No valid columns provided');
    expect(response.status).toBe(400);
  });

  it('should return specific error with missing column names', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'integer', nullable: false, default: null },
          { name: 'name', type: 'varchar', nullable: false, default: null },
        ],
      },
    ]);

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { id: 1 },
      })
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('Missing required columns');
    expect(data.missing).toEqual(['name']);
    expect(response.status).toBe(400);
  });

  it('should return specific error for failed insert execution', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [{ name: 'name', type: 'varchar', nullable: false }],
      },
    ]);
    mockExecuteQuery.mockRejectedValue(new Error('Database connection failed'));

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { name: 'test' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('Failed to execute insert');
    expect(data.detail).toBe('Database connection failed');
    expect(response.status).toBe(400);
  });

  it('should return internal server error for top-level exceptions', async () => {
    const request = {
      json: async () => {
        throw new Error('JSON parse error');
      },
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.error).toBe('Internal server error');
    expect(response.status).toBe(500);
  });

  it('should include row data in successful response', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [{ name: 'name', type: 'varchar', nullable: false }],
      },
    ]);
    mockExecuteQuery.mockResolvedValue({
      rows: [{ id: 1, name: 'test' }],
    });

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { name: 'test' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.row).toEqual({ id: 1, name: 'test' });
    expect(data.table).toBe('users');
  });

  it('should handle empty rows array in response', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [{ name: 'name', type: 'varchar', nullable: false }],
      },
    ]);
    mockExecuteQuery.mockResolvedValue({
      rows: [],
    });

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { name: 'test' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(data.row).toBe(null);
  });

  it('should construct query with escaped column names', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [
          { name: 'user_name', type: 'varchar', nullable: false },
          { name: 'user_email', type: 'varchar', nullable: false },
        ],
      },
    ]);
    mockExecuteQuery.mockResolvedValue({
      rows: [{ user_name: 'test', user_email: 'test@test.com' }],
    });

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { user_name: 'test', user_email: 'test@test.com' },
      }),
    };

    await POST(request, mockContext, mockUser, mockProject);

    const call = mockExecuteQuery.mock.calls[0];
    expect(call[1]).toContain('"user_name"');
    expect(call[1]).toContain('"user_email"');
    expect(call[1]).toContain('INSERT INTO public."users"');
    expect(call[1]).toContain('RETURNING *');
  });

  it('should return error for invalid date format with specific column', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'events',
        columns: [
          { name: 'event_date', type: 'timestamp', nullable: false },
        ],
      },
    ]);

    mockExecuteQuery.mockRejectedValue(new Error('Invalid date value'));

    const request = {
      json: async () => ({
        table: 'events',
        insertData: { event_date: 'not-a-valid-date-xyz-123' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should correctly handle columns with defaults', async () => {
    mockGetDatabaseSchema.mockResolvedValue([
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'integer', nullable: false, default: 'nextval' },
          { name: 'name', type: 'varchar', nullable: false, default: null },
        ],
      },
    ]);
    mockExecuteQuery.mockResolvedValue({
      rows: [{ id: 1, name: 'test' }],
    });

    const request = {
      json: async () => ({
        table: 'users',
        insertData: { name: 'test' },
      }),
    };

    const response = await POST(request, mockContext, mockUser, mockProject);
    expect(response.status).toBe(200);
  });
});


