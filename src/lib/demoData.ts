import { supabase } from './supabase';
import type { Subject, Topic, StudySession, Task } from './types';

// ============ DEMO MODE SEED DATA ============
// Seeds realistic sample data for the authenticated user.
// Allows full system demonstration without manual data entry.

const DEMO_SUBJECTS = [
  { name: 'DBMS', color: 'blue', target_hours: 40, exam_date: getRelativeDate(35) },
  { name: 'Operating Systems', color: 'emerald', target_hours: 35, exam_date: getRelativeDate(28) },
  { name: 'Computer Networks', color: 'amber', target_hours: 30, exam_date: getRelativeDate(42) },
  { name: 'Artificial Intelligence', color: 'violet', target_hours: 35, exam_date: getRelativeDate(50) },
];

const DEMO_TOPICS: Record<string, Array<{ name: string; hours: number; status: string; mastery: number; quiz: number; pyq: string; importance: string; difficulty: string; lastStudied: string | null }>> = {
  DBMS: [
    { name: 'ER Diagrams', hours: 3, status: 'completed', mastery: 88, quiz: 90, pyq: 'high', importance: 'high', difficulty: 'easy', lastStudied: getRelativeDate(-5) },
    { name: 'Normalization', hours: 4, status: 'completed', mastery: 75, quiz: 80, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-3) },
    { name: 'SQL Queries', hours: 5, status: 'completed', mastery: 82, quiz: 85, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-2) },
    { name: 'Transactions', hours: 4, status: 'in_progress', mastery: 44, quiz: 42, pyq: 'high', importance: 'high', difficulty: 'hard', lastStudied: getRelativeDate(-4) },
    { name: 'Indexing', hours: 3, status: 'in_progress', mastery: 38, quiz: 35, pyq: 'medium', importance: 'medium', difficulty: 'hard', lastStudied: getRelativeDate(-6) },
    { name: 'Deadlocks', hours: 2, status: 'completed', mastery: 51, quiz: 48, pyq: 'medium', importance: 'medium', difficulty: 'medium', lastStudied: getRelativeDate(-7) },
    { name: 'Concurrency Control', hours: 3, status: 'not_started', mastery: 0, quiz: 0, pyq: 'medium', importance: 'medium', difficulty: 'hard', lastStudied: null },
    { name: 'File Organization', hours: 2, status: 'not_started', mastery: 0, quiz: 0, pyq: 'low', importance: 'low', difficulty: 'easy', lastStudied: null },
  ],
  'Operating Systems': [
    { name: 'Process Management', hours: 4, status: 'completed', mastery: 72, quiz: 75, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-4) },
    { name: 'CPU Scheduling', hours: 3, status: 'completed', mastery: 65, quiz: 60, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-3) },
    { name: 'Deadlocks', hours: 3, status: 'in_progress', mastery: 52, quiz: 50, pyq: 'high', importance: 'high', difficulty: 'hard', lastStudied: getRelativeDate(-5) },
    { name: 'Memory Management', hours: 4, status: 'completed', mastery: 68, quiz: 65, pyq: 'medium', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-6) },
    { name: 'Paging', hours: 3, status: 'in_progress', mastery: 45, quiz: 40, pyq: 'medium', importance: 'medium', difficulty: 'hard', lastStudied: getRelativeDate(-7) },
    { name: 'Virtual Memory', hours: 2, status: 'not_started', mastery: 0, quiz: 0, pyq: 'low', importance: 'medium', difficulty: 'medium', lastStudied: null },
    { name: 'File Systems', hours: 3, status: 'not_started', mastery: 0, quiz: 0, pyq: 'low', importance: 'low', difficulty: 'easy', lastStudied: null },
  ],
  'Computer Networks': [
    { name: 'OSI Model', hours: 3, status: 'completed', mastery: 80, quiz: 82, pyq: 'high', importance: 'high', difficulty: 'easy', lastStudied: getRelativeDate(-3) },
    { name: 'TCP/IP Protocol', hours: 4, status: 'completed', mastery: 70, quiz: 72, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-5) },
    { name: 'Congestion Control', hours: 3, status: 'in_progress', mastery: 48, quiz: 45, pyq: 'medium', importance: 'medium', difficulty: 'hard', lastStudied: getRelativeDate(-6) },
    { name: 'Routing Algorithms', hours: 3, status: 'completed', mastery: 62, quiz: 58, pyq: 'medium', importance: 'medium', difficulty: 'medium', lastStudied: getRelativeDate(-4) },
    { name: 'Application Layer', hours: 2, status: 'not_started', mastery: 0, quiz: 0, pyq: 'low', importance: 'low', difficulty: 'easy', lastStudied: null },
    { name: 'Network Security', hours: 3, status: 'not_started', mastery: 0, quiz: 0, pyq: 'medium', importance: 'medium', difficulty: 'hard', lastStudied: null },
  ],
  'Artificial Intelligence': [
    { name: 'Search Algorithms', hours: 4, status: 'completed', mastery: 85, quiz: 88, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-2) },
    { name: 'Machine Learning Basics', hours: 5, status: 'completed', mastery: 78, quiz: 80, pyq: 'high', importance: 'high', difficulty: 'medium', lastStudied: getRelativeDate(-3) },
    { name: 'Neural Networks', hours: 4, status: 'completed', mastery: 82, quiz: 85, pyq: 'medium', importance: 'high', difficulty: 'hard', lastStudied: getRelativeDate(-4) },
    { name: 'Backpropagation', hours: 3, status: 'in_progress', mastery: 55, quiz: 52, pyq: 'medium', importance: 'medium', difficulty: 'hard', lastStudied: getRelativeDate(-5) },
    { name: 'Natural Language Processing', hours: 4, status: 'not_started', mastery: 0, quiz: 0, pyq: 'low', importance: 'medium', difficulty: 'hard', lastStudied: null },
    { name: 'Computer Vision', hours: 3, status: 'not_started', mastery: 0, quiz: 0, pyq: 'low', importance: 'low', difficulty: 'hard', lastStudied: null },
  ],
};

function getRelativeDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export async function seedDemoData(userId: string): Promise<void> {
  // Create profile as demo
  await supabase.from('student_profiles').upsert({
    user_id: userId,
    name: 'Demo Student',
    course: 'Computer Science',
    semester: '6',
    college: 'Demo University',
    available_hours_per_day: 4,
    preferred_session_length: 45,
    target_score: 85,
    learning_style: 'visual',
    onboarded: true,
    is_demo: true,
  });

  // Create subjects and topics
  for (const subjData of DEMO_SUBJECTS) {
    const { data: subject } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        name: subjData.name,
        color: subjData.color,
        target_hours: subjData.target_hours,
        exam_date: subjData.exam_date,
      })
      .select()
      .single();

    if (!subject) continue;

    const topicsForSubject = DEMO_TOPICS[subjData.name] ?? [];
    for (let i = 0; i < topicsForSubject.length; i++) {
      const t = topicsForSubject[i];
      const nextRev = t.status !== 'not_started' && t.lastStudied
        ? getRelativeDate(1 + Math.floor(Math.random() * 6))
        : null;

      await supabase.from('topics').insert({
        subject_id: subject.id,
        name: t.name,
        estimated_hours: t.hours,
        status: t.status,
        order_index: i,
        mastery_score: t.mastery,
        quiz_accuracy: t.quiz,
        practice_accuracy: Math.round(t.quiz * 0.9),
        study_time_minutes: Math.round(t.hours * 60 * (t.status === 'completed' ? 1 : t.status === 'in_progress' ? 0.5 : 0)),
        revision_count: t.status === 'completed' ? 2 : t.status === 'in_progress' ? 1 : 0,
        last_studied: t.lastStudied,
        next_revision: nextRev,
        difficulty: t.difficulty,
        importance: t.importance,
        pyq_frequency: t.pyq,
        confidence_score: t.mastery * 0.8,
      });
    }

    // Create some study sessions for the past week
    for (let day = 0; day < 7; day++) {
      const minutes = Math.random() > 0.3 ? Math.round(30 + Math.random() * 90) : 0;
      if (minutes > 0) {
        const topics = topicsForSubject.filter((t) => t.lastStudied !== null);
        if (topics.length > 0) {
          const randomTopic = topics[Math.floor(Math.random() * topics.length)];
          await supabase.from('study_sessions').insert({
            user_id: userId,
            subject_id: subject.id,
            duration_minutes: minutes,
            studied_at: getRelativeDate(-day),
            notes: `Studied ${randomTopic.name}`,
          });
        }
      }
    }

    // Create revision schedule items
    for (const t of topicsForSubject) {
      if (t.status !== 'not_started' && t.lastStudied) {
        const revDate = getRelativeDate(Math.floor(Math.random() * 3) - 1);
        await supabase.from('revision_schedule').insert({
          user_id: userId,
          topic_id: null, // will be set after topic creation — simplified for demo
          subject_id: subject.id,
          revision_date: revDate,
          interval_days: t.mastery > 60 ? 3 : 1,
          revision_count: t.status === 'completed' ? 2 : 1,
          last_performance: t.quiz,
          status: revDate <= getRelativeDate(0) ? 'pending' : 'pending',
        });
      }
    }
  }

  // Create some demo tasks
  const { data: subjects } = await supabase.from('subjects').select('*').eq('user_id', userId);
  if (subjects) {
    for (const subject of subjects.slice(0, 3)) {
      await supabase.from('tasks').insert({
        user_id: userId,
        subject_id: subject.id,
        title: `Study session: ${subject.name}`,
        description: 'Planner-generated study task based on your current progress.',
        estimated_minutes: 45,
        due_date: getRelativeDate(0),
        status: 'pending',
        source: 'planner',
        task_type: 'study',
        priority: 'high',
        reason: 'Topic mastery is below target; exam is approaching.',
      });
    }
  }

  // Create a demo completed quiz
  const firstSubject = subjects?.[0];
  if (firstSubject) {
    const { data: quiz } = await supabase.from('quizzes').insert({
      user_id: userId,
      subject_id: firstSubject.id,
      title: `DBMS Diagnostic Quiz`,
      difficulty: 'medium',
      question_type: 'mcq',
      num_questions: 10,
      duration_minutes: 20,
      score: 6,
      accuracy: 60,
      status: 'completed',
      suggested_next_difficulty: 'medium',
      started_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date(Date.now() - 86400000).toISOString(),
    }).select().single();

    if (quiz) {
      // Create some quiz questions and attempts
      const questions = [
        { text: 'What does ACID stand for in database transactions?', answer: 'Atomicity, Consistency, Isolation, Durability', options: ['Atomicity, Consistency, Isolation, Durability', 'Accuracy, Consistency, Integrity, Data', 'Atomic, Consistent, Independent, Durable', 'Automatic, Concurrent, Isolated, Durable'], correct: true },
        { text: 'Which normal form removes transitive dependencies?', answer: '3NF', options: ['1NF', '2NF', '3NF', 'BCNF'], correct: true },
        { text: 'What is a deadlock?', answer: 'A situation where two or more processes are unable to proceed', options: ['A situation where two or more processes are unable to proceed', 'A type of database lock', 'A network error', 'A programming bug'], correct: false },
        { text: 'Which is NOT a type of SQL join?', answer: 'OUTER-INNER join', options: ['INNER join', 'LEFT join', 'OUTER-INNER join', 'FULL join'], correct: true },
        { text: 'What does B-tree index optimize?', answer: 'Range queries and ordered data access', options: ['Range queries and ordered data access', 'Only exact match queries', 'Network requests', 'Memory allocation'], correct: false },
      ];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: question } = await supabase.from('quiz_questions').insert({
          quiz_id: quiz.id,
          user_id: userId,
          question_text: q.text,
          question_type: 'mcq',
          options: q.options,
          correct_answer: q.answer,
          explanation: 'This is a fundamental concept in DBMS.',
          difficulty: 'medium',
          order_index: i,
        }).select().single();

        if (question) {
          await supabase.from('quiz_attempts').insert({
            quiz_id: quiz.id,
            question_id: question.id,
            user_id: userId,
            student_answer: q.correct ? q.answer : q.options[0],
            is_correct: q.correct,
            time_spent_seconds: 30 + Math.floor(Math.random() * 60),
          });
        }
      }
    }
  }
}
