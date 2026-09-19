/*
# AI Student Management Schema

1. New Tables
- `subjects`: A subject the student is studying (e.g. "Mathematics").
  - id (uuid, pk)
  - name (text, not null)
  - color (text, default blue) — for UI theming per subject
  - target_hours (numeric) — total hours the student aims to study for this subject
  - exam_date (date, nullable) — upcoming exam date for time-to-complete calc
  - created_at (timestamptz)

- `topics`: A topic within a subject (the syllabus breakdown).
  - id (uuid, pk)
  - subject_id (uuid, fk -> subjects.id on delete cascade)
  - name (text, not null)
  - estimated_hours (numeric) — how long the topic is expected to take
  - status (text, default 'not_started') — not_started | in_progress | completed
  - order_index (int, default 0) — ordering within the subject
  - created_at (timestamptz)

- `study_sessions`: A logged study session (the "how much he studied" data).
  - id (uuid, pk)
  - subject_id (uuid, fk -> subjects.id on delete cascade)
  - topic_id (uuid, nullable, fk -> topics.id on delete set null)
  - duration_minutes (int, not null) — how long the session lasted
  - studied_at (date, not null) — the date the session happened
  - notes (text, nullable)
  - created_at (timestamptz)

- `tasks`: AI-generated or student-created daily tasks.
  - id (uuid, pk)
  - subject_id (uuid, nullable, fk -> subjects.id on delete cascade)
  - topic_id (uuid, nullable, fk -> topics.id on delete set null)
  - title (text, not null)
  - description (text, nullable)
  - estimated_minutes (int, default 30)
  - due_date (date, nullable)
  - status (text, default 'pending') — pending | completed | skipped
  - source (text, default 'ai') — ai | manual
  - created_at (timestamptz)

2. Security
- Enable RLS on all tables.
- Single-tenant (no sign-in): allow anon + authenticated full CRUD on all tables.
  The data is intentionally shared/public for this local study app.

3. Notes
- `study_sessions.studied_at` is a date (not timestamp) so daily aggregation is easy.
- `topics.status` drives the syllabus-completion percentage.
- `tasks.source` distinguishes AI-suggested tasks from manual ones.
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  target_hours numeric NOT NULL DEFAULT 20,
  exam_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
CREATE POLICY "anon_select_subjects" ON subjects FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
CREATE POLICY "anon_insert_subjects" ON subjects FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
CREATE POLICY "anon_update_subjects" ON subjects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
CREATE POLICY "anon_delete_subjects" ON subjects FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  estimated_hours numeric NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'not_started',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_topics" ON topics;
CREATE POLICY "anon_select_topics" ON topics FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_topics" ON topics;
CREATE POLICY "anon_insert_topics" ON topics FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_topics" ON topics;
CREATE POLICY "anon_update_topics" ON topics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_topics" ON topics;
CREATE POLICY "anon_delete_topics" ON topics FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  duration_minutes int NOT NULL,
  studied_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON study_sessions;
CREATE POLICY "anon_select_sessions" ON study_sessions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sessions" ON study_sessions;
CREATE POLICY "anon_insert_sessions" ON study_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sessions" ON study_sessions;
CREATE POLICY "anon_update_sessions" ON study_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sessions" ON study_sessions;
CREATE POLICY "anon_delete_sessions" ON study_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  estimated_minutes int NOT NULL DEFAULT 30,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'ai',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);
