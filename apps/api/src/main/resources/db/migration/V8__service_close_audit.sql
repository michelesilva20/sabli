ALTER TABLE table_services
  ADD COLUMN closed_by_user_id UUID,
  ADD COLUMN closed_by_name VARCHAR(160),
  ADD COLUMN close_reason VARCHAR(140),
  ADD COLUMN close_kind VARCHAR(20);

UPDATE table_services
SET
  close_kind = 'SETTLED',
  closed_by_user_id = opened_by_user_id,
  closed_by_name = COALESCE(NULLIF(btrim(host_name), ''), 'Sistema')
WHERE status = 'CLOSED'
  AND close_kind IS NULL;

ALTER TABLE table_services
  ADD CONSTRAINT table_services_close_kind_check
    CHECK (close_kind IS NULL OR close_kind IN ('SETTLED', 'EMPTY')),
  ADD CONSTRAINT table_services_close_audit_check
    CHECK (
      (
        status = 'CLOSED'
        AND close_kind IS NOT NULL
        AND closed_by_user_id IS NOT NULL
        AND closed_by_name IS NOT NULL
        AND (close_kind <> 'EMPTY' OR (close_reason IS NOT NULL AND length(trim(close_reason)) >= 3))
      )
      OR (
        status IN ('OPEN', 'AWAITING_BILL')
        AND close_kind IS NULL
        AND closed_by_user_id IS NULL
        AND closed_by_name IS NULL
        AND close_reason IS NULL
      )
    ),
  ADD CONSTRAINT table_services_closed_by_fk
    FOREIGN KEY (closed_by_user_id) REFERENCES users (id);
