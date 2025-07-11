-- Initialize Logsight Database
-- This script sets up the initial database structure and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension for geographical data (if needed)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom types
CREATE TYPE log_status AS ENUM ('uploaded', 'processing', 'ready', 'error');
CREATE TYPE anomaly_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE anomaly_type AS ENUM ('volume', 'behavioral', 'temporal', 'pattern');

-- Enable RLS (Row Level Security) for multi-tenancy (optional)
-- ALTER DATABASE logsight SET row_security = on;

-- Create indexes for performance (these will be created by SQLAlchemy as well)
-- Additional indexes for common query patterns

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO logsight;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO logsight;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO logsight;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO logsight;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO logsight;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO logsight;

-- Optimize PostgreSQL settings for log analysis workloads
-- These are suggestions and may need tuning based on actual usage

-- Increase work memory for complex queries
-- ALTER SYSTEM SET work_mem = '256MB';

-- Increase shared buffers for better caching
-- ALTER SYSTEM SET shared_buffers = '1GB';

-- Enable parallel query execution
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Optimize for log analysis patterns
-- ALTER SYSTEM SET effective_cache_size = '4GB';

-- Better statistics for query planning
-- ALTER SYSTEM SET default_statistics_target = 1000;

-- Note: The above settings require a PostgreSQL restart and should be
-- adjusted based on available system resources in production

-- Create a view for anomaly statistics (example)
-- This will be created by the application, but here's an example
/*
CREATE OR REPLACE VIEW anomaly_summary AS
SELECT 
    lf.id as log_file_id,
    lf.filename,
    COUNT(a.id) as total_anomalies,
    COUNT(CASE WHEN a.severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN a.severity = 'high' THEN 1 END) as high_count,
    COUNT(CASE WHEN a.severity = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN a.severity = 'low' THEN 1 END) as low_count,
    AVG(a.confidence) as avg_confidence,
    MIN(a.detected_at) as first_anomaly,
    MAX(a.detected_at) as last_anomaly
FROM log_files lf
LEFT JOIN anomalies a ON lf.id = a.log_id
GROUP BY lf.id, lf.filename;
*/

-- Create sample data for development (optional)
-- This would only run in development environment
DO $$
BEGIN
    -- Only create sample data if no users exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Will be created by SQLAlchemy
        NULL;
    END IF;
END $$; 