import { executeQuery, pool } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';
import { getDefaultOptimizationData } from '@/lib/default-optimization-data';

const NEON_OPTIMIZATION_API_URL = process.env.NEON_OPTIMIZATION_API_URL?.trim();
const NEON_OPTIMIZATION_API_TIMEOUT = Number(process.env.NEON_OPTIMIZATION_API_TIMEOUT ?? 8000);
const FALLBACK_ROW_THRESHOLD = Number(process.env.OPTIMIZATION_ROW_THRESHOLD ?? 100);
const ACTION_TO_SUGGESTION = {
    create_index: 'missing_index',
    remove_table: 'unused_table',
    remove_duplicates: 'duplicate_records'
};

export const GET = withProjectAuth(async (request, context, user, project) => {
    try {
        const { projectId } = await context.params;
        const connectionString = project.connection_string;

        // Attempt to fetch optimization insights from Neon API if configured
        const neonOptimization = await fetchNeonOptimizationData(projectId, project);

        if (neonOptimization) {
            return NextResponse.json({
                success: true,
                source: 'neon-api',
                ...neonOptimization
            });
        }

        const databaseOptimization = await buildDatabaseOptimizationData(connectionString);

        if (databaseOptimization) {
            return NextResponse.json({
                success: true,
                source: 'database',
                ...databaseOptimization
            });
        }

    } catch (error) {
        console.error('Optimization fetch error:', error);
    }

    return NextResponse.json(
        {
            success: true,
            source: 'fallback',
            warning: 'Failed to fetch live optimization data. Showing default recommendations.',
            ...getDefaultOptimizationData()
        },
        { status: 200 }
    );
});

export const POST = withProjectAuth(async (request, context, user, project) => {
    try {
        const { projectId } = await context.params;
        const body = await request.json();
        const { action, targetTable, targetColumn, duplicateIds } = body;

        const connectionString = project.connection_string;

        let result;

        switch (action) {
            case 'create_index':
                result = await createIndex(connectionString, projectId, targetTable, targetColumn);
                break;
            
            case 'remove_table':
                result = await removeTable(connectionString, projectId, targetTable);
                break;
            
            case 'remove_duplicates':
                result = await removeDuplicates(connectionString, projectId, targetTable, targetColumn, duplicateIds);
                break;
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

        await markSuggestionResolved(projectId, ACTION_TO_SUGGESTION[action]);

        return NextResponse.json({
            success: true,
            action,
            result,
            message: `Optimization applied successfully for ${targetTable}`
        });

    } catch (error) {
        console.error('Optimization action error:', error);
        return NextResponse.json(
            { error: 'Failed to apply optimization', details: error.message },
            { status: 500 }
        );
    }
});

// Helper functions
function getDefaultQueryPerformance() {
    return [
        { name: 'SELECT with JOIN', time: 245, count: 156 },
        { name: 'GROUP BY query', time: 180, count: 89 },
        { name: 'Simple SELECT', time: 45, count: 342 },
        { name: 'INSERT operations', time: 120, count: 67 }
    ];
}

function formatLastAccessed(date) {
    if (!date) return 'Never';
    
    const now = new Date();
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    const diffTime = Math.abs(now - parsedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return `${diffDays} days ago`;
}

async function createIndex(connectionString, projectId, tableName, columnName) {
    try {
        const sanitizedTable = quoteIdentifier(tableName);
        const sanitizedColumn = quoteIdentifier(columnName);
        const indexName = `idx_${tableName}_${columnName}`;
        
        await executeQuery(
            connectionString,
            `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(indexName)} ON ${sanitizedTable}(${sanitizedColumn})`
        );

        await executeQuery(connectionString, `ANALYZE ${sanitizedTable}`);

        await logOptimizationAction({
            projectId,
            action: 'create_index',
            tableName,
            columnName,
            status: 'success'
        });

        return {
            indexName,
            tableName,
            columnName,
            status: 'created'
        };
    } catch (error) {
        console.error('Index creation error:', error);
        throw error;
    }
}

async function removeTable(connectionString, projectId, tableName) {
    try {
        const sanitizedTable = quoteIdentifier(tableName);
        const tableDataResult = await executeQuery(
            connectionString,
            `SELECT COUNT(*) as row_count FROM ${sanitizedTable}`
        );

        const tableData = tableDataResult?.rows ?? [];

        await executeQuery(
            connectionString,
            `DROP TABLE IF EXISTS ${sanitizedTable} CASCADE`
        );

        await logOptimizationAction({
            projectId,
            action: 'remove_table',
            tableName,
            recordsAffected: Number(tableData[0]?.row_count || 0),
            status: 'success'
        });

        return {
            tableName,
            rowsRemoved: tableData[0]?.row_count || 0,
            status: 'removed'
        };
    } catch (error) {
        console.error('Table removal error:', error);
        throw error;
    }
}

async function removeDuplicates(connectionString, projectId, tableName, columnName, duplicateIds) {
    try {
        let deletedCount = 0;

        const sanitizedTable = quoteIdentifier(tableName);
        const sanitizedColumn = quoteIdentifier(columnName);

        if (duplicateIds && duplicateIds.length > 0) {
            const placeholders = duplicateIds.map((_, i) => `$${i + 1}`).join(',');
            await executeQuery(
                connectionString,
                `DELETE FROM ${sanitizedTable} WHERE id IN (${placeholders})`,
                duplicateIds
            );
            deletedCount = duplicateIds.length;
        } else {
            const result = await executeQuery(
                connectionString,
                `
                WITH duplicates AS (
                    SELECT ctid
                    FROM (
                        SELECT 
                            ctid,
                            ROW_NUMBER() OVER (
                                PARTITION BY ${sanitizedColumn}
                                ORDER BY ctid
                            ) AS rn
                        FROM ${sanitizedTable}
                        WHERE ${sanitizedColumn} IS NOT NULL
                    ) ranked
                    WHERE rn > 1
                )
                DELETE FROM ${sanitizedTable}
                USING duplicates
                WHERE ${sanitizedTable}.ctid = duplicates.ctid
                RETURNING 1
                `
            );
            deletedCount = result?.rowCount ?? 0;
        }

        await executeQuery(connectionString, `ANALYZE ${sanitizedTable}`);

        await logOptimizationAction({
            projectId,
            action: 'remove_duplicates',
            tableName,
            columnName,
            recordsAffected: deletedCount,
            status: 'success'
        });

        return {
            tableName,
            columnName,
            duplicatesRemoved: deletedCount,
            status: 'removed'
        };
    } catch (error) {
        console.error('Duplicate removal error:', error);
        throw error;
    }
}

// Helper to suppress missing-table errors
async function safeExecuteQuery(connectionString, query, params = []) {
    try {
        const result = await executeQuery(connectionString, query, params);
        return result?.rows ?? [];
    } catch (error) {
        if (isMissingRelationError(error)) {
            console.warn('Optimization table missing, continuing with partial data:', error.message);
            return [];
        }
        throw error;
    }
}

function isMissingRelationError(error) {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('does not exist') && message.includes('relation');
}

function buildNeonOptimizationUrl(projectId, project) {
    if (!NEON_OPTIMIZATION_API_URL) return null;

    try {
        if (NEON_OPTIMIZATION_API_URL.includes('{')) {
            return NEON_OPTIMIZATION_API_URL
                .replace(/\{projectId\}/g, encodeURIComponent(projectId ?? ''))
                .replace(/\{databaseName\}/g, encodeURIComponent(project?.database_name ?? ''))
                .replace(/\{neonProjectId\}/g, encodeURIComponent(process.env.NEON_PROJECT_ID ?? ''))
                .replace(/\{branchId\}/g, encodeURIComponent(process.env.NEON_BRANCH_ID ?? ''));
        }

        const url = new URL(NEON_OPTIMIZATION_API_URL);

        if (projectId && !url.searchParams.has('projectId')) {
            url.searchParams.set('projectId', projectId);
        }

        if (project?.database_name && !url.searchParams.has('databaseName')) {
            url.searchParams.set('databaseName', project.database_name);
        }

        if (!url.searchParams.has('neonProjectId') && process.env.NEON_PROJECT_ID) {
            url.searchParams.set('neonProjectId', process.env.NEON_PROJECT_ID);
        }

        if (!url.searchParams.has('branchId') && process.env.NEON_BRANCH_ID) {
            url.searchParams.set('branchId', process.env.NEON_BRANCH_ID);
        }

        return url.toString();
    } catch (error) {
        console.error('Failed to construct Neon optimization API URL:', error);
        return null;
    }
}

async function fetchNeonOptimizationData(projectId, project) {
    const url = buildNeonOptimizationUrl(projectId, project);
    if (!url) {
        return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NEON_OPTIMIZATION_API_TIMEOUT);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': process.env.NEON_API_KEY ? `Bearer ${process.env.NEON_API_KEY}` : undefined,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            cache: 'no-store',
            signal: controller.signal
        });

        if (!response.ok) {
            console.warn(`Neon optimization API responded with ${response.status}`);
            return null;
        }

        const payload = await response.json();
        return normalizeNeonOptimizationPayload(payload);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Neon optimization API request timed out');
            return null;
        }

        console.warn('Failed to fetch Neon optimization data:', error?.message || error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

function normalizeNeonOptimizationPayload(payload) {
    if (!payload) return null;

    const data = payload.data ?? payload;

    if (!data) return null;

    const queryPerformance = (data.queryPerformance ?? data.query_performance ?? []).map(item => ({
        name: item.name ?? item.query_type ?? 'Query',
        time: Math.round(item.time ?? item.avg_time ?? 0),
        count: item.count ?? item.calls ?? 0
    }));

    const missingIndexes = (data.missingIndexes ?? data.missing_indexes ?? []).map(item => ({
        tableName: item.tableName ?? item.table_name,
        columnName: item.columnName ?? item.column_name,
        scanCount: item.scanCount ?? item.scan_count ?? 0,
        suggestion: item.suggestion ?? item.recommendation ?? '',
        severity: item.severity ?? 'HIGH',
        estimatedImprovement: item.estimatedImprovement ?? '60%'
    })).filter(item => item.tableName && item.columnName);

    const unusedTablesRaw = data.unusedTables ?? data.unused_tables ?? [];
    const unusedTables = unusedTablesRaw.map(item => ({
        tableName: item.tableName ?? item.table_name,
        rowCount: item.rowCount ?? item.row_count ?? 0,
        lastUsed: item.lastUsed ?? item.last_used ?? item.last_accessed_at ?? null
    })).filter(item => item.tableName);

    const duplicateRecords = (data.duplicateRecords ?? data.duplicate_records ?? []).map(item => ({
        tableName: item.tableName ?? item.table_name,
        columnName: item.columnName ?? item.column_name,
        duplicateCount: item.duplicateCount ?? item.duplicate_count ?? 0,
        suggestedAction: item.suggestedAction ?? item.suggested_action ?? ''
    })).filter(item => item.tableName);

    const totalSuggestions = data.totalSuggestions 
        ?? (missingIndexes.length + unusedTables.length + duplicateRecords.length);

    return {
        totalSuggestions,
        queryPerformance: queryPerformance.length > 0 ? queryPerformance : getDefaultQueryPerformance(),
        missingIndexes,
        unusedTables: unusedTables.map(row => ({
            ...row,
            lastUsed: row.lastUsed ? formatLastAccessed(row.lastUsed) : 'Never'
        })),
        duplicateRecords
    };
}

async function buildDatabaseOptimizationData(connectionString) {
    try {
        const [
            queryPerformance,
            missingIndexes,
            unusedTables,
            duplicateRecords
        ] = await Promise.all([
            getQueryPerformance(connectionString),
            getMissingIndexes(connectionString),
            getUnusedTables(connectionString),
            getDuplicateRecords(connectionString)
        ]);

        const totalSuggestions = missingIndexes.length + unusedTables.length + duplicateRecords.length;

        return {
            totalSuggestions,
            queryPerformance: queryPerformance.length > 0 ? queryPerformance : getDefaultQueryPerformance(),
            missingIndexes,
            unusedTables,
            duplicateRecords
        };
    } catch (error) {
        console.error('Database optimization analysis failed:', error);
        return null;
    }
}

async function getQueryPerformance(connectionString) {
    const result = [];

    if (await hasRelation(connectionString, 'pg_stat_statements')) {
        const pgStatResults = await safeExecuteQuery(
            connectionString,
            `
            SELECT 
                CASE
                    WHEN upper(query) LIKE 'SELECT%' THEN 'SELECT'
                    WHEN upper(query) LIKE 'INSERT%' THEN 'INSERT'
                    WHEN upper(query) LIKE 'UPDATE%' THEN 'UPDATE'
                    WHEN upper(query) LIKE 'DELETE%' THEN 'DELETE'
                    ELSE 'OTHER'
                END as query_type,
                AVG(total_time / NULLIF(calls, 0)) AS avg_time,
                SUM(calls) AS count
            FROM pg_stat_statements
            GROUP BY query_type
            ORDER BY avg_time DESC NULLS LAST
            LIMIT 4
            `
        );

        pgStatResults.forEach(row => {
            result.push({
                name: row.query_type || 'Other',
                time: Math.round(row.avg_time || 0),
                count: Number(row.count) || 0
            });
        });
    }

    if (result.length === 0 && await hasRelation(connectionString, 'public.query_logs')) {
        const queryLogsResults = await safeExecuteQuery(
            connectionString,
            `SELECT 
                query_type,
                AVG(CAST(execution_time AS FLOAT)) as avg_time,
                COUNT(*) as count
            FROM query_logs 
            GROUP BY query_type
            ORDER BY avg_time DESC
            LIMIT 4`
        );

        queryLogsResults.forEach(row => {
            result.push({
                name: row.query_type || 'Other',
                time: Math.round(row.avg_time || 0),
                count: row.count
            });
        });
    }

    return result;
}

async function getMissingIndexes(connectionString) {
    const candidateTables = await safeExecuteQuery(
        connectionString,
        `
        SELECT 
            psut.relname AS table_name,
            psut.seq_scan,
            psut.idx_scan,
            psut.n_live_tup
        FROM pg_stat_user_tables psut
        WHERE psut.schemaname = 'public'
        ORDER BY psut.seq_scan DESC
        LIMIT 15
        `
    );

    const fallbackTables = candidateTables.length > 0
        ? []
        : await safeExecuteQuery(
            connectionString,
            `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
            `
        );

    const tablesToInspect = candidateTables.length > 0
        ? candidateTables
        : fallbackTables.map(table => ({
            table_name: table.table_name,
            seq_scan: FALLBACK_ROW_THRESHOLD + 1,
            idx_scan: 0,
            n_live_tup: FALLBACK_ROW_THRESHOLD + 1
        }));

    const suggestions = [];

    for (const table of tablesToInspect) {
        const rowEstimate = Number(table.n_live_tup) || 0;
        if (rowEstimate < FALLBACK_ROW_THRESHOLD) {
            continue;
        }

        if (table.idx_scan != null && table.seq_scan <= (table.idx_scan || 0) * 2) {
            continue;
        }

        const column = await getFirstNonPkColumn(connectionString, table.table_name);
        if (!column) continue;

        const alreadyIndexed = await tableHasIndex(connectionString, table.table_name, column);
        if (alreadyIndexed) {
            continue;
        }

        suggestions.push({
            tableName: table.table_name,
            columnName: column,
            scanCount: Number(table.seq_scan) || 0,
            suggestion: `CREATE INDEX idx_${table.table_name}_${column} ON "${table.table_name}"("${column}");`,
            severity: 'HIGH',
            estimatedImprovement: '60%'
        });

        if (suggestions.length >= 5) break;
    }

    return suggestions;
}

async function getFirstNonPkColumn(connectionString, tableName) {
    const columns = await safeExecuteQuery(
        connectionString,
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position
        `,
        [tableName]
    );

    const pkColumns = await safeExecuteQuery(
        connectionString,
        `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_name = kcu.table_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = $1
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
        `,
        [tableName]
    );

    const pkSet = new Set(pkColumns.map(col => col.column_name));

    const candidate = columns.find(col => !pkSet.has(col.column_name));
    return candidate?.column_name ?? columns[0]?.column_name ?? null;
}

async function getUnusedTables(connectionString) {
    const tables = await safeExecuteQuery(
        connectionString,
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
        `
    );

    if (tables.length === 0) return [];

    const stats = await safeExecuteQuery(
        connectionString,
        `
        SELECT 
            relname AS table_name,
            coalesce(n_live_tup, 0) AS row_count,
            GREATEST(
                COALESCE(last_vacuum, to_timestamp(0)),
                COALESCE(last_autovacuum, to_timestamp(0)),
                COALESCE(last_analyze, to_timestamp(0)),
                COALESCE(last_autoanalyze, to_timestamp(0))
            ) AS last_activity
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        `
    );

    const statMap = new Map(stats.map(row => [row.table_name, row]));
    const unusedTables = [];

    for (const table of tables) {
        const tableName = table.table_name;
        const meta = statMap.get(tableName);
        let rowCount = meta?.row_count != null ? Number(meta.row_count) : null;

        if (rowCount === null || rowCount === 0) {
            const countResult = await safeExecuteQuery(
                connectionString,
                `SELECT COUNT(*)::int AS row_count FROM ${quoteIdentifier(tableName)}`
            );
            rowCount = Number(countResult[0]?.row_count ?? 0);
        }

        if (rowCount === 0) {
            unusedTables.push({
                tableName,
                rowCount: 0,
                lastUsed: meta?.last_activity ? formatLastAccessed(meta.last_activity) : 'Never'
            });
        }
    }

    return unusedTables;
}

async function getDuplicateRecords(connectionString) {
    const tables = await safeExecuteQuery(
        connectionString,
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
        `
    );

    const duplicates = [];

    for (const table of tables) {
        if (duplicates.length >= 5) break;

        const columns = await safeExecuteQuery(
            connectionString,
            `
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1
            AND data_type IN ('character varying', 'text', 'citext', 'uuid', 'integer', 'bigint', 'numeric')
            ORDER BY ordinal_position
            LIMIT 3
            `,
            [table.table_name]
        );

        for (const column of columns) {
            const duplicateResult = await safeExecuteQuery(
                connectionString,
                `
                SELECT COALESCE(SUM(cnt - 1), 0) AS duplicate_count
                FROM (
                    SELECT COUNT(*) AS cnt
                    FROM ${quoteIdentifier(table.table_name)}
                    WHERE ${quoteIdentifier(column.column_name)} IS NOT NULL
                    GROUP BY ${quoteIdentifier(column.column_name)}
                    HAVING COUNT(*) > 1
                ) duplicates
                `
            );

            const duplicateCount = Number(duplicateResult[0]?.duplicate_count ?? 0);
            if (duplicateCount > 0) {
                duplicates.push({
                    tableName: table.table_name,
                    columnName: column.column_name,
                    duplicateCount,
                    suggestedAction: `Review duplicates in "${column.column_name}" and apply cleanup`
                });
                break;
            }
        }
    }

    return duplicates;
}

async function tableHasIndex(connectionString, tableName, columnName) {
    const indexes = await safeExecuteQuery(
        connectionString,
        `
        SELECT indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = $1
        `,
        [tableName]
    );

    const normalizedColumn = `"${columnName}"`.toLowerCase();
    return indexes.some(index => index.indexdef?.toLowerCase().includes(normalizedColumn));
}

async function markSuggestionResolved(projectId, suggestionType) {
    if (!suggestionType) return;
    try {
        await pool.query(
            `UPDATE optimization_suggestions 
             SET is_resolved = true, resolved_at = NOW()
             WHERE project_id = $1 AND suggestion_type = $2`,
            [projectId, suggestionType]
        );
    } catch (error) {
        console.warn('Failed to mark suggestion resolved:', error?.message || error);
    }
}

async function logOptimizationAction({ projectId, action, tableName = null, columnName = null, recordsAffected = null, status = 'success', errorMessage = null }) {
    try {
        await pool.query(
            `INSERT INTO optimization_logs (project_id, action, table_name, column_name, records_affected, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [projectId, action, tableName, columnName, recordsAffected, status, errorMessage]
        );
    } catch (error) {
        console.warn('Failed to log optimization action:', error?.message || error);
    }
}

async function hasRelation(connectionString, relationName) {
    try {
        const result = await safeExecuteQuery(
            connectionString,
            `SELECT to_regclass($1) as relation`,
            [relationName]
        );
        return Boolean(result[0]?.relation);
    } catch {
        return false;
    }
}

function quoteIdentifier(identifier) {
    if (!identifier) return '';
    return `"${identifier.replace(/"/g, '""')}"`;
}