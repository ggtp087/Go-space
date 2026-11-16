-- users.email: unique ignoring case (data dictionary: unique index on
-- LOWER(email)), and stored lowercased. Idempotent; schema app only.
BEGIN;

UPDATE app.users SET email = lower(email) WHERE email <> lower(email);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON app.users (lower(email));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'users_email_lowercase_chk' AND conrelid = 'app.users'::regclass
  ) THEN
    ALTER TABLE app.users ADD CONSTRAINT users_email_lowercase_chk CHECK (email = lower(email));
  END IF;
END $$;

COMMIT;
