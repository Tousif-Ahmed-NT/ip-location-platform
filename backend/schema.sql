-- Table for storing IP geolocation data
CREATE TABLE IF NOT EXISTS ip_locations (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    accuracy_radius INTEGER, -- in meters
    confidence_score DECIMAL(5, 2), -- 0.00 to 100.00
    source VARCHAR(255), -- e.g., 'MaxMind', 'ipinfo', 'active_probe'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing geolocation request events and metadata
CREATE TABLE IF NOT EXISTS geolocation_events (
    id SERIAL PRIMARY KEY,
    request_id UUID DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_latitude DECIMAL(9, 6),
    resolved_longitude DECIMAL(9, 6),
    resolved_accuracy_radius INTEGER,
    resolved_confidence_score DECIMAL(5, 2),
    user_agent TEXT,
    referer TEXT,
    api_key_id INTEGER, -- Foreign key to an API keys table (if implemented)
    response_time_ms INTEGER
);

-- Index for faster lookups by IP address
CREATE INDEX IF NOT EXISTS idx_ip_locations_ip_address ON ip_locations (ip_address);
CREATE INDEX IF NOT EXISTS idx_geolocation_events_ip_address ON geolocation_events (ip_address);

