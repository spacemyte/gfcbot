-- 016_add_reaction_emoji.sql
-- Add reaction_emoji column to instagram and twitter embed config tables

ALTER TABLE instagram_embed_config
ADD COLUMN reaction_emoji VARCHAR(10) DEFAULT '🙏';

ALTER TABLE twitter_embed_config
ADD COLUMN reaction_emoji VARCHAR(10) DEFAULT '🙏';

COMMENT ON COLUMN instagram_embed_config.reaction_emoji IS 'Emoji to react with when URL is already embedded (unicode emoji)';

COMMENT ON COLUMN twitter_embed_config.reaction_emoji IS 'Emoji to react with when URL is already embedded (unicode emoji)';