-- 015_embed_unique_per_feature.sql
-- Adjust embed_configs uniqueness to be per feature

-- Ensure embed_type has values
UPDATE embed_configs
SET
    embed_type = 'prefix'
WHERE
    embed_type IS NULL;

ALTER TABLE embed_configs ALTER COLUMN embed_type SET NOT NULL;

-- Drop old unique constraint (server_id, prefix) and replace with (server_id, feature_id, prefix)
ALTER TABLE embed_configs
DROP CONSTRAINT IF EXISTS embed_configs_server_id_prefix_key;

ALTER TABLE embed_configs
ADD CONSTRAINT embed_configs_server_feature_prefix_key UNIQUE (server_id, feature_id, prefix);