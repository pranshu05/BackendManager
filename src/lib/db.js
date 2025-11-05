import { Pool } from 'pg';

// Main connection (to Neon account DBuddy project)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Cache user database connection pools to avoid recreating them
const userPoolCache = new Map();
const POOL_TTL = 30 * 60 * 1000; // 30 minutes

// Cache database schemas to reduce repeated queries
const schemaCache = new Map();
const SCHEMA_TTL = 5 * 60 * 1000; // 5 minutes

// Simple in-memory connection manager to keep pools per imported project
const pools = new Map();

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

        // Neon doesn't directly return a ready-to-use connection string here.
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
        // Clear cached pool and schema for this database
        clearDatabaseCache(dbName);

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

// Function to get connection to a specific user database (with SSL fallback)
export async function getUserDatabaseConnection(connectionString) {
    // Check if we have a cached pool
    const cached = userPoolCache.get(connectionString);
    
    if (cached && Date.now() - cached.timestamp < POOL_TTL) {
        return cached.pool;
    }

    // First try connecting with SSL
    try {
        const sslPool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false // Required for Neon and some cloud databases
            },
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 4000,
        });
        
        // Test the SSL connection
        await sslPool.query('SELECT 1');
        
        // Cache it
        userPoolCache.set(connectionString, {
            pool: sslPool,
            timestamp: Date.now()
        });

        // Clean up old pools periodically
        cleanupOldPools();

        return sslPool;
    } catch (error) {
        // If SSL connection fails, try without SSL
        if (error.message.includes('does not support SSL') || error.code === 'ECONNREFUSED') {
            try {
                const nonSslPool = new Pool({
                    connectionString,
                    ssl: false,
                    max: 5,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 4000,
                });
                
                // Test the non-SSL connection
                await nonSslPool.query('SELECT 1');
                
                // Cache it
                userPoolCache.set(connectionString, {
                    pool: nonSslPool,
                    timestamp: Date.now()
                });

                // Clean up old pools periodically
                cleanupOldPools();

                return nonSslPool;
            } catch (nonSslError) {
                throw new Error(`Failed to connect to database: ${nonSslError.message}`);
            }
        }
        throw new Error(`Failed to connect to database: ${error.message}`);
    }
}

// Pool management functions for imported projects
export function createPool(key, connectionString) {
    if (pools.has(key)) {
        return pools.get(key);
    }

    const p = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
    });

    pools.set(key, p);
    return p;
}

export function getPool(key) {
    return pools.get(key);
}

export async function removePool(key) {
    const p = pools.get(key);
    if (p) {
        await p.end();
        pools.delete(key);
        return true;
    }
    return false;
}

// Clear cache for a specific database
function clearDatabaseCache(dbName) {
    // Remove from pool cache
    for (const [connString, data] of userPoolCache.entries()) {
        if (connString.includes(dbName)) {
            data.pool.end().catch(console.error);
            userPoolCache.delete(connString);
        }
    }

    // Remove from schema cache
    for (const [key] of schemaCache.entries()) {
        if (key.includes(dbName)) {
            schemaCache.delete(key);
        }
    }
}

// Cleanup old pools from cache
function cleanupOldPools() {
    const now = Date.now();
    for (const [connString, data] of userPoolCache.entries()) {
        if (now - data.timestamp > POOL_TTL) {
            data.pool.end().catch(console.error);
            userPoolCache.delete(connString);
        }
    }
}

// Function to wait for database to be ready
export async function waitForDatabaseReady(connectionString, maxAttempts = 4, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 1,
            connectionTimeoutMillis: 4000,
        });

        try {
            // Try to connect and execute a simple query
            await pool.query('SELECT 1');
            await pool.end();
            return true;
        } catch (error) {
            await pool.end();
            
            if (attempt === maxAttempts) {
                throw new Error(`Database not ready after ${maxAttempts} attempts: ${error.message}`);
            }
            
            // Wait before next attempt with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
    return false;
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

    // Use cached pool (don't end it after query)
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
    }
    // NOTE: No longer ending pool here - it's cached and reused
}
// Get database schema with caching
export async function getDatabaseSchema(connectionString, forceRefresh = false) {
    const cacheKey = connectionString;
    
    // Check cache first
    if (!forceRefresh) {
        const cached = schemaCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SCHEMA_TTL) {
            return cached.data;
        }
    }

    const query = `
       SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    tc.constraint_type,
    kcu.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON c.table_name = t.table_name AND c.table_schema = t.table_schema
LEFT JOIN information_schema.key_column_usage kcu 
    ON kcu.table_name = t.table_name 
    AND kcu.column_name = c.column_name 
    AND kcu.table_schema = t.table_schema
LEFT JOIN information_schema.table_constraints tc 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = t.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.constraint_schema = tc.table_schema
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
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
                    constraint: row.constraint_type,
                    foreign_table: row.foreign_table_name,
                    foreign_column: row.foreign_column_name
                });
            }
        });

        const schemaData = Object.values(tables);

        // Cache the result
        schemaCache.set(cacheKey, {
            data: schemaData,
            timestamp: Date.now()
        });

        return schemaData;
    } catch (error) {
        console.error('Error fetching schema:', error);
        throw error;
    }
}

// Invalidate schema cache for a connection
export function invalidateSchemaCache(connectionString) {
    schemaCache.delete(connectionString);
}

// Get cache statistics for monitoring
export function getCacheStats() {
    return {
        poolCacheSize: userPoolCache.size,
        schemaCacheSize: schemaCache.size,
        importedPoolsSize: pools.size
    };
}

export { pool };