-- Drop the Treasury_Rule table as we've moved to unified Chat-as-Rule-Storage architecture
-- Treasury rules are now stored directly in the Chat table

-- Drop any indexes first (if they exist)
DROP INDEX IF EXISTS "idx_treasury_rule_user_active";
DROP INDEX IF EXISTS "idx_treasury_rule_deleted_at";

-- Drop the Treasury_Rule table
DROP TABLE IF EXISTS "Treasury_Rule";