-- 021_add_restricted_warning_config.sql
-- Add columns to control restricted content warning behavior

ALTER TABLE instagram_embed_config
ADD COLUMN silence_restricted_warning BOOLEAN DEFAULT false,
ADD COLUMN restricted_warning_message VARCHAR(255) DEFAULT 'Cannot embed restricted content, please login to the original URL to view';

ALTER TABLE twitter_embed_config
ADD COLUMN silence_restricted_warning BOOLEAN DEFAULT false,
ADD COLUMN restricted_warning_message VARCHAR(255) DEFAULT 'Cannot embed restricted content, please login to the original URL to view';

COMMENT ON COLUMN instagram_embed_config.silence_restricted_warning IS 'If true, do not send warning message for restricted content';

COMMENT ON COLUMN instagram_embed_config.restricted_warning_message IS 'Custom message to send when restricted content is detected';

COMMENT ON COLUMN twitter_embed_config.silence_restricted_warning IS 'If true, do not send warning message for restricted content';

COMMENT ON COLUMN twitter_embed_config.restricted_warning_message IS 'Custom message to send when restricted content is detected';