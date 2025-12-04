-- Add webhook_message_id column to track reposted messages
ALTER TABLE message_data ADD COLUMN webhook_message_id BIGINT;

-- Add index for webhook message lookups
CREATE INDEX idx_message_data_webhook_message ON message_data (webhook_message_id);

-- Add comment
COMMENT ON COLUMN message_data.webhook_message_id IS 'ID of the webhook message if the original was reposted via webhook';