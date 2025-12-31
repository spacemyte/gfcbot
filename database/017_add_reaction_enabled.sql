-- 017_add_reaction_enabled.sql
-- Add reaction_enabled toggle for embed configs

ALTER TABLE instagram_embed_config
ADD COLUMN reaction_enabled BOOLEAN DEFAULT true;

ALTER TABLE twitter_embed_config
ADD COLUMN reaction_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN instagram_embed_config.reaction_enabled IS 'Enable reacting to already-embedded URLs';

COMMENT ON COLUMN twitter_embed_config.reaction_enabled IS 'Enable reacting to already-embedded URLs';