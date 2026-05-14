-- Quiz sessions: anonymous per-device cumulative stats
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     text        NOT NULL UNIQUE,
  user_id        uuid,  -- reserved for future login support
  streak         int         NOT NULL DEFAULT 0,
  best_streak    int         NOT NULL DEFAULT 0,
  total_correct  int         NOT NULL DEFAULT 0,
  total_answered int         NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Quiz answers: per-question log (for analytics / future leaderboard)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text        NOT NULL,
  country_code text        NOT NULL,
  difficulty   text        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_correct   boolean     NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_session_id ON quiz_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id  ON quiz_answers  (session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_country     ON quiz_answers  (country_code);

-- RLS (no sensitive data; anon key has full access via API routes)
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_quiz_sessions" ON quiz_sessions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_quiz_answers" ON quiz_answers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Explicit grants required for Data API access (enforced from Oct 30, 2026)
GRANT SELECT, INSERT, UPDATE ON public.quiz_sessions TO anon;
GRANT SELECT, INSERT ON public.quiz_answers TO anon;
