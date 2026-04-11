-- MedMind v2: personal memory, self-learning RAG, error classification

-- User saved content (mnemonics, poems, images, plans)
CREATE TABLE IF NOT EXISTS user_saved_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('mnemonic', 'poem', 'image', 'explanation', 'learning_plan', 'tip')),
  specialty text,
  topic text NOT NULL,
  question_context text,
  content_ru text NOT NULL,
  image_url text,
  metadata jsonb DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_content_user ON user_saved_content(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_content_topic ON user_saved_content(user_id, topic);

ALTER TABLE user_saved_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved content" ON user_saved_content
  FOR ALL USING (auth.uid() = user_id);

-- Error classification on answers
ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS error_type text
  CHECK (error_type IS NULL OR error_type IN ('gap', 'distractor', 'careless', 'tactical'));
ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS error_explanation text;

-- Self-learning RAG facts
CREATE TABLE IF NOT EXISTS learned_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  specialty text,
  content text NOT NULL,
  source text NOT NULL,
  confidence numeric(3,2) DEFAULT 0.50,
  verified boolean DEFAULT false,
  wiki_page_path text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learned_topic ON learned_facts(topic);

-- Weekly digests
CREATE TABLE IF NOT EXISTS weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  cards_attempted int DEFAULT 0,
  cards_correct int DEFAULT 0,
  accuracy_pct numeric(5,2),
  streak_maintained boolean DEFAULT false,
  topics_studied text[] DEFAULT '{}',
  weak_topics text[] DEFAULT '{}',
  improved_topics text[] DEFAULT '{}',
  ai_insights text,
  ai_recommendations text[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own digests" ON weekly_digests
  FOR SELECT USING (auth.uid() = user_id);

-- Proactive notifications setting
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medmind_proactive boolean DEFAULT true;

-- Wiki pages for scalable RAG (future use)
CREATE TABLE IF NOT EXISTS wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  specialty text,
  tags text[] DEFAULT '{}',
  tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wiki_tsv ON wiki_pages USING gin(tsv);
