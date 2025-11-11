import { NextResponse } from "next/server";
import { withProjectAuth } from "@/lib/api-helpers";
import { executeQuery, getDatabaseSchema } from "@/lib/db";


function convertToCSV(allData, projectName) {
    const csvRows = [];
    
    // Add project name as header
    csvRows.push(`Project: ${projectName}`);
    csvRows.push('Export Date: ' + new Date().toLocaleString());
    csvRows.push(''); // Blank line after project info
    
    // Process each table
    for (const [tableName, data] of Object.entries(allData)) {
        // Add a separator line
        csvRows.push('='.repeat(100));
        csvRows.push(`Table: ${tableName}`);
        csvRows.push('='.repeat(100));
        
        if (!data || data.length === 0) {
            csvRows.push('No data available');
            csvRows.push(''); // blank line after empty table
            continue;
        }
        
        // Add column headers with proper formatting
        const headers = Object.keys(data[0]);
        csvRows.push(headers.map(header => `"${header}"`).join(','));
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                const val = row[header];
                // Handle null values, quotes, and commas in the data
                if (val === null || val === undefined) return '""';
                const cellValue = String(val).replace(/"/g, '""');
                return `"${cellValue}"`; // Wrap in quotes to handle special characters
            });
            csvRows.push(values.join(','));
        });
        
        // Add blank line after each table
        csvRows.push('');
    }
    
    return csvRows.join('\n');
}

export const GET = withProjectAuth(async (request, _context, user, project) => {
    try {
        const format = request.nextUrl.searchParams.get("format") || "json";
        
        // Get schema information
        const schemaInfo = await getDatabaseSchema(project.connection_string);
        const tables = schemaInfo.map(t => t.name);
        console.log("Tables available for export:", tables);
        
        // Fetch data from all tables
        const allData = {};
        for (const table_name of tables) {
            console.log("Fetching data for table:", table_name);
            try {
                const { rows } = await executeQuery(project.connection_string, `SELECT * FROM "${table_name}"`);
                allData[table_name] = rows;
            } catch(err) {
                console.error(`Error fetching data for table ${table_name}:`, err);
                continue; 
            }
        }

            if (format.toLowerCase() === "csv") {
                const csvData = convertToCSV(allData, project.project_name);
                const fileName = `${project.project_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_database_export_${new Date().toISOString().split('T')[0]}.csv`;
                
                return new NextResponse(csvData, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="${fileName}"`,
                    },
                });
            } else {
                // JSON format
                return NextResponse.json(allData);
            }
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});