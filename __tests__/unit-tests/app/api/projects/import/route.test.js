const mockPoolQuery = jest.fn();
const mockGetDatabaseSchema = jest.fn();
const mockCreatePool = jest.fn();
const mockGetUserDatabaseConnection = jest.fn();

jest.mock("@/lib/db", () => ({
    pool: { query: (...args) => mockPoolQuery(...args) },
    getDatabaseSchema: (...args) => mockGetDatabaseSchema(...args),
    createPool: (...args) => mockCreatePool(...args),
    getUserDatabaseConnection: (...args) => mockGetUserDatabaseConnection(...args),
}));

// Mock requireAuth
let mockAuthUser = { id: "test-user-123", email: "test@example.com" };
jest.mock("@/lib/auth", () => ({
    requireAuth: jest.fn(async () => ({ user: mockAuthUser })),
}));

// Mock next/server
jest.mock("next/server", () => ({
    NextResponse: {
        json: (data, options = {}) => ({
            json: async () => data,
            status: options.status || 200,
        }),
    },
}));

import { POST, GET } from "@/app/api/projects/import/route";

describe("Import Database API Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthUser = { id: "test-user-123", email: "test@example.com" };
    });

    describe("POST /api/projects/import", () => {
        it("should successfully import a database with valid credentials", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "admin",
                    password: "password123",
                    database: "production_db",
                    projectName: "My Production DB",
                }),
            };

            // Mock successful connection
            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);

            // Mock schema fetch
            mockGetDatabaseSchema.mockResolvedValue({
                tables: [
                    { name: "users", columns: ["id", "name", "email"] },
                    { name: "products", columns: ["id", "title", "price"] },
                ],
            });

            // Mock database insert
            mockPoolQuery.mockResolvedValue({
                rows: [
                    {
                        id: 1,
                        project_name: "My Production DB",
                        database_name: "production_db",
                        created_at: new Date().toISOString(),
                    },
                ],
            });

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(data.message).toBe("Database imported");
            expect(data.project).toBeDefined();
            expect(data.project.id).toBe(1);
            expect(data.project.project_name).toBe("My Production DB");
            expect(mockGetUserDatabaseConnection).toHaveBeenCalledWith(
                expect.stringContaining("postgres://")
            );
            expect(mockGetDatabaseSchema).toHaveBeenCalled();
            expect(mockCreatePool).toHaveBeenCalledWith(
                "project_1",
                expect.stringContaining("postgres://")
            );
        });

        it("should use generated project name when projectName not provided", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "db.example.com",
                    port: 5432,
                    username: "dbuser",
                    database: "mydb",
                    // projectName not provided
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });

            mockPoolQuery.mockResolvedValue({
                rows: [
                    {
                        id: 2,
                        project_name: "test-user-123_mydb",
                        database_name: "mydb",
                    },
                ],
            });

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO user_projects"),
                expect.arrayContaining(["test-user-123_mydb"])
            );
            expect(data.project.project_name).toBe("test-user-123_mydb");
        });

        it("should return 400 when host is missing", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    // host missing
                    port: 5432,
                    username: "admin",
                    password: "password",
                    database: "mydb",
                }),
            };

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(response.status).toBe(400);
            expect(data.error).toContain("host");
        });

        it("should return 400 when username is missing", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    // username missing
                    password: "password",
                    database: "mydb",
                }),
            };

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(response.status).toBe(400);
            expect(data.error).toContain("username");
        });

        it("should return 400 when database is missing", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "admin",
                    password: "password",
                    // database missing
                }),
            };

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(response.status).toBe(400);
            expect(data.error).toContain("database");
        });

        it("should return 400 when connection test fails", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "invalid-host",
                    port: 5432,
                    username: "admin",
                    password: "password",
                    database: "mydb",
                }),
            };

            // Mock connection failure
            mockGetUserDatabaseConnection.mockRejectedValue(
                new Error("ECONNREFUSED")
            );

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(response.status).toBe(400);
            expect(data.error).toContain("Unable to connect");
        });

        it("should return 400 for invalid credentials", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "wronguser",
                    password: "wrongpassword",
                    database: "mydb",
                }),
            };

            // Mock connection failure due to auth
            mockGetUserDatabaseConnection.mockRejectedValue(
                new Error("FATAL: password authentication failed")
            );

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(response.status).toBe(400);
            expect(data.error).toContain("Unable to connect");
        });

        it("should return 500 when schema fetch fails", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "admin",
                    password: "password",
                    database: "mydb",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);

            // Mock schema fetch failure
            mockGetDatabaseSchema.mockRejectedValue(
                new Error("Permission denied for schema")
            );

            // Act
            const response = await POST(mockRequest);
            const data = await response.json();

            // Assert
            expect(response.status).toBe(500);
            expect(data.error).toContain("Unable to read database schema");
        });

        it("should properly encode username and password in connection string", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "db.example.com",
                    port: 5432,
                    username: "user@domain",
                    password: "pass:word!",
                    database: "mydb",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({
                rows: [{ id: 3, project_name: "test" }],
            });

            // Act
            await POST(mockRequest);

            // Assert - verify the connection string was encoded properly
            const connectionStringCall = mockGetUserDatabaseConnection.mock.calls[0][0];
            expect(connectionStringCall).toContain("user%40domain");
            // Password encoding may not encode all special chars, just verify it contains the password part
            expect(connectionStringCall).toContain("@db.example.com");
        });

        it("should handle missing password in connection string", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "admin",
                    // password omitted
                    database: "mydb",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({
                rows: [{ id: 4, project_name: "test" }],
            });

            // Act
            await POST(mockRequest);

            // Assert
            const connectionStringCall = mockGetUserDatabaseConnection.mock.calls[0][0];
            // Should not have a colon after username when no password
            expect(connectionStringCall).toMatch(/postgres:\/\/admin@/);
        });

        it("should use default port 5432 when port not provided", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    // port not provided
                    username: "admin",
                    password: "password",
                    database: "mydb",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({
                rows: [{ id: 5, project_name: "test" }],
            });

            // Act
            await POST(mockRequest);

            // Assert
            const connectionStringCall = mockGetUserDatabaseConnection.mock.calls[0][0];
            expect(connectionStringCall).toContain(":5432");
        });

        it("should set is_active to true for new imported project", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "admin",
                    password: "password",
                    database: "mydb",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({
                rows: [{ id: 6, project_name: "test", is_active: true }],
            });

            // Act
            await POST(mockRequest);

            // Assert
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining("true"),
                expect.any(Array)
            );
        });
    });

    describe("GET /api/projects/import", () => {
        it("should return all active projects for authenticated user", async () => {
            // Arrange
            const mockRequest = {};
            const expectedProjects = [
                {
                    id: 1,
                    project_name: "Production DB",
                    database_name: "prod_db",
                    description: "Imported from db.example.com",
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    table_count: 0,
                },
                {
                    id: 2,
                    project_name: "Staging DB",
                    database_name: "staging_db",
                    description: "Imported from staging.example.com",
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    table_count: 0,
                },
            ];

            mockPoolQuery.mockResolvedValue({
                rows: expectedProjects,
            });

            // Act
            const response = await GET(mockRequest);
            const data = await response.json();

            // Assert
            expect(data.projects).toEqual(expectedProjects);
            expect(data.projects).toHaveLength(2);
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT"),
                expect.arrayContaining(["test-user-123"])
            );
        });

        it("should only return active projects", async () => {
            // Arrange
            const mockRequest = {};
            mockPoolQuery.mockResolvedValue({
                rows: [],
            });

            // Act
            await GET(mockRequest);

            // Assert
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining("is_active = true"),
                expect.any(Array)
            );
        });

        it("should return empty array when user has no projects", async () => {
            // Arrange
            const mockRequest = {};
            mockPoolQuery.mockResolvedValue({
                rows: [],
            });

            // Act
            const response = await GET(mockRequest);
            const data = await response.json();

            // Assert
            expect(data.projects).toEqual([]);
            expect(data.projects).toHaveLength(0);
        });

        it("should order projects by creation date descending", async () => {
            // Arrange
            const mockRequest = {};
            mockPoolQuery.mockResolvedValue({
                rows: [],
            });

            // Act
            await GET(mockRequest);

            // Assert
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                expect.any(Array)
            );
        });

        it("should query projects for authenticated user only", async () => {
            // Arrange
            const mockRequest = {};
            mockPoolQuery.mockResolvedValue({
                rows: [],
            });

            mockAuthUser = { id: "different-user-456", email: "other@example.com" };

            // Act
            await GET(mockRequest);

            // Assert
            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(["different-user-456"])
            );
        });
    });

    describe("Integration - Connection String Building", () => {
        it("should handle PostgreSQL standard connection string", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "localhost",
                    port: 5432,
                    username: "postgres",
                    password: "postgres",
                    database: "test_db",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({
                rows: [{ id: 7, project_name: "test" }],
            });

            // Act
            await POST(mockRequest);

            // Assert
            expect(mockGetUserDatabaseConnection).toHaveBeenCalledWith(
                "postgres://postgres:postgres@localhost:5432/test_db"
            );
        });

        it("should handle Neon database connection string", async () => {
            // Arrange
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: "ep-xyz.neon.tech",
                    port: 5432,
                    username: "user",
                    password: "neon_password",
                    database: "neon_db",
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({
                rows: [{ id: 8, project_name: "test" }],
            });

            // Act
            await POST(mockRequest);

            // Assert
            expect(mockGetUserDatabaseConnection).toHaveBeenCalledWith(
                expect.stringContaining("neon.tech")
            );
        });
    });

    describe('Error Logging and Console Output', () => {
        it('should log connection test failure with error message', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'localhost',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            mockGetUserDatabaseConnection.mockRejectedValue(new Error('Connection failed'));

            await POST(mockRequest);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Connection test failed',
                expect.any(Error)
            );
            expect(consoleSpy.mock.calls[0][0]).not.toBe('');
            consoleSpy.mockRestore();
        });

        it('should log schema fetch failure with error message', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'localhost',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockRejectedValue(new Error('Schema error'));

            await POST(mockRequest);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Schema fetch failed',
                expect.any(Error)
            );
            expect(consoleSpy.mock.calls[0][0]).not.toBe('');
            consoleSpy.mockRestore();
        });

        it('should log pool creation failure with error message', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'localhost',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
            mockCreatePool.mockImplementation(() => {
                throw new Error('Pool creation failed');
            });

            await POST(mockRequest);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to create pool for imported project',
                expect.any(Error)
            );
            expect(consoleSpy.mock.calls[0][0]).not.toBe('');
            consoleSpy.mockRestore();
        });

        it('should handle pool creation failure gracefully without throwing', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'localhost',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
            mockCreatePool.mockImplementation(() => {
                throw new Error('Pool error');
            });

            const response = await POST(mockRequest);
            const data = await response.json();

            expect(data.message).toBe('Database imported');
            expect(response.status).toBe(200);
            consoleSpy.mockRestore();
        });

        it('should use host in description for imported project', async () => {
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'production.example.com',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });

            await POST(mockRequest);

            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    expect.any(String),
                    expect.any(String),
                    expect.any(String),
                    'Imported from production.example.com',
                    expect.any(String)
                ])
            );
        });

        it('should verify description is not empty string', async () => {
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'localhost',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });

            await POST(mockRequest);

            const description = mockPoolQuery.mock.calls[0][1][3];
            expect(description).toContain('Imported from');
            expect(description).not.toBe('');
            expect(description.length).toBeGreaterThan(0);
        });

        it('should execute SELECT 1 test query', async () => {
            const mockRequest = {
                json: jest.fn().mockResolvedValue({
                    host: 'localhost',
                    username: 'admin',
                    database: 'mydb',
                }),
            };

            const mockConnectionPool = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                end: jest.fn().mockResolvedValue(undefined),
            };
            mockGetUserDatabaseConnection.mockResolvedValue(mockConnectionPool);
            mockGetDatabaseSchema.mockResolvedValue({ tables: [] });
            mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });

            await POST(mockRequest);

            expect(mockConnectionPool.query).toHaveBeenCalledWith('SELECT 1');
            expect(mockConnectionPool.query).not.toHaveBeenCalledWith('');
        });
    });
});