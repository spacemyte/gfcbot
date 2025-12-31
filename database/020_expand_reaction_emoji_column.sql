-- 020_expand_reaction_emoji_column.sql
-- Expand reaction_emoji column to support longer custom emoji codes
-- Supports both unicode emojis and Discord emoji codes (e.g., :custom_emoji:)

ALTER TABLE instagram_embed_config
ALTER COLUMN reaction_emoji TYPE VARCHAR(100);

ALTER TABLE twitter_embed_config
ALTER COLUMN reaction_emoji TYPE VARCHAR(100);

COMMENT ON COLUMN instagram_embed_config.reaction_emoji IS 'Emoji to react with (unicode emoji or Discord code like :custom_emoji:)';

COMMENT ON COLUMN twitter_embed_config.reaction_emoji IS 'Emoji to react with (unicode emoji or Discord code like :custom_emoji:)';