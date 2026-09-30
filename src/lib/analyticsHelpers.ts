import type { Subject, Topic, TopicWithMastery, StudySession } from './types';
import { enrichTopicWithMastery, getSyllabusCompletion, getSubjectOverallMastery, getSubjectQuizAccuracy, getWeakTopics } from './mastery';

export function getDaysUntilExamFromSubject(subject: Subject): number | null {
  if (!subject.exam_date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exam = new Date(subject.exam_date + 'T00:00:00');
  exam.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function calculateStudiedHours(sessions: StudySession[]): number {
  return sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60;
}

export function getSubjectProgress(topics: Topic[]): {
  total: number;
  completed: number;
  inProgress: number;
  percent: number;
} {
  const total = topics.length;
  const completed = topics.filter((t) => t.status === 'completed').length;
  const inProgress = topics.filter((t) => t.status === 'in_progress').length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, inProgress, percent };
}

export function getRemainingHours(topics: Topic[]): number {
  return topics
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + t.estimated_hours, 0);
}

export function getWeeklyStudyData(
  sessions: StudySession[]
): { day: string; minutes: number; date: string }[] {
  const days: { day: string; minutes: number; date: string }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = sessions
      .filter((s) => s.studied_at === dateStr)
      .reduce((sum, s) => sum + s.duration_minutes, 0);
    days.push({ day: dayNames[d.getDay()], minutes, date: dateStr });
  }

  return days;
}

export function getStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;
  const studiedDates = new Set(sessions.map((s) => s.studied_at));
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    if (studiedDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

export function getStudyConsistency(sessions: StudySession[], days = 28): number {
  if (sessions.length === 0) return 0;
  const studiedDates = new Set(sessions.map((s) => s.studied_at));
  let studyDays = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    if (studiedDates.has(dateStr)) studyDays++;
    d.setDate(d.getDate() - 1);
  }

  return Math.round((studyDays / days) * 100);
}

export type SubjectAnalyticsData = {
  subject: Subject;
  topics: TopicWithMastery[];
  syllabus_completion: number;
  overall_mastery: number;
  quiz_accuracy: number;
  studied_hours: number;
  weak_topics: TopicWithMastery[];
  days_until_exam: number | null;
};

export function getSubjectAnalytics(
  subject: Subject,
  allTopics: Topic[],
  sessions: StudySession[]
): SubjectAnalyticsData {
  const subjTopics = allTopics.filter((t) => t.subject_id === subject.id);
  const enriched = subjTopics.map(enrichTopicWithMastery);
  const subjSessions = sessions.filter((s) => s.subject_id === subject.id);

  return {
    subject,
    topics: enriched,
    syllabus_completion: getSyllabusCompletion(subjTopics),
    overall_mastery: getSubjectOverallMastery(enriched),
    quiz_accuracy: getSubjectQuizAccuracy(enriched),
    studied_hours: calculateStudiedHours(subjSessions),
    weak_topics: getWeakTopics(enriched),
    days_until_exam: getDaysUntilExamFromSubject(subject),
  };
}

export function getQuizScoreTrend(
  quizzes: Array<{ created_at: string; accuracy: number; status: string }>
): { date: string; accuracy: number; label: string }[] {
  return quizzes
    .filter((q) => q.status === 'completed')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-10)
    .map((q) => ({
      date: q.created_at.slice(0, 10),
      accuracy: Math.round(q.accuracy),
      label: new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
}

export function getMasteryDistribution(
  topics: TopicWithMastery[]
): { level: string; count: number; color: string }[] {
  const weak = topics.filter((t) => t.mastery_level === 'weak').length;
  const developing = topics.filter((t) => t.mastery_level === 'developing').length;
  const proficient = topics.filter((t) => t.mastery_level === 'proficient').length;
  const mastered = topics.filter((t) => t.mastery_level === 'mastered').length;

  return [
    { level: 'Weak', count: weak, color: 'bg-rose-500' },
    { level: 'Developing', count: developing, color: 'bg-amber-500' },
    { level: 'Proficient', count: proficient, color: 'bg-blue-500' },
    { level: 'Mastered', count: mastered, color: 'bg-emerald-500' },
  ];
}
