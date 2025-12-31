-- 019_remove_notify_self_replies.sql
-- Remove notify_self_replies column as it's no longer used
-- The bot now always skips notifications when users reply to their own webhook messages

-- Remove from instagram_embed_config
ALTER TABLE instagram_embed_config
DROP COLUMN IF EXISTS notify_self_replies;

-- Remove from twitter_embed_config
ALTER TABLE twitter_embed_config
DROP COLUMN IF EXISTS notify_self_replies;