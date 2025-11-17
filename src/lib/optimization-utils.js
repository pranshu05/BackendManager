import { executeQuery } from '@/lib/db';

/**
 * Analyze database for optimization opportunities
 */
export async function analyzeDatabase(connectionString, projectId, tableName) {
    const analysis = {
        missingIndexes: [],
        unusedTables: [],
        duplicateRecords: [],
        slowQueries: []
    };

    try {
        analysis.missingIndexes = await findMissingIndexes(connectionString, projectId, tableName);
        analysis.unusedTables = await findUnusedTables(connectionString, projectId);
        analysis.duplicateRecords = await findDuplicateRecords(connectionString, projectId, tableName);
        analysis.slowQueries = await findSlowQueries(connectionString, projectId);

        return analysis;
    } catch (error) {
        console.error('Database analysis error:', error);
        throw error;
    }
}

/**
 * Find tables without proper indexes
 */
async function findMissingIndexes(connectionString, projectId, tableName) {
    try {
        const result = await executeQuery(
            connectionString,
            `SELECT 
                table_name,
                column_name,
                scan_count
            FROM optimization_suggestions 
            WHERE project_id = $1 
            AND suggestion_type = 'missing_index'
            AND is_resolved = false
            ${tableName ? 'AND table_name = $2' : ''}
            ORDER BY scan_count DESC`,
            tableName ? [projectId, tableName] : [projectId]
        );

        return result?.rows ?? [];
    } catch (error) {
        console.error('Error finding missing indexes:', error);
        return [];
    }
}

/**
 * Find unused or empty tables
 */
async function findUnusedTables(connectionString, projectId) {
    try {
        const result = await executeQuery(
            connectionString,
            `SELECT 
                table_name,
                row_count,
                last_accessed_at
            FROM table_statistics 
            WHERE project_id = $1
            AND (row_count = 0 OR last_accessed_at < NOW() - INTERVAL '30 days')
            ORDER BY last_accessed_at ASC`,
            [projectId]
        );

        return result?.rows ?? [];
    } catch (error) {
        console.error('Error finding unused tables:', error);
        return [];
    }
}

/**
 * Find duplicate records in tables
 */
async function findDuplicateRecords(connectionString, projectId, tableName) {
    try {
        const result = await executeQuery(
            connectionString,
            `SELECT 
                table_name,
                column_name,
                duplicate_count,
                suggested_action
            FROM duplicate_analysis 
            WHERE project_id = $1
            AND duplicate_count > 0
            ${tableName ? 'AND table_name = $2' : ''}
            ORDER BY duplicate_count DESC`,
            tableName ? [projectId, tableName] : [projectId]
        );

        return result?.rows ?? [];
    } catch (error) {
        console.error('Error finding duplicate records:', error);
        return [];
    }
}

/**
 * Find slow performing queries
 */
async function findSlowQueries(connectionString, projectId) {
    try {
        const result = await executeQuery(
            connectionString,
            `SELECT 
                query_type,
                AVG(CAST(execution_time AS FLOAT)) as avg_time,
                MAX(execution_time) as max_time,
                COUNT(*) as query_count
            FROM query_logs 
            WHERE project_id = $1
            AND execution_time > 100
            GROUP BY query_type
            ORDER BY avg_time DESC
            LIMIT 10`,
            [projectId]
        );

        return result?.rows ?? [];
    } catch (error) {
        console.error('Error finding slow queries:', error);
        return [];
    }
}

/**
 * Get optimization recommendations
 */
export async function getOptimizationRecommendations(connectionString, projectId) {
    const recommendations = [];

    try {
        const analysis = await analyzeDatabase(connectionString, projectId);

        if (analysis.missingIndexes.length > 0) {
            recommendations.push({
                type: 'missing_indexes',
                count: analysis.missingIndexes.length,
                priority: 'high',
                message: `${analysis.missingIndexes.length} missing index(es) detected that could improve performance`,
                items: analysis.missingIndexes
            });
        }

        if (analysis.unusedTables.length > 0) {
            recommendations.push({
                type: 'unused_tables',
                count: analysis.unusedTables.length,
                priority: 'medium',
                message: `${analysis.unusedTables.length} unused or empty table(s) can be safely removed`,
                items: analysis.unusedTables
            });
        }

        if (analysis.duplicateRecords.length > 0) {
            recommendations.push({
                type: 'duplicate_records',
                count: analysis.duplicateRecords.length,
                priority: 'medium',
                message: `${analysis.duplicateRecords.length} table(s) contain duplicate records`,
                items: analysis.duplicateRecords
            });
        }

        if (analysis.slowQueries.length > 0) {
            recommendations.push({
                type: 'slow_queries',
                count: analysis.slowQueries.length,
                priority: 'high',
                message: `${analysis.slowQueries.length} slow query pattern(s) detected`,
                items: analysis.slowQueries
            });
        }

        return recommendations;
    } catch (error) {
        console.error('Error getting recommendations:', error);
        return [];
    }
}