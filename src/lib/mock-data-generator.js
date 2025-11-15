import { executeQuery, getDatabaseSchema } from './db.js';

/**
 * Mock Data Generator for PostgreSQL databases
 * Generates realistic test data based on database schema
 */

// Data type generators with realistic patterns
const dataGenerators = {
    // String types
    'character varying': (column, options = {}) => {
        const { maxLength = 255, pattern } = options;
        
        // Smart pattern detection based on column name
        const columnName = column.name.toLowerCase();
        
        if (columnName.includes('email')) {
            return generateEmail();
        } else if (columnName.includes('phone')) {
            return generatePhone();
        } else if (columnName.includes('name') && columnName.includes('first')) {
            return generateFirstName();
        } else if (columnName.includes('name') && columnName.includes('last')) {
            return generateLastName();
        } else if (columnName.includes('name')) {
            return generateFullName();
        } else if (columnName.includes('address')) {
            return generateAddress();
        } else if (columnName.includes('city')) {
            return generateCity();
        } else if (columnName.includes('country')) {
            return generateCountry();
        } else if (columnName.includes('company')) {
            return generateCompany();
        } else if (columnName.includes('title') || columnName.includes('position')) {
            return generateJobTitle();
        } else if (columnName.includes('description')) {
            return generateDescription();
        } else if (columnName.includes('url') || columnName.includes('website')) {
            return generateUrl();
        } else if (pattern) {
            return generateByPattern(pattern);
        } else {
            return generateRandomString(Math.min(maxLength, 50));
        }
    },
    
    'varchar': (column, options) => dataGenerators['character varying'](column, options),
    'text': (column, options) => dataGenerators['character varying'](column, { ...options, maxLength: 500 }),
    'char': (column, options) => dataGenerators['character varying'](column, { ...options, maxLength: 1 }),
    
    // Numeric types
    'integer': (column, options = {}) => {
        const { min = 1, max = 100000 } = options;
        const columnName = column.name.toLowerCase();
        
        if (columnName.includes('age')) {
            return Math.floor(Math.random() * 80) + 18;
        } else if (columnName.includes('year')) {
            return Math.floor(Math.random() * 30) + 1995;
        } else if (columnName.includes('price') || columnName.includes('amount')) {
            return Math.floor(Math.random() * 10000) + 1;
        } else if (columnName.includes('quantity') || columnName.includes('count')) {
            return Math.floor(Math.random() * 100) + 1;
        }
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    'bigint': (column, options = {}) => {
        const { min = 1, max = 1000000 } = options;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    'smallint': (column, options = {}) => {
        const { min = 1, max = 32767 } = options;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    'decimal': (column, options = {}) => {
        const { min = 0, max = 10000, precision = 2 } = options;
        const value = Math.random() * (max - min) + min;
        return parseFloat(value.toFixed(precision));
    },
    
    'numeric': (column, options) => dataGenerators.decimal(column, options),
    'real': (column, options) => dataGenerators.decimal(column, options),
    'double precision': (column, options) => dataGenerators.decimal(column, options),
    
    // Date/Time types
    'timestamp without time zone': (column, options = {}) => {
        const { startDate = new Date(2020, 0, 1), endDate = new Date() } = options;
        const start = startDate.getTime();
        const end = endDate.getTime();
        return new Date(start + Math.random() * (end - start)).toISOString();
    },
    
    'timestamp with time zone': (column, options) => dataGenerators['timestamp without time zone'](column, options),
    'timestamptz': (column, options) => dataGenerators['timestamp without time zone'](column, options),
    
    'date': (column, options = {}) => {
        const { startDate = new Date(2020, 0, 1), endDate = new Date() } = options;
        const start = startDate.getTime();
        const end = endDate.getTime();
        return new Date(start + Math.random() * (end - start)).toISOString().split('T')[0];
    },
    
    'time without time zone': () => {
        const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
        const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        const seconds = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },
    
    'time with time zone': (column, options) => dataGenerators['time without time zone'](column, options) + '+00:00',
    
    // Boolean type
    'boolean': () => Math.random() < 0.5,
    
    // UUID type
    'uuid': () => generateUUID(),
    
    // JSON types
    'json': (column) => {
        const columnName = column.name.toLowerCase();
        if (columnName.includes('config') || columnName.includes('settings')) {
            return JSON.stringify({
                theme: ['light', 'dark'][Math.floor(Math.random() * 2)],
                notifications: Math.random() < 0.7,
                language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)]
            });
        } else if (columnName.includes('metadata')) {
            return JSON.stringify({
                created_by: 'system',
                version: '1.0',
                tags: generateTags()
            });
        }
        return JSON.stringify({ data: generateRandomString(20) });
    },
    
    'jsonb': (column, options) => dataGenerators.json(column, options),
    
    // Array types (simplified)
    'ARRAY': (column) => {
        const baseType = column.type.replace('ARRAY', '').replace('[]', '');
        const arraySize = Math.floor(Math.random() * 5) + 1;
        const items = [];
        for (let i = 0; i < arraySize; i++) {
            if (dataGenerators[baseType]) {
                items.push(dataGenerators[baseType](column));
            } else {
                items.push(generateRandomString(10));
            }
        }
        return `{${items.join(',')}}`;
    }
};

// Helper functions for realistic data generation
function generateEmail() {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.com', 'example.org'];
    const username = generateRandomString(8).toLowerCase();
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
}

function generatePhone() {
    const formats = [
        '+1-XXX-XXX-XXXX',
        '(XXX) XXX-XXXX',
        'XXX-XXX-XXXX',
        '+44-XXXX-XXXXXX'
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];
    return format.replace(/X/g, () => Math.floor(Math.random() * 10));
}

function generateFirstName() {
    const names = [
        'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Jessica',
        'Daniel', 'Ashley', 'Matthew', 'Amanda', 'James', 'Melissa', 'Robert', 'Michelle',
        'William', 'Kimberly', 'Richard', 'Amy', 'Joseph', 'Angela', 'Thomas', 'Helen'
    ];
    return names[Math.floor(Math.random() * names.length)];
}

function generateLastName() {
    const names = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
        'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
    ];
    return names[Math.floor(Math.random() * names.length)];
}

function generateFullName() {
    return `${generateFirstName()} ${generateLastName()}`;
}

function generateAddress() {
    const streetNumbers = Math.floor(Math.random() * 9999) + 1;
    const streetNames = [
        'Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Elm St',
        'Park Ave', 'First St', 'Second St', 'Washington St', 'Lincoln Ave'
    ];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    return `${streetNumbers} ${streetName}`;
}

function generateCity() {
    const cities = [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
        'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
        'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle'
    ];
    return cities[Math.floor(Math.random() * cities.length)];
}

function generateCountry() {
    const countries = [
        'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy',
        'Spain', 'Australia', 'Japan', 'South Korea', 'Brazil', 'Mexico',
        'India', 'China', 'Russia', 'Netherlands', 'Sweden', 'Norway'
    ];
    return countries[Math.floor(Math.random() * countries.length)];
}

function generateCompany() {
    const prefixes = ['Tech', 'Global', 'Digital', 'Smart', 'Advanced', 'Modern', 'Future'];
    const suffixes = ['Solutions', 'Systems', 'Corp', 'Inc', 'LLC', 'Group', 'Enterprises'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix}`;
}

function generateJobTitle() {
    const titles = [
        'Software Engineer', 'Product Manager', 'Data Analyst', 'Marketing Specialist',
        'Sales Representative', 'Customer Success Manager', 'DevOps Engineer', 'UX Designer',
        'Business Analyst', 'Project Manager', 'Quality Assurance Engineer', 'Technical Writer'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
}

function generateDescription() {
    const adjectives = ['innovative', 'efficient', 'reliable', 'scalable', 'user-friendly', 'robust'];
    const nouns = ['solution', 'platform', 'system', 'application', 'service', 'tool'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `An ${adj} ${noun} designed to improve productivity and efficiency.`;
}

function generateUrl() {
    const domains = ['example.com', 'company.org', 'website.net', 'platform.io', 'service.co'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `https://www.${domain}`;
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateTags() {
    const tags = ['important', 'urgent', 'review', 'draft', 'published', 'archived'];
    const numTags = Math.floor(Math.random() * 3) + 1;
    const selectedTags = [];
    for (let i = 0; i < numTags; i++) {
        const tag = tags[Math.floor(Math.random() * tags.length)];
        if (!selectedTags.includes(tag)) {
            selectedTags.push(tag);
        }
    }
    return selectedTags;
}

function generateByPattern(pattern) {
    // Simple pattern matching (can be extended)
    return pattern.replace(/X/g, () => Math.floor(Math.random() * 10))
                 .replace(/A/g, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)));
}

/**
 * Analyzes database schema and builds dependency graph for foreign keys
 */
export async function analyzeSchemaForGeneration(connectionString) {
    const schema = await getDatabaseSchema(connectionString);
    
    const tables = {};
    const dependencies = {};
    
    schema.forEach(table => {
        tables[table.name] = {
            name: table.name,
            columns: table.columns,
            primaryKey: table.columns.find(col => col.constraint === 'PRIMARY KEY'),
            foreignKeys: table.columns.filter(col => col.constraint === 'FOREIGN KEY'),
            dependencies: []
        };
        dependencies[table.name] = [];
    });
    
    // Build dependency graph
    Object.values(tables).forEach(table => {
        table.foreignKeys.forEach(fk => {
            if (fk.foreign_table && tables[fk.foreign_table]) {
                dependencies[table.name].push(fk.foreign_table);
                tables[table.name].dependencies.push({
                    table: fk.foreign_table,
                    column: fk.name,
                    foreignColumn: fk.foreign_column
                });
            }
        });
    });
    
    return { tables, dependencies };
}

/**
 * Generates mock data for a single table
 */
export function generateTableData(table, count = 10, options = {}, foreignKeyData = {}) {
    const records = [];
    
    for (let i = 0; i < count; i++) {
        const record = {};
        
        table.columns.forEach(column => {
            // Skip auto-increment primary keys
            if (column.constraint === 'PRIMARY KEY' && 
                (column.default?.includes('nextval') || column.type === 'serial')) {
                return;
            }
            
            // Handle foreign keys
            if (column.constraint === 'FOREIGN KEY' && foreignKeyData[column.foreign_table]) {
                const foreignRecords = foreignKeyData[column.foreign_table];
                if (foreignRecords.length > 0) {
                    const randomRecord = foreignRecords[Math.floor(Math.random() * foreignRecords.length)];
                    record[column.name] = randomRecord[column.foreign_column];
                    return;
                }
            }
            
            // Handle nullable columns
            if (column.nullable && Math.random() < 0.1) {
                record[column.name] = null;
                return;
            }
            
            // Generate data based on type
            const generator = dataGenerators[column.type.toLowerCase()];
            if (generator) {
                record[column.name] = generator(column, options[column.name] || {});
            } else {
                // Fallback for unknown types
                record[column.name] = generateRandomString(10);
            }
        });
        
        records.push(record);
    }
    
    return records;
}

/**
 * Generates mock data for entire database respecting foreign key relationships
 */
export async function generateMockData(connectionString, config = {}) {
    const { tables, dependencies } = await analyzeSchemaForGeneration(connectionString);
    
    // Topological sort to determine generation order
    const sortedTables = topologicalSort(dependencies);
    const generatedData = {};
    const insertQueries = [];
    
    for (const tableName of sortedTables) {
        const table = tables[tableName];
        if (!table) continue;
        
        const tableConfig = config[tableName] || {};
        const count = tableConfig.count || 10;
        const options = tableConfig.options || {};
        
        // Generate data for this table
        const records = generateTableData(table, count, options, generatedData);
        generatedData[tableName] = records;
        
        // Create INSERT queries
        if (records.length > 0) {
            const columns = Object.keys(records[0]);
            const values = records.map(record => 
                `(${columns.map(col => {
                    const value = record[col];
                    if (value === null) return 'NULL';
                    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                    if (typeof value === 'boolean') return value;
                    return value;
                }).join(', ')})`
            );
            
            const query = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES ${values.join(', ')};`;
            insertQueries.push(query);
        }
    }
    
    return {
        data: generatedData,
        queries: insertQueries,
        summary: {
            tablesProcessed: sortedTables.length,
            totalRecords: Object.values(generatedData).reduce((sum, records) => sum + records.length, 0)
        }
    };
}

/**
 * Executes mock data generation and inserts into database
 */
export async function executeMockDataGeneration(connectionString, config = {}) {
    try {
        const result = await generateMockData(connectionString, config);
        
        const successfulTables = [];
        const failedTables = [];
        let totalRecordsInserted = 0;
        
        // Execute queries per table (each table in its own transaction)
        for (let i = 0; i < result.queries.length; i++) {
            const query = result.queries[i];
            // Extract table name from INSERT query
            const tableNameMatch = query.match(/INSERT INTO "([^"]+)"/);
            const tableName = tableNameMatch ? tableNameMatch[1] : `Table ${i + 1}`;
            const recordCount = result.data[tableName]?.length || 0;
            
            try {
                await executeQuery(connectionString, 'BEGIN;');
                await executeQuery(connectionString, query);
                await executeQuery(connectionString, 'COMMIT;');
                
                successfulTables.push({
                    table: tableName,
                    records: recordCount
                });
                totalRecordsInserted += recordCount;
            } catch (error) {
                await executeQuery(connectionString, 'ROLLBACK;').catch(() => {});
                failedTables.push({
                    table: tableName,
                    error: error.message,
                    records: recordCount
                });
                console.error(`Failed to insert data into ${tableName}:`, error.message);
            }
        }
        
        const hasSuccess = successfulTables.length > 0;
        const hasFailures = failedTables.length > 0;
        
        let message = '';
        if (hasSuccess && !hasFailures) {
            message = `Successfully generated ${totalRecordsInserted} records across ${successfulTables.length} tables`;
        } else if (hasSuccess && hasFailures) {
            message = `Partially completed: ${successfulTables.length} tables succeeded, ${failedTables.length} tables failed`;
        } else {
            message = `Failed to generate data for all ${failedTables.length} tables`;
        }
        
        return {
            success: hasSuccess,
            summary: {
                tablesProcessed: result.summary.tablesProcessed,
                totalRecords: totalRecordsInserted,
                successfulTables: successfulTables.length,
                failedTables: failedTables.length
            },
            successfulTables,
            failedTables,
            message
        };
    } catch (error) {
        console.error('Mock data generation failed:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to generate mock data',
            successfulTables: [],
            failedTables: []
        };
    }
}

/**
 * Topological sort for dependency resolution
 */
function topologicalSort(dependencies) {
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    
    function visit(node) {
        if (visiting.has(node)) {
            // Circular dependency - skip for now
            return;
        }
        if (visited.has(node)) {
            return;
        }
        
        visiting.add(node);
        
        const deps = dependencies[node] || [];
        deps.forEach(dep => visit(dep));
        
        visiting.delete(node);
        visited.add(node);
        result.push(node);
    }
    
    Object.keys(dependencies).forEach(node => visit(node));
    
    return result;
}

/**
 * Predefined templates for common use cases
 */
export const mockDataTemplates = {
    ecommerce: {
        categories: {
            count: 5,
            options: {
                name: { pattern: 'Category-X' },
                description: { maxLength: 100 }
            }
        },
        products: {
            count: 50,
            options: {
                price: { min: 10, max: 1000, precision: 2 },
                stock_quantity: { min: 0, max: 100 }
            }
        },
        customers: {
            count: 100,
            options: {}
        },
        orders: {
            count: 200,
            options: {
                total_amount: { min: 20, max: 500, precision: 2 }
            }
        }
    },
    
    blog: {
        authors: {
            count: 10,
            options: {}
        },
        categories: {
            count: 8,
            options: {}
        },
        posts: {
            count: 100,
            options: {}
        },
        comments: {
            count: 500,
            options: {}
        }
    },
    
    user_management: {
        roles: {
            count: 5,
            options: {}
        },
        users: {
            count: 100,
            options: {
                age: { min: 18, max: 65 }
            }
        },
        permissions: {
            count: 20,
            options: {}
        }
    }
};