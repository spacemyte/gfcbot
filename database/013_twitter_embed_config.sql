-- 013_twitter_embed_config.sql
-- Per-server config for Twitter/X embed feature

CREATE TABLE twitter_embed_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    server_id BIGINT NOT NULL UNIQUE,
    webhook_repost_enabled BOOLEAN DEFAULT false,
    pruning_enabled BOOLEAN DEFAULT true,
    pruning_max_days INTEGER DEFAULT 90 CHECK (
        pruning_max_days > 0
        AND pruning_max_days <= 90
    ),
    webhook_reply_notifications BOOLEAN DEFAULT true,
    notify_self_replies BOOLEAN DEFAULT false,
    suppress_original_embed BOOLEAN DEFAULT true,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_twitter_embed_config_server ON twitter_embed_config (server_id);