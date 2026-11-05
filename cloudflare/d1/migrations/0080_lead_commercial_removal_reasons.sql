-- Preserve the original constrained enum and every historical lead row.
-- Extended reasons use an additive key; legacy readers see the valid 'other'.
ALTER TABLE leads ADD COLUMN deletion_reason_key TEXT CHECK(deletion_reason_key IS NULL OR deletion_reason_key IN('duplicate','spam','test_entry','invalid_contact','withdrawn','outside_scope','other','changed_mind','unwilling_to_pay','requirements_not_met'));
