-- Optional planning data, never inferred from billing or creation timestamps.
ALTER TABLE projects ADD COLUMN planned_start_at INTEGER CHECK(planned_start_at IS NULL OR (typeof(planned_start_at)='integer' AND planned_start_at>=0 AND planned_start_at<=8640000000000000));
ALTER TABLE projects ADD COLUMN planned_end_at INTEGER CHECK(planned_end_at IS NULL OR (typeof(planned_end_at)='integer' AND planned_end_at>=0 AND planned_end_at<=8640000000000000 AND (planned_start_at IS NULL OR planned_end_at>=planned_start_at)));
CREATE INDEX clients_unmanaged_normalized_email ON clients(lower(trim(email))) WHERE access_managed=0;
