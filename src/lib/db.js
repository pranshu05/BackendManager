import { Pool } from 'pg';

// Main connection (to Neon account DBuddy project)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Function to create a new user database in Neon
export async function createUserDatabase(userId, projectName) {
    const dbName = `${userId.replace(/-/g, '_')}_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    try {
        const response = await fetch(
            `https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}/branches/${process.env.NEON_BRANCH_ID}/databases`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    database: {
                        name: dbName,
                        owner_name: 'neondb_owner'
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create database: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        // Neon doesn’t directly return a ready-to-use connection string here.
        // We can create it with the branch connection URI + ?dbname=<dbName>
        const baseUri = process.env.NEON_BASE_URI; // e.g. postgres://user:pass@host:port
        const connectionString = `${baseUri}/${dbName}`;

        return {
            databaseName: dbName,
            connectionString,
            projectId: process.env.NEON_PROJECT_ID,
            branchId: process.env.NEON_BRANCH_ID,
            apiResponse: result
        };
    } catch (error) {
        console.error('Error creating user database:', error);
        throw error;
    }
}

// Function to delete a user database in Neon
export async function deleteUserDatabase(dbName) {
    try {
        const response = await fetch(
            `https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}/branches/${process.env.NEON_BRANCH_ID}/databases/${dbName}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete database: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return {
            success: true,
            databaseName: dbName,
            message: `Database ${dbName} deleted successfully`
        };
    } catch (error) {
        console.error('Error deleting user database:', error);
        throw error;
    }
}

// Function to get connection to a specific user database
export async function getUserDatabaseConnection(connectionString) {
    return new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
}

// Function to execute queries safely
export async function executeQuery(connectionString, query, params = []) {
    // Validate query input
    if (!query || typeof query !== 'string' || query.trim() === '') {
        throw new Error('Invalid query: Query must be a non-empty string');
    }

    // Normalize multiline queries by removing extra whitespace and newlines
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();

    // Check for incomplete query (basic validation)
    if (normalizedQuery.endsWith(',') || normalizedQuery.endsWith('(')) {
        throw new Error('Invalid query: Query appears to be incomplete or malformed');
    }

    // More flexible SELECT validation for multiline queries
    const upperQuery = normalizedQuery.toUpperCase();
    if (upperQuery.includes('SELECT') && !upperQuery.includes('FROM') && !normalizedQuery.includes('*') && !upperQuery.includes('COUNT') && !upperQuery.includes('NOW()')) {
        throw new Error('Invalid query: SELECT query appears to be incomplete');
    }

    const userPool = await getUserDatabaseConnection(connectionString);

    try {
        const result = await userPool.query(query, params);
        return result;
    } catch (error) {
        console.error('Query execution error:', error);
        
        // Provide more helpful error messages for common syntax errors
        if (error.code === '42601') {
            throw new Error(`SQL Syntax Error: ${error.message}. Please check your query syntax.`);
        }
        
        throw error;
    } finally {
        await userPool.end();
    }
}

// Function to get database schema information
export async function getDatabaseSchema(connectionString) {
    const query = `
        SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            tc.constraint_type
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c 
            ON c.table_name = t.table_name
        LEFT JOIN information_schema.key_column_usage kcu 
            ON kcu.table_name = t.table_name AND kcu.column_name = c.column_name
        LEFT JOIN information_schema.table_constraints tc 
            ON tc.constraint_name = kcu.constraint_name
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position;
    `;

    try {
        const result = await executeQuery(connectionString, query);

        const tables = {};
        result.rows.forEach(row => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = {
                    name: row.table_name,
                    columns: []
                };
            }
            if (row.column_name) {
                tables[row.table_name].columns.push({
                    name: row.column_name,
                    type: row.data_type,
                    nullable: row.is_nullable === 'YES',
                    default: row.column_default,
                    constraint: row.constraint_type
                });
            }
        });

        return Object.values(tables);
    } catch (error) {
        console.error('Error fetching schema:', error);
        throw error;
    }
}

export { pool };