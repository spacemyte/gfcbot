-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Features table
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Feature permissions table with inheritance model
CREATE TABLE feature_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    actions JSONB NOT NULL DEFAULT '{"read": false, "manage": false, "delete": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, role_id, feature_id)
);

CREATE INDEX idx_feature_permissions_server_role ON feature_permissions (server_id, role_id);

CREATE INDEX idx_feature_permissions_feature ON feature_permissions (feature_id);

-- Embed configurations table with priority ordering
CREATE TABLE embed_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    server_id BIGINT NOT NULL,
    feature_id UUID NOT NULL REFERENCES features (id) ON DELETE CASCADE,
    prefix VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        UNIQUE (server_id, prefix)
);

CREATE INDEX idx_embed_configs_server_priority ON embed_configs (server_id, priority ASC);

CREATE INDEX idx_embed_configs_feature ON embed_configs (feature_id);

-- Message data table for tracking URL transformations
CREATE TABLE message_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    message_id BIGINT NOT NULL UNIQUE,
    channel_id BIGINT NOT NULL,
    server_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    original_url TEXT NOT NULL,
    embedded_url TEXT,
    embed_prefix_used VARCHAR(50),
    validation_status VARCHAR(20) NOT NULL,
    validation_error TEXT,
    checked_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_data_server ON message_data (server_id);

CREATE INDEX idx_message_data_created_at ON message_data (created_at DESC);

CREATE INDEX idx_message_data_user ON message_data (user_id);

CREATE INDEX idx_message_data_status ON message_data (validation_status);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    server_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_server ON audit_logs (server_id);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp DESC);

CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);

-- Pruning configuration table
CREATE TABLE pruning_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    server_id BIGINT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    max_days INTEGER DEFAULT 90 CHECK (
        max_days > 0
        AND max_days <= 90
    ),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pruning_config_server ON pruning_config (server_id);

-- Insert default Instagram embed feature
INSERT INTO
    features (name, description, active)
VALUES (
        'instagram_embed',
        'Automatically embed Instagram URLs with configurable prefixes',
        true
    );