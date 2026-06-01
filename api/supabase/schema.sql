-- ─── Workflows ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  name                TEXT        NOT NULL,
  type                TEXT        NOT NULL CHECK (type IN ('keyword', 'creator')),
  keyword             TEXT        NOT NULL DEFAULT '',
  creator_name        TEXT        NOT NULL DEFAULT '',
  creator_url         TEXT        NOT NULL DEFAULT '',
  creator_identifier  TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at         TIMESTAMPTZ,
  comments_generated  INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows (user_id);

-- ─── Workflow Comments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_comments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id           UUID        NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
  post_id               TEXT        NOT NULL,
  post_text             TEXT        NOT NULL DEFAULT '',
  post_author           TEXT        NOT NULL DEFAULT '',
  post_author_headline  TEXT        NOT NULL DEFAULT '',
  post_url              TEXT,
  comment_text          TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved', 'posted', 'failed')),
  scheduled_at          TIMESTAMPTZ,
  posted_at             TIMESTAMPTZ,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_workflow_id ON workflow_comments (workflow_id);
CREATE INDEX IF NOT EXISTS idx_comments_status      ON workflow_comments (status);
