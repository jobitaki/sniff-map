-- PostgreSQL database setup for Sniff Pittsburgh
-- Run these commands to set up your database

-- Create database
CREATE DATABASE sniff_pittsburgh;

-- Create user (optional, you can use existing user)
CREATE USER sniff_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sniff_pittsburgh TO sniff_user;

-- Connect to the database
\c sniff_pittsburgh;

-- Create extension for better geospatial support (optional)
CREATE EXTENSION IF NOT EXISTS postgis;

-- The Flask app will automatically create the tables, but here's the schema for reference:

-- Air quality readings table (created automatically by SQLAlchemy)
-- CREATE TABLE air_quality_readings (
--     id SERIAL PRIMARY KEY,
--     device_id VARCHAR(50) NOT NULL,
--     latitude FLOAT NOT NULL,
--     longitude FLOAT NOT NULL,
--     timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
--     pm1_0 FLOAT,
--     pm2_5 FLOAT,
--     pm10 FLOAT,
--     nox FLOAT,
--     co2 FLOAT,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- Indexes for better performance (optional, add these after table creation)
-- CREATE INDEX idx_air_quality_timestamp ON air_quality_readings(timestamp);
-- CREATE INDEX idx_air_quality_device_id ON air_quality_readings(device_id);
-- CREATE INDEX idx_air_quality_location ON air_quality_readings(latitude, longitude);