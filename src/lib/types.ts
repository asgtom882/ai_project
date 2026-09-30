// ============ EXISTING (EXTENDED) ============

export type Subject = {
  id: string;
  user_id: string;
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
  // learning analytics fields
  mastery_score: number;
  quiz_accuracy: number;
  practice_accuracy: number;
  study_time_minutes: number;
  revision_count: number;
  last_studied: string | null;
  next_revision: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  importance: 'low' | 'medium' | 'high';
  pyq_frequency: 'low' | 'medium' | 'high';
  confidence_score: number;
};

export type StudySession = {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  duration_minutes: number;
  studied_at: string;
  notes: string | null;
  created_at: string;
};

export type TaskType = 'study' | 'revision' | 'practice' | 'quiz' | 'doubt_review' | 'pyq_practice';
export type TaskPriority = 'high' | 'medium' | 'low';

export type Task = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  description: string | null;
  estimated_minutes: number;
  due_date: string | null;
  status: 'pending' | 'completed' | 'skipped';
  source: 'ai' | 'planner' | 'manual';
  task_type: TaskType;
  priority: TaskPriority;
  reason: string | null;
  created_at: string;
};

// ============ NEW TYPES ============

export type StudentProfile = {
  id: string;
  user_id: string;
  name: string;
  course: string | null;
  semester: string | null;
  college: string | null;
  available_hours_per_day: number;
  preferred_session_length: number;
  target_score: number;
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  onboarded: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type Resource = {
  id: string;
  user_id: string;
  subject_id: string | null;
  filename: string;
  file_type: string;
  doc_type: 'notes' | 'textbook' | 'pyq' | 'syllabus' | 'faculty';
  file_size: number | null;
  storage_path: string | null;
  processing_status: 'uploading' | 'processing' | 'indexed' | 'failed';
  chunk_count: number;
  indexed: boolean;
  error_message: string | null;
  created_at: string;
};

export type DocumentChunk = {
  id: string;
  resource_id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  chunk_index: number;
  content: string;
  page_number: number | null;
  doc_type: string | null;
  token_count: number;
  embedding_status: 'pending' | 'indexed' | 'failed';
  created_at: string;
};

export type Quiz = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'mcq' | 'true_false' | 'descriptive' | 'scenario';
  num_questions: number;
  duration_minutes: number;
  score: number;
  accuracy: number;
  status: 'pending' | 'in_progress' | 'completed';
  suggested_next_difficulty: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  user_id: string;
  topic_id: string | null;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'descriptive' | 'scenario';
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
  created_at: string;
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  question_id: string;
  user_id: string;
  topic_id: string | null;
  student_answer: string | null;
  is_correct: boolean;
  time_spent_seconds: number | null;
  created_at: string;
};

export type Doubt = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  question: string;
  answer: string | null;
  detected_concept: string | null;
  resolved: boolean;
  repeated_concept_count: number;
  source_refs: SourceRef[] | null;
  created_at: string;
};

export type SourceRef = {
  filename: string;
  page: number | null;
  chunk_index: number | null;
};

export type RevisionItem = {
  id: string;
  user_id: string;
  topic_id: string;
  subject_id: string | null;
  revision_date: string;
  interval_days: number;
  revision_count: number;
  last_performance: number | null;
  status: 'pending' | 'completed';
  created_at: string;
};

export type StudyPlan = {
  id: string;
  user_id: string;
  plan_date: string;
  total_minutes: number;
  allocated_minutes: PlanAllocation[];
  plan_data: Record<string, unknown>;
  source: string;
  created_at: string;
};

export type PlanAllocation = {
  topic_id: string;
  subject_id: string;
  topic_name: string;
  subject_name: string;
  minutes: number;
  task_type: TaskType;
  priority: TaskPriority;
  reason: string;
};

export type PyqQuestion = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  resource_id: string | null;
  question_text: string;
  year: number | null;
  marks: number;
  question_type: string;
  detected_topic: string | null;
  created_at: string;
};

export type PyqTopicFrequency = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_name: string;
  topic_id: string | null;
  frequency_count: number;
  total_marks: number;
  year_range: string | null;
  frequency_level: 'low' | 'medium' | 'high';
  created_at: string;
};

export type LearningEvent = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};

// ============ COMPUTED TYPES ============

export type TopicMasteryLevel = 'weak' | 'developing' | 'proficient' | 'mastered';

export type TopicWithMastery = Topic & {
  mastery_level: TopicMasteryLevel;
  days_since_studied: number | null;
  is_revision_due: boolean;
  syllabus_completion: number;
};

export type SubjectAnalytics = {
  subject: Subject;
  topics: TopicWithMastery[];
  syllabus_completion: number;
  overall_mastery: number;
  quiz_accuracy: number;
  studied_hours: number;
  weak_topics: TopicWithMastery[];
  resource_count: number;
  days_until_exam: number | null;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  topic: string | null;
  source_refs: SourceRef[] | null;
  mastery: number | null;
  timestamp: string;
};
