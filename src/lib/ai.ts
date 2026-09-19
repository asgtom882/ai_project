import type { Subject, Topic, StudySession, Task } from './types';

export type DailyTaskSuggestion = {
  title: string;
  description: string;
  estimated_minutes: number;
  subject_id: string | null;
  topic_id: string | null;
  reason: string;
};

export type RoadmapStep = {
  title: string;
  description: string;
  estimated_days: number;
  topics: string[];
  milestone: string;
};

export type Roadmap = {
  subject_id: string;
  subject_name: string;
  total_estimated_hours: number;
  remaining_hours: number;
  days_until_exam: number | null;
  recommended_daily_hours: number;
  steps: RoadmapStep[];
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function getDaysUntilExam(examDate: string | null): number | null {
  if (!examDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
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

export function generateRoadmap(
  subject: Subject,
  topics: Topic[]
): Roadmap {
  const sortedTopics = [...topics].sort((a, b) => a.order_index - b.order_index);
  const remainingTopics = sortedTopics.filter((t) => t.status !== 'completed');
  const totalEstimated = sortedTopics.reduce((s, t) => s + t.estimated_hours, 0);
  const remainingHours = remainingTopics.reduce((s, t) => s + t.estimated_hours, 0);
  const daysUntilExam = getDaysUntilExam(subject.exam_date);

  let recommendedDailyHours: number;
  if (daysUntilExam !== null && daysUntilExam > 0) {
    recommendedDailyHours = clamp(
      remainingHours / daysUntilExam,
      0.5,
      8
    );
  } else {
    recommendedDailyHours = clamp(remainingHours / 14, 1, 6);
  }

  const steps: RoadmapStep[] = [];
  const topicsPerStep = Math.max(1, Math.ceil(remainingTopics.length / 4));
  const hoursPerDay = recommendedDailyHours || 2;

  for (let i = 0; i < remainingTopics.length; i += topicsPerStep) {
    const chunk = remainingTopics.slice(i, i + topicsPerStep);
    const chunkHours = chunk.reduce((s, t) => s + t.estimated_hours, 0);
    const estDays = Math.max(1, Math.ceil(chunkHours / hoursPerDay));
    const stepNum = Math.floor(i / topicsPerStep) + 1;

    steps.push({
      title: `Phase ${stepNum}: ${chunk[0].name}${chunk.length > 1 ? ' & more' : ''}`,
      description: `Focus on ${chunk.map((t) => t.name).join(', ')}. Study approximately ${chunkHours.toFixed(1)} hours across ${estDays} day${estDays > 1 ? 's' : ''}.`,
      estimated_days: estDays,
      topics: chunk.map((t) => t.name),
      milestone:
        stepNum === steps.length
          ? 'Final preparation — review everything and do practice problems'
          : `Complete ${chunk.length} topic${chunk.length > 1 ? 's' : ''} and move to the next phase`,
    });
  }

  return {
    subject_id: subject.id,
    subject_name: subject.name,
    total_estimated_hours: totalEstimated,
    remaining_hours: remainingHours,
    days_until_exam: daysUntilExam,
    recommended_daily_hours: Math.round(recommendedDailyHours * 10) / 10,
    steps,
  };
}

export function generateDailyTasks(
  subjects: Subject[],
  topics: Topic[],
  sessions: StudySession[],
  existingTasks: Task[]
): DailyTaskSuggestion[] {
  const suggestions: DailyTaskSuggestion[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const todaySessions = sessions.filter((s) => s.studied_at === today);
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const pendingTasksToday = existingTasks.filter(
    (t) => t.due_date === today && t.status === 'pending'
  );

  const remainingTasksNeeded = Math.max(0, 4 - pendingTasksToday.length);
  if (remainingTasksNeeded === 0) return suggestions;

  const topicsBySubject = new Map<string, Topic[]>();
  topics.forEach((t) => {
    const arr = topicsBySubject.get(t.subject_id) ?? [];
    arr.push(t);
    topicsBySubject.set(t.subject_id, arr);
  });

  const subjectsWithProgress = subjects
    .map((s) => {
      const subjTopics = (topicsBySubject.get(s.id) ?? []).sort(
        (a, b) => a.order_index - b.order_index
      );
      const remaining = subjTopics.filter((t) => t.status !== 'completed');
      const progress = getSubjectProgress(subjTopics);
      return { subject: s, remaining, progress, totalTopics: subjTopics.length };
    })
    .sort((a, b) => a.progress.percent - b.progress.percent);

  const maxTasks = Math.min(remainingTasksNeeded, subjectsWithProgress.length * 2);

  for (const { subject, remaining, progress } of subjectsWithProgress) {
    if (suggestions.length >= maxTasks) break;

    if (remaining.length === 0) {
      suggestions.push({
        title: `Review & practice: ${subject.name}`,
        description: `You've completed all topics for ${subject.name}. Spend time reviewing notes and solving practice problems to keep it fresh.`,
        estimated_minutes: 45,
        subject_id: subject.id,
        topic_id: null,
        reason: `All topics done — reinforcement keeps knowledge intact.`,
      });
      continue;
    }

    const inProgress = remaining.find((t) => t.status === 'in_progress');
    const targetTopic = inProgress ?? remaining[0];
    const daysLeft = getDaysUntilExam(subject.exam_date);

    let reason: string;
    if (daysLeft !== null && daysLeft <= 7) {
      reason = `Exam in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — prioritize ${subject.name}.`;
    } else if (progress.percent < 25) {
      reason = `${subject.name} is at ${progress.percent}% — start building momentum.`;
    } else if (inProgress) {
      reason = `Continue "${targetTopic.name}" — you're already mid-way through.`;
    } else {
      reason = `Next up in your ${subject.name} syllabus.`;
    }

    suggestions.push({
      title: `Study: ${targetTopic.name} (${subject.name})`,
      description: `Work through "${targetTopic.name}". Estimated ${targetTopic.estimated_hours} hour${targetTopic.estimated_hours !== 1 ? 's' : ''} total — aim for a focused 45-minute session today.`,
      estimated_minutes: 45,
      subject_id: subject.id,
      topic_id: targetTopic.id,
      reason,
    });
  }

  if (todayMinutes < 30 && suggestions.length > 0) {
    suggestions[0] = {
      ...suggestions[0],
      description:
        suggestions[0].description +
        ` You've studied ${todayMinutes} minutes today — getting started is the hardest part.`,
    };
  }

  return suggestions.slice(0, maxTasks);
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
