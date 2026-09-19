export type Subject = {
  id: string;
  name: string;
  color: string;
  target_hours: number;
  exam_date: string | null;
  created_at: string;
};

export type Topic = {
  id: string;
  subject_id: string;
  name: string;
  estimated_hours: number;
  status: 'not_started' | 'in_progress' | 'completed';
  order_index: number;
  created_at: string;
};

export type StudySession = {
  id: string;
  subject_id: string;
  topic_id: string | null;
  duration_minutes: number;
  studied_at: string;
  notes: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  description: string | null;
  estimated_minutes: number;
  due_date: string | null;
  status: 'pending' | 'completed' | 'skipped';
  source: 'ai' | 'manual';
  created_at: string;
};

export type SubjectWithProgress = Subject & {
  topics: Topic[];
  total_topics: number;
  completed_topics: number;
  in_progress_topics: number;
  studied_hours: number;
  progress_percent: number;
};
