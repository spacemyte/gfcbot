-- 014_add_embed_config_type.sql
-- Add type column to embed_configs to distinguish between prefix and replacement modes

ALTER TABLE embed_configs
ADD COLUMN embed_type VARCHAR(20) DEFAULT 'prefix' CHECK (
    embed_type IN ('prefix', 'replacement')
);

-- Create index for querying by type
CREATE INDEX idx_embed_configs_type ON embed_configs (server_id, embed_type);