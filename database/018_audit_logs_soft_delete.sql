-- Add soft-delete column to audit_logs table
ALTER TABLE audit_logs
ADD COLUMN deleted_at TIMESTAMP
WITH
    TIME ZONE DEFAULT NULL;

CREATE INDEX idx_audit_logs_deleted_at ON audit_logs (deleted_at);

COMMENT ON COLUMN audit_logs.deleted_at IS 'Timestamp when the audit log was soft-deleted (NULL if not deleted)';