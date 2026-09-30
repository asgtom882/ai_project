import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type {
  Subject, Topic, StudySession, Task,
  StudentProfile, Resource, Quiz, QuizQuestion, QuizAttempt,
  Doubt, RevisionItem, PyqQuestion, PyqTopicFrequency, LearningEvent,
} from './types';

export function useStudentData(userId: string | null) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [pyqQuestions, setPyqQuestions] = useState<PyqQuestion[]>([]);
  const [pyqFrequency, setPyqFrequency] = useState<PyqTopicFrequency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const [subRes, topRes, sessRes, taskRes, profRes, resRes, quizRes, doubtRes, revRes, pyqRes, pyqFreqRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('topics').select('*').order('order_index'),
      supabase.from('study_sessions').select('*').eq('user_id', userId).order('studied_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('resources').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('quizzes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('doubts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('revision_schedule').select('*').eq('user_id', userId).order('revision_date'),
      supabase.from('pyq_questions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('pyq_topic_frequency').select('*').eq('user_id', userId).order('frequency_count', { ascending: false }),
    ]);

    setSubjects((subRes.data as Subject[]) ?? []);
    setTopics((topRes.data as Topic[]) ?? []);
    setSessions((sessRes.data as StudySession[]) ?? []);
    setTasks((taskRes.data as Task[]) ?? []);
    setProfile((profRes.data as StudentProfile) ?? null);
    setResources((resRes.data as Resource[]) ?? []);
    setQuizzes((quizRes.data as Quiz[]) ?? []);
    setDoubts((doubtRes.data as Doubt[]) ?? []);
    setRevisions((revRes.data as RevisionItem[]) ?? []);
    setPyqQuestions((pyqRes.data as PyqQuestion[]) ?? []);
    setPyqFrequency((pyqFreqRes.data as PyqTopicFrequency[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ============ SUBJECTS ============
  const addSubject = useCallback(async (data: Omit<Subject, 'id' | 'created_at' | 'user_id'>) => {
    const { data: row } = await supabase.from('subjects').insert(data).select().single();
    if (row) setSubjects((prev) => [...prev, row as Subject]);
    return row;
  }, []);

  const updateSubject = useCallback(async (id: string, data: Partial<Subject>) => {
    const { data: row } = await supabase.from('subjects').update(data).eq('id', id).select().single();
    if (row) setSubjects((prev) => prev.map((s) => (s.id === id ? row as Subject : s)));
    return row;
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopics((prev) => prev.filter((t) => t.subject_id !== id));
    setSessions((prev) => prev.filter((s) => s.subject_id !== id));
    setTasks((prev) => prev.filter((t) => t.subject_id !== id));
  }, []);

  // ============ TOPICS ============
  const addTopic = useCallback(async (data: Omit<Topic, 'id' | 'created_at' | 'status' | 'mastery_score' | 'quiz_accuracy' | 'practice_accuracy' | 'study_time_minutes' | 'revision_count' | 'last_studied' | 'next_revision' | 'difficulty' | 'importance' | 'pyq_frequency' | 'confidence_score'>) => {
    const { data: row } = await supabase.from('topics').insert(data).select().single();
    if (row) setTopics((prev) => [...prev, row as Topic]);
    return row;
  }, []);

  const updateTopic = useCallback(async (id: string, data: Partial<Topic>) => {
    const { data: row } = await supabase.from('topics').update(data).eq('id', id).select().single();
    if (row) setTopics((prev) => prev.map((t) => (t.id === id ? row as Topic : t)));
    return row;
  }, []);

  const deleteTopic = useCallback(async (id: string) => {
    await supabase.from('topics').delete().eq('id', id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ============ SESSIONS ============
  const addSession = useCallback(async (data: Omit<StudySession, 'id' | 'created_at' | 'user_id'>) => {
    const { data: row } = await supabase.from('study_sessions').insert(data).select().single();
    if (row) setSessions((prev) => [row as StudySession, ...prev]);
    // Update topic study time + last studied
    if (data.topic_id) {
      const topic = topics.find((t) => t.id === data.topic_id);
      if (topic) {
        const today = new Date().toISOString().slice(0, 10);
        updateTopic(topic.id, {
          study_time_minutes: topic.study_time_minutes + data.duration_minutes,
          last_studied: today,
          status: topic.status === 'not_started' ? 'in_progress' : topic.status,
        });
      }
    }
    return row;
  }, [topics, updateTopic]);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from('study_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ============ TASKS ============
  const addTask = useCallback(async (data: {
    title: string;
    subject_id: string | null;
    topic_id: string | null;
    description: string | null;
    estimated_minutes: number;
    due_date: string | null;
    source: 'ai' | 'manual' | 'planner';
    task_type?: string;
    priority?: string;
    reason?: string | null;
  }) => {
    const { data: row } = await supabase.from('tasks').insert({
      ...data,
      task_type: data.task_type ?? 'study',
      priority: data.priority ?? 'medium',
      reason: data.reason ?? null,
    }).select().single();
    if (row) setTasks((prev) => [row as Task, ...prev]);
    return row;
  }, []);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const { data: row } = await supabase.from('tasks').update(data).eq('id', id).select().single();
    if (row) setTasks((prev) => prev.map((t) => (t.id === id ? row as Task : t)));
    return row;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ============ PROFILE ============
  const upsertProfile = useCallback(async (data: Partial<StudentProfile>) => {
    if (!userId) return;
    const { data: row } = await supabase.from('student_profiles').upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (row) setProfile(row as StudentProfile);
    return row;
  }, [userId]);

  // ============ RESOURCES ============
  const addResource = useCallback(async (data: Omit<Resource, 'id' | 'created_at' | 'user_id'>) => {
    const { data: row } = await supabase.from('resources').insert(data).select().single();
    if (row) setResources((prev) => [row as Resource, ...prev]);
    return row;
  }, []);

  const updateResource = useCallback(async (id: string, data: Partial<Resource>) => {
    const { data: row } = await supabase.from('resources').update(data).eq('id', id).select().single();
    if (row) setResources((prev) => prev.map((r) => (r.id === id ? row as Resource : r)));
    return row;
  }, []);

  const deleteResource = useCallback(async (id: string) => {
    await supabase.from('resources').delete().eq('id', id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ============ QUIZZES ============
  const addQuiz = useCallback(async (data: Omit<Quiz, 'id' | 'created_at' | 'user_id' | 'score' | 'accuracy' | 'status' | 'suggested_next_difficulty' | 'started_at' | 'completed_at'>) => {
    const { data: row } = await supabase.from('quizzes').insert({
      ...data,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).select().single();
    if (row) setQuizzes((prev) => [row as Quiz, ...prev]);
    return row;
  }, []);

  const updateQuiz = useCallback(async (id: string, data: Partial<Quiz>) => {
    const { data: row } = await supabase.from('quizzes').update(data).eq('id', id).select().single();
    if (row) setQuizzes((prev) => prev.map((q) => (q.id === id ? row as Quiz : q)));
    return row;
  }, []);

  const addQuizQuestions = useCallback(async (questions: Omit<QuizQuestion, 'id' | 'created_at' | 'user_id'>[]) => {
    if (questions.length === 0) return;
    const { data: rows } = await supabase.from('quiz_questions').insert(questions).select();
    if (rows) setQuizQuestions((prev) => [...(rows as QuizQuestion[]), ...prev]);
    return rows;
  }, []);

  const fetchQuizQuestions = useCallback(async (quizId: string) => {
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index');
    return (data as QuizQuestion[]) ?? [];
  }, []);

  const addQuizAttempts = useCallback(async (attempts: Omit<QuizAttempt, 'id' | 'created_at' | 'user_id'>[]) => {
    if (attempts.length === 0) return;
    const { data: rows } = await supabase.from('quiz_attempts').insert(attempts).select();
    if (rows) setQuizAttempts((prev) => [...(rows as QuizAttempt[]), ...prev]);
    return rows;
  }, []);

  // ============ DOUBTS ============
  const addDoubt = useCallback(async (data: Omit<Doubt, 'id' | 'created_at' | 'user_id' | 'resolved' | 'repeated_concept_count'>) => {
    const { data: row } = await supabase.from('doubts').insert(data).select().single();
    if (row) setDoubts((prev) => [row as Doubt, ...prev]);
    return row;
  }, []);

  const updateDoubt = useCallback(async (id: string, data: Partial<Doubt>) => {
    const { data: row } = await supabase.from('doubts').update(data).eq('id', id).select().single();
    if (row) setDoubts((prev) => prev.map((d) => (d.id === id ? row as Doubt : d)));
    return row;
  }, []);

  // ============ REVISIONS ============
  const addRevision = useCallback(async (data: Omit<RevisionItem, 'id' | 'created_at' | 'user_id' | 'status'>) => {
    const { data: row } = await supabase.from('revision_schedule').insert(data).select().single();
    if (row) setRevisions((prev) => [...prev, row as RevisionItem].sort((a, b) => a.revision_date.localeCompare(b.revision_date)));
    return row;
  }, []);

  const updateRevision = useCallback(async (id: string, data: Partial<RevisionItem>) => {
    const { data: row } = await supabase.from('revision_schedule').update(data).eq('id', id).select().single();
    if (row) setRevisions((prev) => prev.map((r) => (r.id === id ? row as RevisionItem : r)));
    return row;
  }, []);

  const deleteRevision = useCallback(async (id: string) => {
    await supabase.from('revision_schedule').delete().eq('id', id);
    setRevisions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ============ PYQ ============
  const addPyqQuestion = useCallback(async (data: Omit<PyqQuestion, 'id' | 'created_at' | 'user_id'>) => {
    const { data: row } = await supabase.from('pyq_questions').insert(data).select().single();
    if (row) setPyqQuestions((prev) => [row as PyqQuestion, ...prev]);
    return row;
  }, []);

  const addPyqFrequency = useCallback(async (data: Omit<PyqTopicFrequency, 'id' | 'created_at' | 'user_id'>) => {
    const { data: row } = await supabase.from('pyq_topic_frequency').insert(data).select().single();
    if (row) setPyqFrequency((prev) => [...prev, row as PyqTopicFrequency].sort((a, b) => b.frequency_count - a.frequency_count));
    return row;
  }, []);

  // ============ LEARNING EVENTS ============
  const logEvent = useCallback(async (eventType: string, eventData: Record<string, unknown>, subjectId?: string, topicId?: string) => {
    if (!userId) return;
    await supabase.from('learning_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      subject_id: subjectId ?? null,
      topic_id: topicId ?? null,
    });
  }, [userId]);

  return {
    subjects, topics, sessions, tasks, profile, resources,
    quizzes, quizQuestions, quizAttempts, doubts, revisions,
    pyqQuestions, pyqFrequency, loading, fetchAll,
    addSubject, updateSubject, deleteSubject,
    addTopic, updateTopic, deleteTopic,
    addSession, deleteSession,
    addTask, updateTask, deleteTask,
    upsertProfile,
    addResource, updateResource, deleteResource,
    addQuiz, updateQuiz, addQuizQuestions, fetchQuizQuestions, addQuizAttempts,
    addDoubt, updateDoubt,
    addRevision, updateRevision, deleteRevision,
    addPyqQuestion, addPyqFrequency,
    logEvent,
  };
}
