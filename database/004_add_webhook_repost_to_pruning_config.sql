-- 004_add_webhook_repost_to_pruning_config.sql
-- Adds webhook_repost_enabled column to pruning_config for per-server Instagram repost mode

ALTER TABLE pruning_config
ADD COLUMN webhook_repost_enabled BOOLEAN DEFAULT false;