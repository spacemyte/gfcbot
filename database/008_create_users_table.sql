-- Migration 008: Create users table for Discord user ID and username
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY, -- Discord user ID
    username TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);