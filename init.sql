-- Optional initialization script for PostgreSQL
-- This file runs automatically when the container starts for the first time

-- Database will be created automatically by Docker environment variables
-- User will be created automatically by Docker environment variables

-- Create any additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_air_quality_timestamp ON air_quality_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_air_quality_device_id ON air_quality_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_air_quality_location ON air_quality_readings(latitude, longitude);