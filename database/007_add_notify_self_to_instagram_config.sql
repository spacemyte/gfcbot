-- 007_add_notify_self_to_instagram_config.sql
-- Add options for webhook reply notifications

ALTER TABLE instagram_embed_config
ADD COLUMN webhook_reply_notifications BOOLEAN DEFAULT true;

ALTER TABLE instagram_embed_config
ADD COLUMN notify_self_replies BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN instagram_embed_config.webhook_reply_notifications IS 'If true, enable webhook reply notifications overall';
COMMENT ON COLUMN instagram_embed_config.notify_self_replies IS 'If true, notify user when they reply to their own webhook-reposted message';