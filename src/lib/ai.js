import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// Initialize Groq client
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

// Default model
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Clean markdown code blocks from AI responses
 * Used throughout this file to parse JSON responses
 */
function cleanMarkdownCodeBlocks(text) {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    return cleaned.trim();
}

/**
 * Parse JSON response from AI with error handling
 */
function parseAIResponse(text) {
    try {
        const cleaned = cleanMarkdownCodeBlocks(text);
        return JSON.parse(cleaned);
    } catch (error) {
        throw new Error(`Failed to parse AI response: ${error.message}`);
    }
}

/**
 * Analyze natural language input and infer database schema for a new project
 * @param {string} naturalLanguageInput - User's project description
 * @returns {Promise<{projectName: string, description: string, tables: Array}>}
 */
export async function inferDatabaseSchema(naturalLanguageInput) {
    const prompt = `You are a database architect. Based on the following project description, infer a complete database schema.

Project Description: "${naturalLanguageInput}"

Requirements:
1. Suggest a concise project name (lowercase, underscore-separated, max 30 chars)
2. Provide a brief project description
3. Design appropriate tables with columns, data types, and constraints
4. Include relationships (foreign keys) where appropriate
5. Add created_at, updated_at timestamps where appropriate
6. Use UUID for primary keys (id UUID DEFAULT gen_random_uuid() PRIMARY KEY)

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "projectName": "project_name",
  "description": "Brief description of the project",
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "constraints": ["PRIMARY KEY", "NOT NULL", "UNIQUE", "DEFAULT value"],
          "references": "other_table(column)" // optional, for foreign keys
        }
      ]
    }
  ]
}

Important:
- Use PostgreSQL data types (UUID, VARCHAR, TEXT, INTEGER, BOOLEAN, TIMESTAMP WITH TIME ZONE, etc.)
- Always include an "id" column as the first column with: "type": "UUID", "constraints": ["DEFAULT gen_random_uuid()", "PRIMARY KEY"]
- Use TIMESTAMP WITH TIME ZONE for date/time columns
- Be specific about VARCHAR lengths (e.g., VARCHAR(255))`;

    try {
        const { text } = await generateText({
            model: groq(DEFAULT_MODEL),
            prompt,
            temperature: 0.3,
            maxTokens: 2000,
        });

        // Use helper function instead of duplicate code
        const schema = parseAIResponse(text);

        // Validate schema structure
        if (!schema.projectName || !schema.tables || !Array.isArray(schema.tables)) {
            throw new Error('Invalid schema structure returned from AI');
        }

        return schema;
    } catch (error) {
        console.error('Error inferring database schema:', error);
        throw new Error(`Failed to infer database schema: ${error.message}`);
    }
}

/**
 * Generate SQL CREATE TABLE statements from schema
 * @param {Array} tables - Array of table definitions
 * @returns {Array<string>} - Array of CREATE TABLE SQL statements
 */
export function generateCreateTableStatements(tables) {
    return tables.map(table => {
        const columns = table.columns.map(col => {
            let definition = `${col.name} ${col.type}`;

            if (col.constraints && Array.isArray(col.constraints)) {
                definition += ' ' + col.constraints.join(' ');
            }

            if (col.references) {
                definition += ` REFERENCES ${col.references}`;
            }

            return definition;
        }).join(',\n    ');

        return `CREATE TABLE ${table.name} (\n    ${columns}\n);`;
    }).join('\n\n');
}

/**
 * Analyze natural language request to create a table in existing database
 * @param {string} naturalLanguageInput - User's table creation request
 * @param {Array} existingSchema - Current database schema
 * @returns {Promise<{action: string, proposed_sql: string, explaination: string, requires_confirmation: boolean}>}
 */
export async function analyzeCreateTableRequest(naturalLanguageInput, existingSchema) {
    const schemaContext = existingSchema.length > 0
        ? `Existing tables in database:\n${existingSchema.map(t => `- ${t.name}: ${t.columns.map(c => `${c.name} (${c.type})`).join(', ')}`).join('\n')}`
        : 'Database is currently empty.';

    const prompt = `You are a database architect. A user wants to add a new table to their existing database.

${schemaContext}

User Request: "${naturalLanguageInput}"

Generate a CREATE TABLE statement that:
1. Follows PostgreSQL syntax
2. Uses appropriate data types
3. Includes an "id" column as UUID PRIMARY KEY with DEFAULT gen_random_uuid()
4. Adds foreign keys if the table should reference existing tables
5. Includes created_at and updated_at timestamps where appropriate
6. Uses proper constraints (NOT NULL, UNIQUE, etc.)

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "action": "create_table",
  "proposed_sql": "CREATE TABLE table_name (...);",
  "explaination": "Brief explaination of the table design and why these columns were chosen",
  "requires_confirmation": true
}`;

    try {
        const { text } = await generateText({
            model: groq(DEFAULT_MODEL),
            prompt,
            temperature: 0.3,
            maxTokens: 1500,
        });

        // Use helper function
        const result = parseAIResponse(text);

        // Ensure requires_confirmation is always true
        result.requires_confirmation = true;

        return result;
    } catch (error) {
        console.error('Error analyzing create table request:', error);
        throw new Error(`Failed to analyze request: ${error.message}`);
    }
}

/**
 * Analyze natural language request to add column to existing table
 * @param {string} naturalLanguageInput - User's column addition request
 * @param {Array} existingSchema - Current database schema
 * @param {string} tableName - Target table name (if specified)
 * @returns {Promise<{action: string, proposed_sql: string, explaination: string, requires_confirmation: boolean}>}
 */
export async function analyzeAddColumnRequest(naturalLanguageInput, existingSchema, tableName = null) {
    const schemaContext = existingSchema.length > 0
        ? `Existing tables in database:\n${existingSchema.map(t => `- ${t.name}: ${t.columns.map(c => `${c.name} (${c.type})`).join(', ')}`).join('\n')}`
        : 'Database is currently empty.';

    const tableHint = tableName ? `\nTarget table: ${tableName}` : '';

    const prompt = `You are a database architect. A user wants to add a new column to an existing table.

${schemaContext}${tableHint}

User Request: "${naturalLanguageInput}"

Generate an ALTER TABLE ADD COLUMN statement that:
1. Follows PostgreSQL syntax
2. Uses appropriate data type
3. Includes proper constraints if needed
4. Considers existing columns to avoid duplicates
5. Uses DEFAULT values if the table might have existing rows and column is NOT NULL

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "action": "add_column",
  "proposed_sql": "ALTER TABLE table_name ADD COLUMN column_name data_type constraints;",
  "explaination": "Brief explaination of the column addition and data type choice",
  "requires_confirmation": true
}`;

    try {
        const { text } = await generateText({
            model: groq(DEFAULT_MODEL),
            prompt,
            temperature: 0.3,
            maxTokens: 1500,
        });

        // Use helper function
        const result = parseAIResponse(text);

        // Ensure requires_confirmation is always true
        result.requires_confirmation = true;

        return result;
    } catch (error) {
        console.error('Error analyzing add column request:', error);
        throw new Error(`Failed to analyze request: ${error.message}`);
    }
}

/**
 * General SQL query generation from natural language
 * @param {string} naturalLanguageInput - User's query request
 * @param {Array} existingSchema - Current database schema
 * @returns {Promise<{action: string, proposed_sql: string, explaination: string, requires_confirmation: boolean}>}
 */
export async function generateSQLFromNaturalLanguage(naturalLanguageInput, existingSchema) {
    const schemaContext = existingSchema.length > 0
        ? `Database schema:\n${existingSchema.map(t => `Table ${t.name}: ${t.columns.map(c => `${c.name} (${c.type})`).join(', ')}`).join('\n')}`
        : 'Database is currently empty.';

    const prompt = `You are a SQL expert. Convert the following natural language request into a SQL query.

${schemaContext}

User Request: "${naturalLanguageInput}"

Analyze the request and determine the appropriate SQL operation. Generate the correct SQL statement.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "action": "create_table" | "add_column" | "insert" | "select" | "update" | "delete" | "other",
  "proposed_sql": "SQL statement here",
  "explaination": "Brief explaination of what the query does",
  "requires_confirmation": true
}`;

    try {
        const { text } = await generateText({
            model: groq(DEFAULT_MODEL),
            prompt,
            temperature: 0.3,
            maxTokens: 1500,
        });

        // Use helper function
        const result = parseAIResponse(text);

        // Ensure requires_confirmation is always true
        result.requires_confirmation = true;

        return result;
    } catch (error) {
        console.error('Error generating SQL from natural language:', error);
        throw new Error(`Failed to generate SQL: ${error.message}`);
    }
}

/**
 * Analyze complex update request for existing database project
 * Can handle multiple operations: adding tables, modifying columns, creating indexes, etc.
 * @param {string} naturalLanguageInput - User's update request
 * @param {Array} existingSchema - Current database schema
 * @param {string} projectName - Name of the project for context
 * @returns {Promise<{operations: Array, summary: string, requires_confirmation: boolean}>}
 */
export async function analyzeProjectUpdateRequest(naturalLanguageInput, existingSchema, projectName = 'database') {
    const schemaContext = existingSchema.length > 0
        ? existingSchema.map(t => {
            const columns = t.columns.map(c => {
                let colDef = `${c.name} (${c.type})`;
                if (!c.nullable) colDef += ' NOT NULL';
                if (c.constraint) colDef += ` [${c.constraint}]`;
                return colDef;
            }).join(', ');
            return `Table "${t.name}": ${columns}`;
        }).join('\n')
        : 'Database is currently empty.';

    const prompt = `You are a database architect analyzing an update request for an existing database project.

Project: ${projectName}

Current Database Schema:
${schemaContext}

User's Update Request: "${naturalLanguageInput}"

Analyze the request and determine what database operations are needed. The request might involve:
- Creating new tables
- Adding columns to existing tables
- Modifying column types or constraints
- Creating indexes for performance
- Adding foreign key relationships
- Dropping tables or columns (be cautious)
- Any other DDL operations

For each operation needed, generate the appropriate SQL statement with PostgreSQL syntax.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "operations": [
    {
      "type": "create_table" | "alter_table" | "create_index" | "drop_table" | "drop_column" | "modify_column" | "other",
      "target": "table_name or target entity",
      "sql": "SQL statement",
      "explaination": "Why this operation is needed",
      "risk_level": "low" | "medium" | "high"
    }
  ],
  "summary": "Overall summary of all changes being proposed",
  "requires_confirmation": true,
  "estimated_impact": "Brief description of what will be affected"
}

Important guidelines:
1. Use UUID DEFAULT gen_random_uuid() PRIMARY KEY for new table IDs
2. Add created_at and updated_at timestamps where appropriate
3. Use proper PostgreSQL data types
4. Include foreign key constraints where relationships exist
5. Mark DROP operations as "high" risk
6. Consider adding indexes for commonly queried columns
7. If modifying existing tables, ensure backward compatibility when possible`;

    try {
        const { text } = await generateText({
            model: groq(DEFAULT_MODEL),
            prompt,
            temperature: 0.3,
            maxTokens: 3000,
        });

        // Use helper function
        const result = parseAIResponse(text);

        // Validate structure
        if (!result.operations || !Array.isArray(result.operations)) {
            throw new Error('Invalid response structure: missing operations array');
        }

        // Ensure requires_confirmation is always true
        result.requires_confirmation = true;

        return result;
    } catch (error) {
        console.error('Error analyzing project update request:', error);
        throw new Error(`Failed to analyze update request: ${error.message}`);
    }
}