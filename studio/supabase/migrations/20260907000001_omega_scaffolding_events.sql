-- ─────────────────────────────────────────────────────────────────────────────
-- Omega Scaffolding Outcome Telemetry
--
-- Records one row per chat turn (Socratic mode only) so we can measure:
--   - Whether Intensive scaffolding actually improves mastery over time
--   - The average number of turns to promote from Intensive → Guided → Independent
--   - Correlation between hints_used / consecutive_wrong and answer quality
--
-- This is append-only. Rows are never updated or deleted.
-- Analysis queries run against this table in read-only analytics views.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS omega_scaffolding_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competency_code   text        NOT NULL,
  session_id        uuid,       -- chat_sessions.id, nullable (dev/anon sessions)
  scaffolding       text        NOT NULL CHECK (scaffolding IN ('Independent', 'Guided', 'Intensive')),
  mastery_pct       smallint    NOT NULL CHECK (mastery_pct BETWEEN 0 AND 100),
  answer_quality    text        NOT NULL CHECK (answer_quality IN ('correct', 'incorrect', 'partial', 'unanswered')),
  hints_used        smallint    NOT NULL DEFAULT 0,
  consecutive_wrong smallint    NOT NULL DEFAULT 0,
  frustration_signal boolean    NOT NULL DEFAULT FALSE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE omega_scaffolding_events IS
  'One row per chat turn. Tracks the scaffolding level the Omega engine chose '
  'and the outcome so we can measure whether scaffolding calibration is correct.';

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Fast per-student aggregation (mastery trend over time)
CREATE INDEX IF NOT EXISTS idx_omega_events_user_competency_time
  ON omega_scaffolding_events (user_id, competency_code, created_at DESC);

-- Fast scaffolding-level outcome queries (e.g. "avg mastery gain after Intensive")
CREATE INDEX IF NOT EXISTS idx_omega_events_scaffolding_quality
  ON omega_scaffolding_events (scaffolding, answer_quality, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE omega_scaffolding_events ENABLE ROW LEVEL SECURITY;

-- Students can only see their own rows
CREATE POLICY "omega_events_student_select"
  ON omega_scaffolding_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role (backend) may insert — no direct client writes
CREATE POLICY "omega_events_service_insert"
  ON omega_scaffolding_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── Analytics view (teachers / admins) ───────────────────────────────────────

CREATE OR REPLACE VIEW omega_scaffolding_summary AS
SELECT
  competency_code,
  scaffolding,
  answer_quality,
  COUNT(*)                              AS turn_count,
  ROUND(AVG(mastery_pct), 1)           AS avg_mastery_pct,
  ROUND(AVG(hints_used), 2)            AS avg_hints_used,
  ROUND(AVG(consecutive_wrong), 2)     AS avg_consecutive_wrong,
  SUM(CASE WHEN frustration_signal THEN 1 ELSE 0 END) AS frustrated_count
FROM omega_scaffolding_events
GROUP BY competency_code, scaffolding, answer_quality;

COMMENT ON VIEW omega_scaffolding_summary IS
  'Aggregated scaffolding outcome metrics per competency. '
  'Used to verify Omega threshold calibration (40%/80% boundaries).';
