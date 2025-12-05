-- Create bot_settings table to store global bot configuration
CREATE TABLE IF NOT EXISTS bot_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Insert default bot status
INSERT INTO
    bot_settings (key, value)
VALUES (
        'bot_status',
        'Currently freeing your Instagram links'
    ) ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_settings_key ON bot_settings (key);