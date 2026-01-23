-- PostgreSQL script to create RWA data tables
-- Tables: daily_rwa_data, hourly_rwa_data, backup_rwa_data, meta_rwa_data

-- Create daily_rwa_data table
CREATE TABLE IF NOT EXISTS daily_rwa_data (
    timestamp INTEGER NOT NULL,
    timestamp_actual INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    defiactivetvl TEXT,
    mcap TEXT,
    activemcap TEXT,
    aggregatedefiactivetvl DECIMAL,
    aggregatemcap DECIMAL,
    aggregatedactivemcap DECIMAL,
    PRIMARY KEY (timestamp, id)
);

-- Create indexes for daily_rwa_data
CREATE INDEX IF NOT EXISTS daily_rwa_data_id_index ON daily_rwa_data(id);
CREATE INDEX IF NOT EXISTS daily_rwa_data_timestamp_index ON daily_rwa_data(timestamp);

-- Create hourly_rwa_data table
CREATE TABLE IF NOT EXISTS hourly_rwa_data (
    timestamp INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    defiactivetvl TEXT,
    mcap TEXT,
    activemcap TEXT,
    aggregatedefiactivetvl DECIMAL,
    aggregatemcap DECIMAL,
    aggregatedactivemcap DECIMAL,
    PRIMARY KEY (timestamp, id)
);

-- Create indexes for hourly_rwa_data
CREATE INDEX IF NOT EXISTS hourly_rwa_data_id_index ON hourly_rwa_data(id);
CREATE INDEX IF NOT EXISTS hourly_rwa_data_timestamp_index ON hourly_rwa_data(timestamp);

-- Create backup_rwa_data table
CREATE TABLE IF NOT EXISTS backup_rwa_data (
    timestamp INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    defiactivetvl TEXT,
    mcap TEXT,
    activemcap TEXT,
    aggregatedefiactivetvl DECIMAL,
    aggregatemcap DECIMAL,
    aggregatedactivemcap DECIMAL,
    PRIMARY KEY (timestamp, id)
);

-- Create indexes for backup_rwa_data
CREATE INDEX IF NOT EXISTS backup_rwa_data_id_index ON backup_rwa_data(id);
CREATE INDEX IF NOT EXISTS backup_rwa_data_timestamp_index ON backup_rwa_data(timestamp);

-- Create meta_rwa_data table
CREATE TABLE IF NOT EXISTS meta_rwa_data (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    data JSONB
);

-- Create index for meta_rwa_data
CREATE INDEX IF NOT EXISTS meta_rwa_id_index ON meta_rwa_data(id);

