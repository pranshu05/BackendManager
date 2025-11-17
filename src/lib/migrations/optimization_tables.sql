-- Create optimization_suggestions table
CREATE TABLE IF NOT EXISTS optimization_suggestions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(255),
    column_name VARCHAR(255),
    description TEXT,
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    scan_count INTEGER DEFAULT 0,
    suggestion TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create table_statistics table
CREATE TABLE IF NOT EXISTS table_statistics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    row_count INTEGER DEFAULT 0,
    size_mb DECIMAL(10, 2),
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create duplicate_analysis table
CREATE TABLE IF NOT EXISTS duplicate_analysis (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    duplicate_count INTEGER,
    suggested_action TEXT,
    last_analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create optimization_logs table
CREATE TABLE IF NOT EXISTS optimization_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(255),
    column_name VARCHAR(255),
    records_affected INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    executed_by INTEGER,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create query_logs table for performance tracking
CREATE TABLE IF NOT EXISTS query_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    query_type VARCHAR(50),
    execution_time INTEGER,
    query_text TEXT,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_optimization_suggestions_project ON optimization_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_table_statistics_project ON table_statistics(project_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_analysis_project ON duplicate_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_project ON optimization_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_project ON query_logs(project_id);
