import { executeQuery, getDatabaseSchema } from './db.js';
import { ChatGroq } from "@langchain/groq";
import { StateGraph, END, START } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { v4 as uuidv4 } from 'uuid'; //for generating uuids

// Mock Data Generator using LangGraph Generates realistic test data based on database schema using LLM with hybrid post-processing
 
// Initialize Groq Model
const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0.6 // Slightly creative for text
});

const BATCH_SIZE = 10; // Process records in small chunks
//  CORE GRAPH NODES
// 1. GENERATE NODE: Creates raw JSON based on schema and hints
const generateDataNode = async (state) => {
    const { tableName, tableSchema, count, foreignKeyContext, retryCount } = state;
    
    // Parse schema to create helpful hints about context of database for the LLM
    const schema = JSON.parse(tableSchema);
    const hints = schema.map(col => {
        const name = col.name.toLowerCase();
      //adding manual hints for usual types
        if (name.includes('status')) return `${col.name}: use realistic business statuses (e.g., active, pending, archived)`;
        if (name.includes('email')) return `${col.name}: use unique realistic emails`;
        if (name.includes('phone')) return `${col.name}: use realistic phone format`;
        if (name.includes('amount') || name.includes('price')) return `${col.name}: positive decimal number`;
        if (name.includes('description') || name.includes('bio')) return `${col.name}: 1-2 sentences of realistic text`;
        return null;
    }).filter(Boolean).join('\n');
 //prompting the model
    const prompt = `
    ROLE: Database Data Generator.
    CONTEXT: Generating mock data for table "${tableName}".
    
    SCHEMA STRUCTURE:
    ${tableSchema}
    
    HINTS & CONSTRAINTS:
    ${hints}
    
    FOREIGN KEYS (You MUST use one of these existing IDs for the respective column):
    ${foreignKeyContext}
    
    INSTRUCTIONS:
    1. Generate exactly ${count} records in a JSON Array.
    2. For 'uuid' columns: Generate a placeholder string "UUID_PLACEHOLDER" (we will fix this in code).
    3. For 'id' (integer): Generate unique integers.
    4. For 'json'/'jsonb' columns: Generate valid stringified JSON objects.
    5. Make text data realistic and varied. Avoid "Test Data 1", "Test Data 2".
    
    OUTPUT: Return ONLY the raw JSON array. No markdown, no explanations.`;

    try {
        const response = await model.invoke([
            new SystemMessage("You are a strict JSON data factory. Output raw JSON only."),
            new HumanMessage(prompt)
        ]);
        
        return { 
            rawOutput: response.content, 
            retryCount: retryCount 
        };
    } catch (e) {
        return { error: e.message, retryCount: retryCount + 1 };
    }
};

// Hybrid approach to ensure data validity
const validateDataNode = async (state) => {
    const { rawOutput, tableSchema } = state;
    const parser = new JsonOutputParser();
    const schema = JSON.parse(tableSchema);

    try {
        let parsed;
        try {
            parsed = await parser.parse(rawOutput);
        } catch {
            // Fallback: Try to clean markdown if parsing fails
            const cleaned = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        }

        if (!Array.isArray(parsed)) throw new Error("Output is not an array");

        // Overwrite bad LLM data (UUIDs, Dates) with hardcoded fixes
        const cleanedData = parsed.map(row => {
            const newRow = { ...row };
            
            schema.forEach(col => {
                const colName = col.name;
                const type = col.type.toLowerCase();

                // Always overwrite UUIDs to ensure they are valid and unique since in last implementation this was being problematic
                if (type === 'uuid' || type === 'guid') {
                    // Check for placeholder or missing/invalid UUIDs
                    if (col.constraint === 'PRIMARY KEY' || newRow[colName] === 'UUID_PLACEHOLDER' || !newRow[colName]) {
                        newRow[colName] = uuidv4();
                    }
                }

                // Ensuring dates are actual ISO strings
                if (type.includes('timestamp') || type.includes('date')) {
                    if (newRow[colName]) {
                        const date = new Date(newRow[colName]);
                        if (isNaN(date.getTime())) {
                            newRow[colName] = new Date().toISOString(); // Fallback to now
                        } else {
                            newRow[colName] = date.toISOString();
                        }
                    }
                }
                
                // Removing Hallucinated Columns

                Object.keys(newRow).forEach(key => {
                    if (!schema.find(c => c.name === key)) {
                        delete newRow[key];
                    }
                });
            });
            return newRow;
        });

        return { finalData: cleanedData, isValid: true };
    } catch (error) {
        return { isValid: false, error: error.message, retryCount: state.retryCount + 1 };
    }
};

// main workflow graph
const workflow = new StateGraph({
    channels: {
        tableName: { value: (x, y) => x ?? y },
        tableSchema: { value: (x, y) => x ?? y },
        count: { value: (x, y) => x ?? y },
        foreignKeyContext: { value: (x, y) => x ?? y },
        rawOutput: { value: (x, y) => y },
        finalData: { value: (x, y) => y },
        isValid: { value: (x, y) => y },
        retryCount: { value: (x, y) => y },
        error: { value: (x, y) => y }
    }
});

workflow.addNode("generate", generateDataNode);
workflow.addNode("validate", validateDataNode);

workflow.addEdge(START, "generate");
workflow.addEdge("generate", "validate");

// conditional edges based on validation result
workflow.addConditionalEdges(
    "validate",
    (state) => {
        if (state.isValid) return "end";
        if (state.retryCount >= 3) return "end"; // trying 3 times max
        return "retry";
    },
    {
        end: END,
        retry: "generate"
    }
);

const generateTableDataGraph = workflow.compile();

//api functions
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
    
   //dependency mapping
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

//generate mock data function
export async function generateMockData(connectionString, config = {}) {
    // read and analyze schema
    const { tables, dependencies } = await analyzeSchemaForGeneration(connectionString);
    
    // sorting tables on topological order to build foreign key dependencies 
    const sortedTables = topologicalSort(dependencies);
    
    const generatedData = {};  //generated data stored
    const insertQueries = [];
    
    //running langraph for each table 
    for (const tableName of sortedTables) {
        const table = tables[tableName];
        if (!table) continue;
        
        const tableConfig = config[tableName] || {};
        const totalCount = tableConfig.count || 5;
        
        console.log(`🤖 Processing ${tableName}: Target ${totalCount} records`);

        // BATCH PROCESSING LOOP 
        let recordsGenerated = 0;
        const tableRecords = [];

        while (recordsGenerated < totalCount) {
            // Calculate remaining records for this batch
            const currentBatchSize = Math.min(BATCH_SIZE, totalCount - recordsGenerated);
            
            // taking smart foreign key context via sampling
            const foreignKeyContext = getSmartForeignKeyContext(table, generatedData);

            try {
                // Invoke Graph for this batch
                const result = await generateTableDataGraph.invoke({
                    tableName: tableName,
                    tableSchema: JSON.stringify(table.columns),
                    count: currentBatchSize,
                    foreignKeyContext: JSON.stringify(foreignKeyContext),
                    retryCount: 0
                });

                if (result.finalData && result.finalData.length > 0) {
                    tableRecords.push(...result.finalData);
                    recordsGenerated += result.finalData.length;
                    console.log(`   ↳ Batch complete: ${recordsGenerated}/${totalCount}`);
                } else {
                    console.warn(`   ⚠️ Batch yielded no data for ${tableName}`);
                    break; //exit loop to avoid infinite running loops in case of failure 
                }
            } catch (err) {
                console.error(`   ❌ Batch failed for ${tableName}:`, err.message);
                break;
            }
        }

        generatedData[tableName] = tableRecords;
        
        // insertion queries for generated data
        if (tableRecords.length > 0) {
            const query = buildInsertQuery(tableName, tableRecords);
            if (query) insertQueries.push(query);
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

//inserts generated entries in project
export async function executeMockDataGeneration(connectionString, config = {}) {
    try {
        const result = await generateMockData(connectionString, config);
        
        const successfulTables = [];
        const failedTables = [];
        let totalRecordsInserted = 0;
        
        for (let i = 0; i < result.queries.length; i++) {
            const query = result.queries[i];
            const tableNameMatch = query.match(/INSERT INTO "([^"]+)"/);
            const tableName = tableNameMatch ? tableNameMatch[1] : `Table ${i + 1}`;
            const recordCount = result.data[tableName]?.length || 0;
            
            try {
                await executeQuery(connectionString, 'BEGIN;');
                await executeQuery(connectionString, query);
                await executeQuery(connectionString, 'COMMIT;');
                
                successfulTables.push({ table: tableName, records: recordCount });
                totalRecordsInserted += recordCount;
            } catch (error) {
                await executeQuery(connectionString, 'ROLLBACK;').catch(() => {});
                failedTables.push({ table: tableName, error: error.message, records: recordCount });
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

//helper functions 
function topologicalSort(dependencies) {
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    
    function visit(node) {
        if (visiting.has(node)) return;
        if (visited.has(node)) return;
        
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

//random sampling of foreign key values for context
function getSmartForeignKeyContext(table, allGeneratedData) {
    const context = {};
    if (!table.dependencies || table.dependencies.length === 0) return "No foreign keys.";

    table.dependencies.forEach(dep => {
        const sourceData = allGeneratedData[dep.table];
        if (sourceData && sourceData.length > 0) {
           
            const shuffled = [...sourceData].sort(() => 0.5 - Math.random());
            const sampleSize = Math.min(sourceData.length, 20); // Keep context small
            
            context[dep.table] = shuffled
                .slice(0, sampleSize)
                .map(d => d[dep.foreignColumn]); 
        }
    });
    return JSON.stringify(context);
}

function buildInsertQuery(tableName, records) {
    if (!records || records.length === 0) return null;
    
    const columns = Object.keys(records[0]);
    const values = records.map(record => {
        return `(${columns.map(col => {
            const val = record[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val)}'`;
            return val;
        }).join(', ')})`;
    });
    
    return `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${values.join(', ')};`;
}

// Predefined mock data templates for common scenarios which are provided as examples 
export const mockDataTemplates = {
    ecommerce: {
        categories: { count: 5 },
        products: { count: 20 },
        customers: { count: 20 },
        orders: { count: 50 }
    },
    blog: {
        authors: { count: 5 },
        categories: { count: 5 },
        posts: { count: 20 },
        comments: { count: 50 }
    },
    user_management: {
        roles: { count: 3 },
        users: { count: 25 },
        permissions: { count: 10 }
    }
};