-- Create channels table to store Discord channel names
CREATE TABLE IF NOT EXISTS channels (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels (name);