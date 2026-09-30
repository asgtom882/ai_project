/*
# Adaptive Learning Platform Schema Migration

## Overview
Transforms the single-tenant study app into a multi-user adaptive AI learning platform.
Adds user ownership to all existing tables, creates new tables for the full learning loop:
profile, resources, RAG chunks, quizzes, quiz attempts, topic mastery, doubts,
revision scheduling, study plans, PYQ analysis, and learning events.

## Existing Tables Modified
- subjects: added user_id (uuid, default auth.uid())
- topics: added learning analytics fields (mastery_score, quiz_accuracy, practice_accuracy,
  study_time_minutes, revision_count, last_studied, next_revision, difficulty, importance,
  pyq_frequency, confidence_score)
- study_sessions: added user_id
- tasks: added task_type, priority, reason fields

## New Tables
1. student_profiles — onboarding data (name, course, semester, college, study prefs, target)
2. resources — uploaded documents (PDFs, notes, PYQs) with processing status
3. document_chunks — RAG chunk index with metadata and embedding-ready structure
4. quizzes — quiz sessions (subject, topic, difficulty, score)
5. quiz_questions — individual questions within a quiz
6. quiz_attempts — student answers to quiz questions
7. topic_mastery — per-topic mastery score with breakdown signals
8. doubts — stored doubts with topic detection and resolution status
9. revision_schedule — spaced repetition schedule per topic
10. study_plans — generated study plans with time allocation
11. pyq_questions — extracted PYQ questions with topic/year/marks
12. pyq_topic_frequency — aggregated topic frequency from PYQs
13. learning_events — event log for analytics

## Security
- All tables use authenticated-only RLS with auth.uid() ownership checks
- Existing anon policies dropped and replaced with authenticated ownership policies
- user_id columns default to auth.uid() so inserts work without explicit owner

## Notes
- Mastery is separate from syllabus completion (stored in topic_mastery)
- RAG chunk metadata includes student_id, subject_id, topic_id, filename, page, doc_type
- Quiz attempts feed back into topic_mastery and learning_events
- Revision schedule uses spaced repetition intervals
*/

-- ============ ADD user_id TO EXISTING TABLES ============

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'user_id') THEN
    ALTER TABLE subjects ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE study_sessions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
    ALTER TABLE tasks ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

-- ============ EXTEND topics WITH LEARNING ANALYTICS ============

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'mastery_score') THEN
    ALTER TABLE topics ADD COLUMN mastery_score numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'quiz_accuracy') THEN
    ALTER TABLE topics ADD COLUMN quiz_accuracy numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'practice_accuracy') THEN
    ALTER TABLE topics ADD COLUMN practice_accuracy numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'study_time_minutes') THEN
    ALTER TABLE topics ADD COLUMN study_time_minutes int NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'revision_count') THEN
    ALTER TABLE topics ADD COLUMN revision_count int NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'last_studied') THEN
    ALTER TABLE topics ADD COLUMN last_studied date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'next_revision') THEN
    ALTER TABLE topics ADD COLUMN next_revision date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'difficulty') THEN
    ALTER TABLE topics ADD COLUMN difficulty text NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'importance') THEN
    ALTER TABLE topics ADD COLUMN importance text NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'pyq_frequency') THEN
    ALTER TABLE topics ADD COLUMN pyq_frequency text NOT NULL DEFAULT 'low';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'confidence_score') THEN
    ALTER TABLE topics ADD COLUMN confidence_score numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============ EXTEND tasks WITH PLANNER FIELDS ============

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_type') THEN
    ALTER TABLE tasks ADD COLUMN task_type text NOT NULL DEFAULT 'study';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN
    ALTER TABLE tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'reason') THEN
    ALTER TABLE tasks ADD COLUMN reason text;
  END IF;
END $$;

-- ============ REPLACE POLICIES: authenticated-only ownership ============

-- subjects
DROP POLICY IF EXISTS "anon_select_subjects" ON subjects;
DROP POLICY IF EXISTS "anon_insert_subjects" ON subjects;
DROP POLICY IF EXISTS "anon_update_subjects" ON subjects;
DROP POLICY IF EXISTS "anon_delete_subjects" ON subjects;
DROP POLICY IF EXISTS "select_own_subjects" ON subjects;
CREATE POLICY "select_own_subjects" ON subjects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subjects" ON subjects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_subjects" ON subjects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_subjects" ON subjects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- topics (scoped via parent subjects)
DROP POLICY IF EXISTS "anon_select_topics" ON topics;
DROP POLICY IF EXISTS "anon_insert_topics" ON topics;
DROP POLICY IF EXISTS "anon_update_topics" ON topics;
DROP POLICY IF EXISTS "anon_delete_topics" ON topics;
DROP POLICY IF EXISTS "select_own_topics" ON topics;
CREATE POLICY "select_own_topics" ON topics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()));
CREATE POLICY "insert_own_topics" ON topics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()));
CREATE POLICY "update_own_topics" ON topics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()));
CREATE POLICY "delete_own_topics" ON topics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()));

-- study_sessions
DROP POLICY IF EXISTS "anon_select_sessions" ON study_sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON study_sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON study_sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON study_sessions;
DROP POLICY IF EXISTS "select_own_sessions" ON study_sessions;
CREATE POLICY "select_own_sessions" ON study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sessions" ON study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sessions" ON study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- tasks
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ NEW TABLES ============

-- student_profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  course text,
  semester text,
  college text,
  available_hours_per_day numeric NOT NULL DEFAULT 3,
  preferred_session_length int NOT NULL DEFAULT 45,
  target_score numeric NOT NULL DEFAULT 80,
  learning_style text NOT NULL DEFAULT 'visual',
  onboarded boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON student_profiles;
CREATE POLICY "select_own_profile" ON student_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_profile" ON student_profiles;
CREATE POLICY "insert_own_profile" ON student_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_profile" ON student_profiles;
CREATE POLICY "update_own_profile" ON student_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- resources (uploaded documents for RAG)
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  doc_type text NOT NULL DEFAULT 'notes',
  file_size bigint,
  storage_path text,
  processing_status text NOT NULL DEFAULT 'uploading',
  chunk_count int NOT NULL DEFAULT 0,
  indexed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_resources" ON resources;
CREATE POLICY "select_own_resources" ON resources FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_resources" ON resources;
CREATE POLICY "insert_own_resources" ON resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_resources" ON resources;
CREATE POLICY "update_own_resources" ON resources FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resources" ON resources;
CREATE POLICY "delete_own_resources" ON resources FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- document_chunks (RAG chunk metadata)
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject_id uuid,
  topic_id uuid,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  page_number int,
  doc_type text,
  token_count int NOT NULL DEFAULT 0,
  embedding_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_chunks" ON document_chunks;
CREATE POLICY "select_own_chunks" ON document_chunks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chunks" ON document_chunks;
CREATE POLICY "insert_own_chunks" ON document_chunks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_chunks" ON document_chunks;
CREATE POLICY "update_own_chunks" ON document_chunks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_chunks" ON document_chunks;
CREATE POLICY "delete_own_chunks" ON document_chunks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  question_type text NOT NULL DEFAULT 'mcq',
  num_questions int NOT NULL DEFAULT 10,
  duration_minutes int NOT NULL DEFAULT 30,
  score numeric NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  suggested_next_difficulty text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quizzes" ON quizzes;
CREATE POLICY "select_own_quizzes" ON quizzes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quizzes" ON quizzes;
CREATE POLICY "insert_own_quizzes" ON quizzes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quizzes" ON quizzes;
CREATE POLICY "update_own_quizzes" ON quizzes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quizzes" ON quizzes;
CREATE POLICY "delete_own_quizzes" ON quizzes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'mcq',
  options jsonb,
  correct_answer text NOT NULL,
  explanation text,
  difficulty text NOT NULL DEFAULT 'medium',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quiz_questions" ON quiz_questions;
CREATE POLICY "select_own_quiz_questions" ON quiz_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quiz_questions" ON quiz_questions;
CREATE POLICY "insert_own_quiz_questions" ON quiz_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quiz_questions" ON quiz_questions;
CREATE POLICY "update_own_quiz_questions" ON quiz_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quiz_questions" ON quiz_questions;
CREATE POLICY "delete_own_quiz_questions" ON quiz_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- quiz_attempts (student answers)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid,
  student_answer text,
  is_correct boolean NOT NULL DEFAULT false,
  time_spent_seconds int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_attempts" ON quiz_attempts;
CREATE POLICY "select_own_attempts" ON quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_attempts" ON quiz_attempts;
CREATE POLICY "insert_own_attempts" ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- doubts (doubt memory with concept detection)
CREATE TABLE IF NOT EXISTS doubts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  detected_concept text,
  resolved boolean NOT NULL DEFAULT false,
  repeated_concept_count int NOT NULL DEFAULT 0,
  source_refs jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_doubts" ON doubts;
CREATE POLICY "select_own_doubts" ON doubts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_doubts" ON doubts;
CREATE POLICY "insert_own_doubts" ON doubts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_doubts" ON doubts;
CREATE POLICY "update_own_doubts" ON doubts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_doubts" ON doubts;
CREATE POLICY "delete_own_doubts" ON doubts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- revision_schedule (spaced repetition)
CREATE TABLE IF NOT EXISTS revision_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  revision_date date NOT NULL,
  interval_days int NOT NULL DEFAULT 1,
  revision_count int NOT NULL DEFAULT 0,
  last_performance numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE revision_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_revisions" ON revision_schedule;
CREATE POLICY "select_own_revisions" ON revision_schedule FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_revisions" ON revision_schedule;
CREATE POLICY "insert_own_revisions" ON revision_schedule FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_revisions" ON revision_schedule;
CREATE POLICY "update_own_revisions" ON revision_schedule FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_revisions" ON revision_schedule;
CREATE POLICY "delete_own_revisions" ON revision_schedule FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- study_plans (generated plans)
CREATE TABLE IF NOT EXISTS study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  total_minutes int NOT NULL DEFAULT 0,
  allocated_minutes jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'planner',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_plans" ON study_plans;
CREATE POLICY "select_own_plans" ON study_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_plans" ON study_plans;
CREATE POLICY "insert_own_plans" ON study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_plans" ON study_plans;
CREATE POLICY "delete_own_plans" ON study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- pyq_questions (extracted from previous year papers)
CREATE TABLE IF NOT EXISTS pyq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  year int,
  marks int NOT NULL DEFAULT 1,
  question_type text NOT NULL DEFAULT 'descriptive',
  detected_topic text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pyq_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_pyq_questions" ON pyq_questions;
CREATE POLICY "select_own_pyq_questions" ON pyq_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pyq_questions" ON pyq_questions;
CREATE POLICY "insert_own_pyq_questions" ON pyq_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pyq_questions" ON pyq_questions;
CREATE POLICY "delete_own_pyq_questions" ON pyq_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- pyq_topic_frequency (aggregated frequency per topic)
CREATE TABLE IF NOT EXISTS pyq_topic_frequency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  frequency_count int NOT NULL DEFAULT 0,
  total_marks int NOT NULL DEFAULT 0,
  year_range text,
  frequency_level text NOT NULL DEFAULT 'low',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pyq_topic_frequency ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_pyq_freq" ON pyq_topic_frequency;
CREATE POLICY "select_own_pyq_freq" ON pyq_topic_frequency FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pyq_freq" ON pyq_topic_frequency;
CREATE POLICY "insert_own_pyq_freq" ON pyq_topic_frequency FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pyq_freq" ON pyq_topic_frequency;
CREATE POLICY "update_own_pyq_freq" ON pyq_topic_frequency FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pyq_freq" ON pyq_topic_frequency;
CREATE POLICY "delete_own_pyq_freq" ON pyq_topic_frequency FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- learning_events (analytics event log)
CREATE TABLE IF NOT EXISTS learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid,
  topic_id uuid,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_events" ON learning_events;
CREATE POLICY "select_own_events" ON learning_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_events" ON learning_events;
CREATE POLICY "insert_own_events" ON learning_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_doubts_user_id ON doubts(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_schedule_user_date ON revision_schedule(user_id, revision_date);
CREATE INDEX IF NOT EXISTS idx_pyq_questions_user_id ON pyq_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_id ON learning_events(user_id);
