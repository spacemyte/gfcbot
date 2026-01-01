-- 022_remove_restricted_warning_config.sql
-- Remove restricted content warning configuration columns

ALTER TABLE instagram_embed_config
DROP COLUMN silence_restricted_warning,
DROP COLUMN restricted_warning_message;

ALTER TABLE twitter_embed_config
DROP COLUMN silence_restricted_warning,
DROP COLUMN restricted_warning_message;