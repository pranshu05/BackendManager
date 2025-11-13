import { NextResponse } from 'next/server';
import { withProjectAuth } from '@/lib/api-helpers';
import { 
    generateMockData, 
    executeMockDataGeneration, 
    analyzeSchemaForGeneration,
    mockDataTemplates 
} from '@/lib/mock-data-generator';

// Generate mock data preview (without inserting into database)
export const POST = withProjectAuth(async (request, _context, _user, project) => {
    try {
        const body = await request.json();
        const { config = {}, preview = false, template = null } = body;

        // If template is specified, use predefined configuration
        let finalConfig = config;
        if (template && mockDataTemplates[template]) {
            finalConfig = { ...mockDataTemplates[template], ...config };
        }

        if (preview) {
            // Generate preview without inserting into database
            const result = await generateMockData(project.connection_string, finalConfig);
            
            // Limit preview data to first few records per table
            const previewData = {};
            Object.keys(result.data).forEach(tableName => {
                previewData[tableName] = result.data[tableName].slice(0, 3);
            });

            return NextResponse.json({
                success: true,
                preview: previewData,
                queries: result.queries.slice(0, 5), // Show first 5 queries
                summary: result.summary,
                message: 'Mock data preview generated successfully'
            });
        } else {
            // Execute actual data generation
            const result = await executeMockDataGeneration(project.connection_string, finalConfig);
            return NextResponse.json(result);
        }
    } catch (error) {
        console.error('Mock data generation error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message,
                message: 'Failed to generate mock data'
            },
            { status: 500 }
        );
    }
});

// Get schema analysis for mock data generation
export const GET = withProjectAuth(async (_request, _context, _user, project) => {
    try {
        const analysis = await analyzeSchemaForGeneration(project.connection_string);
        
        // Add suggested configurations based on table structure
        const suggestions = {};
        Object.values(analysis.tables).forEach(table => {
            suggestions[table.name] = {
                recommendedCount: getRecommendedCount(table),
                columnSuggestions: getColumnSuggestions(table.columns),
                dependencies: table.dependencies
            };
        });

        return NextResponse.json({
            success: true,
            analysis,
            suggestions,
            templates: Object.keys(mockDataTemplates),
            message: 'Schema analysis completed successfully'
        });
    } catch (error) {
        console.error('Schema analysis error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message,
                message: 'Failed to analyze schema'
            },
            { status: 500 }
        );
    }
});

// Helper function to suggest record count based on table characteristics
function getRecommendedCount(table) {
    const tableName = table.name.toLowerCase();
    
    // Reference/lookup tables
    if (tableName.includes('category') || tableName.includes('role') || 
        tableName.includes('status') || tableName.includes('type')) {
        return 5;
    }
    
    // User-related tables
    if (tableName.includes('user') || tableName.includes('customer') || 
        tableName.includes('account')) {
        return 50;
    }
    
    // Transaction/activity tables
    if (tableName.includes('order') || tableName.includes('transaction') || 
        tableName.includes('log') || tableName.includes('event')) {
        return 200;
    }
    
    // Content tables
    if (tableName.includes('post') || tableName.includes('article') || 
        tableName.includes('product')) {
        return 100;
    }
    
    // Comment/review tables
    if (tableName.includes('comment') || tableName.includes('review') || 
        tableName.includes('rating')) {
        return 300;
    }
    
    // Default
    return 10;
}

// Helper function to suggest column-specific options
function getColumnSuggestions(columns) {
    const suggestions = {};
    
    columns.forEach(column => {
        const columnName = column.name.toLowerCase();
        const columnType = column.type.toLowerCase();
        
        // Numeric suggestions
        if (columnType.includes('int') || columnType.includes('numeric') || columnType.includes('decimal')) {
            if (columnName.includes('price') || columnName.includes('amount') || columnName.includes('cost')) {
                suggestions[column.name] = {
                    min: 1,
                    max: 1000,
                    precision: 2,
                    description: 'Price/amount field'
                };
            } else if (columnName.includes('age')) {
                suggestions[column.name] = {
                    min: 18,
                    max: 80,
                    description: 'Age field'
                };
            } else if (columnName.includes('year')) {
                suggestions[column.name] = {
                    min: 2000,
                    max: new Date().getFullYear(),
                    description: 'Year field'
                };
            } else if (columnName.includes('quantity') || columnName.includes('count')) {
                suggestions[column.name] = {
                    min: 1,
                    max: 100,
                    description: 'Quantity/count field'
                };
            }
        }
        
        // String suggestions
        if (columnType.includes('varchar') || columnType.includes('text') || columnType.includes('char')) {
            if (columnName.includes('email')) {
                suggestions[column.name] = {
                    pattern: 'email',
                    description: 'Email address field'
                };
            } else if (columnName.includes('phone')) {
                suggestions[column.name] = {
                    pattern: 'phone',
                    description: 'Phone number field'
                };
            } else if (columnName.includes('url') || columnName.includes('website')) {
                suggestions[column.name] = {
                    pattern: 'url',
                    description: 'URL field'
                };
            } else if (columnName.includes('code') || columnName.includes('id')) {
                suggestions[column.name] = {
                    pattern: 'alphanumeric',
                    maxLength: 20,
                    description: 'Code/ID field'
                };
            }
        }
        
        // Date suggestions
        if (columnType.includes('timestamp') || columnType.includes('date')) {
            if (columnName.includes('created') || columnName.includes('registered')) {
                suggestions[column.name] = {
                    startDate: '2020-01-01',
                    endDate: new Date().toISOString().split('T')[0],
                    description: 'Creation/registration date'
                };
            } else if (columnName.includes('birth') || columnName.includes('dob')) {
                suggestions[column.name] = {
                    startDate: '1950-01-01',
                    endDate: '2005-12-31',
                    description: 'Birth date'
                };
            }
        }
    });
    
    return suggestions;
}