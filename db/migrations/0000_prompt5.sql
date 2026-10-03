-- Prompt 5 initial schema. drizzle-kit owns future migrations.
-- This checked-in SQL is intentionally explicit so a fresh Postgres can be
-- bootstrapped before a DATABASE_URL is available to the local CLI.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text,
  email text UNIQUE,
  email_verified timestamp,
  image text
);
CREATE TABLE IF NOT EXISTS accounts (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  PRIMARY KEY (provider, provider_account_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  session_token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamp NOT NULL,
  PRIMARY KEY (identifier, token)
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username varchar(20) NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name varchar(80),
  bio varchar(160),
  is_public boolean NOT NULL DEFAULT true,
  show_on_leaderboards boolean NOT NULL DEFAULT true,
  username_changed_at timestamp,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx ON profiles (lower(username));
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  length_type text NOT NULL CHECK (length_type IN ('time', 'words')),
  length_value integer NOT NULL CHECK (length_value > 0),
  difficulty text NOT NULL,
  punctuation boolean NOT NULL,
  numbers boolean NOT NULL,
  stop_on_error boolean NOT NULL,
  confidence_mode boolean NOT NULL,
  seed text NOT NULL,
  wpm numeric(8,2) NOT NULL CHECK (wpm >= 0),
  raw_wpm numeric(8,2) NOT NULL CHECK (raw_wpm >= 0),
  accuracy numeric(5,2) NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  consistency numeric(5,2) NOT NULL CHECK (consistency BETWEEN 0 AND 100),
  errors integer NOT NULL CHECK (errors >= 0),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  char_breakdown jsonb NOT NULL,
  wpm_series jsonb NOT NULL,
  keystroke_log jsonb,
  validation_status text NOT NULL DEFAULT 'valid',
  flag_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  eligible_for_leaderboard boolean NOT NULL DEFAULT false,
  is_daily boolean NOT NULL DEFAULT false,
  daily_date date,
  retry_of uuid,
  client_created_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tests_leaderboard_idx ON tests (validation_status, eligible_for_leaderboard, mode, length_type, length_value, difficulty, wpm DESC, created_at);
CREATE INDEX IF NOT EXISTS tests_user_created_idx ON tests (user_id, created_at);
CREATE TABLE IF NOT EXISTS personal_bests (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  wpm numeric(8,2) NOT NULL,
  accuracy numeric(5,2) NOT NULL,
  achieved_at timestamp NOT NULL,
  PRIMARY KEY (user_id, bucket)
);
CREATE INDEX IF NOT EXISTS personal_bests_board_idx ON personal_bests (bucket, wpm DESC, accuracy DESC, achieved_at ASC);
CREATE TABLE IF NOT EXISTS daily_results (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_date date NOT NULL,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  wpm numeric(8,2) NOT NULL,
  accuracy numeric(5,2) NOT NULL,
  PRIMARY KEY (user_id, daily_date)
);
CREATE INDEX IF NOT EXISTS daily_results_board_idx ON daily_results (daily_date, wpm DESC, accuracy DESC);
CREATE TABLE IF NOT EXISTS user_stats (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_tests integer NOT NULL DEFAULT 0,
  total_time_ms integer NOT NULL DEFAULT 0,
  best_wpm numeric(8,2) NOT NULL DEFAULT 0,
  avg_wpm_30d numeric(8,2) NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  ip_hash text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_bans (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  banned_at timestamp NOT NULL DEFAULT now(),
  lifted_at timestamp
);
