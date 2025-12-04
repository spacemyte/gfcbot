-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_features_updated_at
    BEFORE UPDATE ON features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_permissions_updated_at
    BEFORE UPDATE ON feature_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_embed_configs_updated_at
    BEFORE UPDATE ON embed_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pruning_config_updated_at
    BEFORE UPDATE ON pruning_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check permission inheritance (delete > manage > read)
CREATE OR REPLACE FUNCTION check_permission(
    p_server_id BIGINT,
    p_role_ids BIGINT[],
    p_feature_name VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    feature_uuid UUID;
BEGIN
    -- Get feature ID
    SELECT id INTO feature_uuid FROM features WHERE name = p_feature_name AND active = true;
    
    IF feature_uuid IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check for permission with inheritance
    SELECT EXISTS (
        SELECT 1 FROM feature_permissions fp
        WHERE fp.server_id = p_server_id
        AND fp.role_id = ANY(p_role_ids)
        AND fp.feature_id = feature_uuid
        AND (
            (p_action = 'read' AND (fp.actions->>'read' = 'true' OR fp.actions->>'manage' = 'true' OR fp.actions->>'delete' = 'true'))
            OR (p_action = 'manage' AND (fp.actions->>'manage' = 'true' OR fp.actions->>'delete' = 'true'))
            OR (p_action = 'delete' AND fp.actions->>'delete' = 'true')
        )
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;