-- Enable Row Level Security on all tables
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE embed_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE message_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE pruning_config ENABLE ROW LEVEL SECURITY;

-- Features policies (public read, admin write)
CREATE POLICY "Public can view features" ON features FOR
SELECT USING (true);

CREATE POLICY "Service role can manage features" ON features FOR ALL USING (auth.role () = 'service_role');

-- Feature permissions policies
CREATE POLICY "Users can view permissions for their servers" ON feature_permissions FOR
SELECT USING (true);

CREATE POLICY "Service role can manage permissions" ON feature_permissions FOR ALL USING (auth.role () = 'service_role');

-- Embed configs policies
CREATE POLICY "Users can view embed configs" ON embed_configs FOR
SELECT USING (true);

CREATE POLICY "Service role can manage embed configs" ON embed_configs FOR ALL USING (auth.role () = 'service_role');

-- Message data policies
CREATE POLICY "Users can view message data for their servers" ON message_data FOR
SELECT USING (true);

CREATE POLICY "Service role can manage message data" ON message_data FOR ALL USING (auth.role () = 'service_role');

-- Audit logs policies
CREATE POLICY "Users can view audit logs for their servers" ON audit_logs FOR
SELECT USING (true);

CREATE POLICY "Service role can insert audit logs" ON audit_logs FOR
INSERT
WITH
    CHECK (auth.role () = 'service_role');

-- Pruning config policies
CREATE POLICY "Users can view pruning config" ON pruning_config FOR
SELECT USING (true);

CREATE POLICY "Service role can manage pruning config" ON pruning_config FOR ALL USING (auth.role () = 'service_role');