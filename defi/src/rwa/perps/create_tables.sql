-- PostgreSQL script to create RWA Perps data tables
-- Tables: daily_rwa_perps_data, hourly_rwa_perps_data, backup_rwa_perps_data, meta_rwa_perps_data, funding_history

-- Create daily_rwa_perps_data table
CREATE TABLE IF NOT EXISTS daily_rwa_perps_data (
    timestamp INTEGER NOT NULL,
    timestamp_actual INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    open_interest DECIMAL,
    volume_24h DECIMAL,
    price DECIMAL,
    price_change_24h DECIMAL,
    funding_rate DECIMAL,
    premium DECIMAL,
    cumulative_funding DECIMAL,
    data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (timestamp, id)
);

CREATE INDEX IF NOT EXISTS daily_rwa_perps_id_index ON daily_rwa_perps_data(id);
CREATE INDEX IF NOT EXISTS daily_rwa_perps_timestamp_index ON daily_rwa_perps_data(timestamp);
CREATE INDEX IF NOT EXISTS daily_rwa_perps_updated_at_index ON daily_rwa_perps_data(updated_at);

-- Create hourly_rwa_perps_data table
CREATE TABLE IF NOT EXISTS hourly_rwa_perps_data (
    timestamp INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    open_interest DECIMAL,
    volume_24h DECIMAL,
    price DECIMAL,
    price_change_24h DECIMAL,
    funding_rate DECIMAL,
    premium DECIMAL,
    cumulative_funding DECIMAL,
    data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (timestamp, id)
);

CREATE INDEX IF NOT EXISTS hourly_rwa_perps_id_index ON hourly_rwa_perps_data(id);
CREATE INDEX IF NOT EXISTS hourly_rwa_perps_timestamp_index ON hourly_rwa_perps_data(timestamp);
CREATE INDEX IF NOT EXISTS hourly_rwa_perps_updated_at_index ON hourly_rwa_perps_data(updated_at);

-- Create backup_rwa_perps_data table
CREATE TABLE IF NOT EXISTS backup_rwa_perps_data (
    timestamp INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    open_interest DECIMAL,
    volume_24h DECIMAL,
    price DECIMAL,
    price_change_24h DECIMAL,
    funding_rate DECIMAL,
    premium DECIMAL,
    cumulative_funding DECIMAL,
    data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (timestamp, id)
);

CREATE INDEX IF NOT EXISTS backup_rwa_perps_id_index ON backup_rwa_perps_data(id);
CREATE INDEX IF NOT EXISTS backup_rwa_perps_timestamp_index ON backup_rwa_perps_data(timestamp);
CREATE INDEX IF NOT EXISTS backup_rwa_perps_updated_at_index ON backup_rwa_perps_data(updated_at);

-- Create meta_rwa_perps_data table (static metadata per market)
CREATE TABLE IF NOT EXISTS meta_rwa_perps_data (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meta_rwa_perps_id_index ON meta_rwa_perps_data(id);
CREATE INDEX IF NOT EXISTS meta_rwa_perps_updated_at_index ON meta_rwa_perps_data(updated_at);

-- Create funding_history table (per-interval funding snapshots for accumulation)
-- Note: `coin` is a legacy storage column name for the canonical perps contract key.
CREATE TABLE IF NOT EXISTS rwa_perps_funding_history (
    timestamp INTEGER NOT NULL,
    id VARCHAR(255) NOT NULL,
    coin VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    funding_rate DECIMAL,
    premium DECIMAL,
    open_interest DECIMAL,
    funding_payment DECIMAL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (timestamp, id)
);

CREATE INDEX IF NOT EXISTS funding_history_id_index ON rwa_perps_funding_history(id);
CREATE INDEX IF NOT EXISTS funding_history_coin_index ON rwa_perps_funding_history(coin);
CREATE INDEX IF NOT EXISTS funding_history_timestamp_index ON rwa_perps_funding_history(timestamp);
