-- CTO Assessor — colunas de revisão nas proposals
ALTER TABLE improvement_proposals
  ADD COLUMN IF NOT EXISTS assessor_status   text DEFAULT 'pending_review'
    CHECK (assessor_status IN ('pending_review','approved','rejected','needs_revision','validated')),
  ADD COLUMN IF NOT EXISTS assessor_score    numeric,         -- 0-10
  ADD COLUMN IF NOT EXISTS assessor_feedback text,
  ADD COLUMN IF NOT EXISTS assessor_tags     text[],
  ADD COLUMN IF NOT EXISTS revision_count    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz;

-- Index para o assessor consultar proposals pendentes de revisão
CREATE INDEX IF NOT EXISTS idx_proposals_assessor ON improvement_proposals(assessor_status, validation_status, created_at DESC);
