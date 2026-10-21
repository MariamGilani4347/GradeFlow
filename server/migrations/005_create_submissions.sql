CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  ocr_text TEXT,
  cleaned_text TEXT,
  ai_score NUMERIC(5,2),
  ai_feedback TEXT,
  final_score NUMERIC(5,2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  flag_status VARCHAR(50),
  similarity_score NUMERIC(5,2),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ
);

CREATE INDEX idx_submissions_session ON submissions(session_id);
CREATE INDEX idx_submissions_status ON submissions(status);