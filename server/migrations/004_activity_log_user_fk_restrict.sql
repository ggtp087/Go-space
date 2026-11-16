-- Activity log rows are kept for audit, so a user who has log entries cannot
-- be deleted: user_activity_logs.user_id -> users becomes ON DELETE RESTRICT
-- (was SET NULL, which also conflicted with the user-or-email CHECK from 002,
-- which stays as it is). Idempotent: only rebuilds the FK when it isn't
-- RESTRICT already.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'app.user_activity_logs'::regclass
       AND conname = 'user_activity_logs_user_id_fkey'
       AND contype = 'f'
       AND confdeltype = 'r'
  ) THEN
    ALTER TABLE app.user_activity_logs DROP CONSTRAINT IF EXISTS user_activity_logs_user_id_fkey;
    ALTER TABLE app.user_activity_logs
      ADD CONSTRAINT user_activity_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES app.users (user_id) ON DELETE RESTRICT;
  END IF;
END
$$;

COMMIT;
