import { supabase } from './supabase';
import type { Subject, Topic, StudySession, Task } from './types';
import { calculateStudiedHours, getSubjectProgress, getWeeklyStudyData, getStreak } from './ai';

// ============ DATA SHAPE BUILDERS ============
// These build the payload sent to the ai-analysis edge function.

export function buildSubjectSummaries(
  subjects: Subject[],
  topics: Topic[],
  sessions: StudySession[]
) {
  return subjects.map((s) => {
    const subjTopics = topics.filter((t) => t.subject_id === s.id).sort((a, b) => a.order_index - b.order_index);
    const progress = getSubjectProgress(subjTopics);
    const subjSessions = sessions.filter((ses) => ses.subject_id === s.id);
    const studied = calculateStudiedHours(subjSessions);
    return {
      name: s.name,
      color: s.color,
      exam_date: s.exam_date ?? null,
      target_hours: s.target_hours,
      total_topics: progress.total,
      completed_topics: progress.completed,
      in_progress_topics: progress.inProgress,
      studied_hours: studied,
      topics: subjTopics.map((t) => ({
        name: t.name,
        status: t.status,
        estimated_hours: t.estimated_hours,
      })),
    };
  });
}

export function buildStudyStats(sessions: StudySession[], tasks: Task[]) {
  const streak = getStreak(sessions);
  const totalHours = calculateStudiedHours(sessions);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMinutes = sessions
    .filter((s) => s.studied_at === todayStr)
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  const weeklyData = getWeeklyStudyData(sessions);
  const weeklyMinutes = weeklyData.reduce((sum, d) => sum + d.minutes, 0);

  return {
    streak,
    total_hours: totalHours,
    today_minutes: todayMinutes,
    weekly_minutes: weeklyMinutes,
    weekly_breakdown: weeklyData.map((d) => ({ day: d.day, minutes: d.minutes })),
    pending_tasks: tasks.filter((t) => t.status === 'pending').length,
    completed_tasks: tasks.filter((t) => t.status === 'completed').length,
  };
}

// ============ EDGE FUNCTION CALLER ============

export type AIAnalysisResult = {
  overall_assessment: string;
  strengths: string[];
  improvement_areas: string[];
  study_habit_score: number;
  consistency_insight: string;
  subject_insights: { subject: string; insight: string; urgency: 'low' | 'medium' | 'high' }[];
  next_7_days_focus: string[];
  motivational_message: string;
};

export type AIRoadmapResult = {
  subject_name: string;
  overall_strategy: string;
  daily_hours_recommended: number;
  phases: {
    phase: number;
    title: string;
    duration: string;
    focus_topics: string[];
    daily_goal: string;
    milestone: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  exam_tips: string[];
  weak_areas: string[];
};

async function callEdgeFunction<T>(
  mode: 'analysis' | 'roadmap',
  subjects: Subject[],
  topics: Topic[],
  sessions: StudySession[],
  tasks: Task[],
  targetSubjectName?: string
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const payload = {
    mode,
    subjects: buildSubjectSummaries(subjects, topics, sessions),
    stats: buildStudyStats(sessions, tasks),
    ...(targetSubjectName ? { target_subject: targetSubjectName } : {}),
  };

  const { data, error } = await supabase.functions.invoke('ai-analysis', {
    body: payload,
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.result) throw new Error('No result returned from AI');

  return data.result as T;
}

export async function getAIAnalysis(
  subjects: Subject[],
  topics: Topic[],
  sessions: StudySession[],
  tasks: Task[]
): Promise<AIAnalysisResult> {
  return callEdgeFunction<AIAnalysisResult>('analysis', subjects, topics, sessions, tasks);
}

export async function getAIRoadmap(
  subjects: Subject[],
  topics: Topic[],
  sessions: StudySession[],
  tasks: Task[],
  targetSubjectName: string
): Promise<AIRoadmapResult> {
  return callEdgeFunction<AIRoadmapResult>('roadmap', subjects, topics, sessions, tasks, targetSubjectName);
}
