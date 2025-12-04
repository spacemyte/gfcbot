-- 005_instagram_embed_config.sql
-- Per-server config for Instagram embed feature, including webhook repost and pruning

CREATE TABLE instagram_embed_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    server_id BIGINT NOT NULL UNIQUE,
    webhook_repost_enabled BOOLEAN DEFAULT false,
    pruning_enabled BOOLEAN DEFAULT true,
    pruning_max_days INTEGER DEFAULT 90 CHECK (
        pruning_max_days > 0
        AND pruning_max_days <= 90
    ),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instagram_embed_config_server ON instagram_embed_config (server_id);