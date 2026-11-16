-- user_activity_logs: "CHECK: user_id or attempted_email must be present"
-- (data dictionary). Idempotent; schema app only.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'user_activity_logs_user_or_email_chk' AND conrelid = 'app.user_activity_logs'::regclass
  ) THEN
    ALTER TABLE app.user_activity_logs
      ADD CONSTRAINT user_activity_logs_user_or_email_chk CHECK (user_id IS NOT NULL OR attempted_email IS NOT NULL);
  END IF;
END $$;

COMMIT;
