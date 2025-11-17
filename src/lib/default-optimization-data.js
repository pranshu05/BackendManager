const BASE_QUERY_PERFORMANCE = [
    { name: 'SELECT with JOIN', time: 245, count: 156 },
    { name: 'GROUP BY query', time: 180, count: 89 },
    { name: 'Simple SELECT', time: 45, count: 342 },
    { name: 'INSERT operations', time: 120, count: 67 }
];

const BASE_MISSING_INDEXES = [
    {
        tableName: 'employees',
        columnName: 'department_id',
        scanCount: 856,
        suggestion: 'CREATE INDEX idx_employees_department ON employees(department_id);',
        severity: 'HIGH',
        estimatedImprovement: '70%'
    }
];

const BASE_UNUSED_TABLES = [
    { tableName: 'temp_session_2023', rowCount: 0, lastUsed: '342 days ago' },
    { tableName: 'old_analytics', rowCount: 0, lastUsed: '215 days ago' },
    { tableName: 'backup_users_v1', rowCount: 142, lastUsed: '89 days ago' }
];

const BASE_DUPLICATE_RECORDS = [
    { tableName: 'department_no', columnName: 'pno', duplicateCount: 23, suggestedAction: 'Merge by pno' },
    { tableName: 'employee_id', columnName: 'ename', duplicateCount: 8, suggestedAction: 'Merge by ename' },
    { tableName: 'salary', columnName: 'employee_id', duplicateCount: 15, suggestedAction: 'Merge by employee_id' }
];

export function getDefaultOptimizationData() {
    return {
        totalSuggestions: BASE_MISSING_INDEXES.length + BASE_UNUSED_TABLES.length + BASE_DUPLICATE_RECORDS.length,
        queryPerformance: BASE_QUERY_PERFORMANCE.map(item => ({ ...item })),
        missingIndexes: BASE_MISSING_INDEXES.map(item => ({ ...item })),
        unusedTables: BASE_UNUSED_TABLES.map(item => ({ ...item })),
        duplicateRecords: BASE_DUPLICATE_RECORDS.map(item => ({ ...item }))
    };
}

