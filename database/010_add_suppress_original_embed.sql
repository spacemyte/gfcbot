-- Add suppress_original_embed option to instagram_embed_config
ALTER TABLE instagram_embed_config
ADD COLUMN IF NOT EXISTS suppress_original_embed BOOLEAN DEFAULT true;

COMMENT ON COLUMN instagram_embed_config.suppress_original_embed IS 'Whether to suppress the original message embed preview';