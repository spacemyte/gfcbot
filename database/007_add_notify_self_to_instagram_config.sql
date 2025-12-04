-- 007_add_notify_self_to_instagram_config.sql
-- Add option to notify user even when they reply to their own webhook message

ALTER TABLE instagram_embed_config
ADD COLUMN notify_self_replies BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN instagram_embed_config.notify_self_replies IS 'If true, notify user when they reply to their own webhook-reposted message';
