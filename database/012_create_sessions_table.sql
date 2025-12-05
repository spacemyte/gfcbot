-- Create sessions table for persistent session storage
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index on expire for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);