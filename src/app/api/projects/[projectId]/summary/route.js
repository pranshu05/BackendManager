import { NextResponse } from 'next/server';
import { withProjectAuth } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';
import { getDatabaseSchema, executeQuery } from '@/lib/db';
import { generateDatabaseSummary } from '@/lib/ai';

export const GET = withRateLimit(
    withProjectAuth(async (request, _context, user, project) => {
        try {
            const schema = await getDatabaseSchema(project.connection_string);

            //if DB is empty
            if (schema.length === 0) {
                return NextResponse.json({
                    summary: {
                        quickStats: {
                            totalTables: 0,
                            totalColumns: 0,
                            totalRelationships: 0,
                            estimatedRows: "0 records"
                        },
                        description: "This database is currently empty with no tables created yet.\n\nTo get started, create tables to organize data and establish structure. Once tables are added, relationships can be defined between them.\n\nAfter tables are created and populated with data, come back here to see a comprehensive summary.",
                        techSpecs: "PostgreSQL database. No schema defined."
                    }
                });
            }

            // counting rows
            const statistics = {};
            for (const table of schema) {
                try {
                    const result = await executeQuery(
                        project.connection_string, 
                        `SELECT COUNT(*) as count FROM "${table.name}"`
                    );
                    statistics[table.name] = parseInt(result.rows[0].count, 10);
                }catch(error){
                    statistics[table.name] = 0;
                }
            }

            //if table but no data
            const totalRows = Object.values(statistics).reduce((sum, count) => sum + count, 0);
            if (totalRows === 0) {
                return NextResponse.json({
                    summary: {
                        quickStats: {
                            totalTables: schema.length,
                            totalColumns: schema.reduce((sum, t) => sum + t.columns.length, 0),
                            totalRelationships: schema.flatMap(t => t.columns.filter(c => c.foreign_table)).length,
                            estimatedRows: "0 records"
                        },
                        description: `Database structure is set up with ${schema.length} tables but contains no data yet.\n\nThe schema includes tables like ${schema.slice(0, 3).map(t => t.name).join(', ')}. All tables are currently empty and ready to receive data.\n\nOnce data is inserted, a comprehensive summary with insights will be available.`,
                        techSpecs: `PostgreSQL database with ${schema.length} empty tables. Schema defined, awaiting data.`
                    }
                });
            }

            // generating summary through AI
            const summary = await generateDatabaseSummary(schema, statistics, project.project_name);
            return NextResponse.json({ summary });

        } catch(error){
            console.error('Summary error:', error);
            return NextResponse.json(
                { error: 'Failed to generate summary', details: error.message },
                { status: 500 }
            );
        }
    }),
    { isAI: true }
);