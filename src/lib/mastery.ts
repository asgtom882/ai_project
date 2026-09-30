import type { Topic, TopicWithMastery, TopicMasteryLevel } from './types';

// ============ MASTERY ENGINE ============
// Configurable weights — single source of truth for the mastery formula.
// The backend can later replace this with an ML model.
export const MASTERY_WEIGHTS = {
  quiz_accuracy: 0.40,
  practice_accuracy: 0.20,
  completion: 0.15,
  recency: 0.15,
  revision_performance: 0.10,
};

export function getDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  target.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRecencyScore(lastStudied: string | null): number {
  const days = getDaysSince(lastStudied);
  if (days === null) return 0;
  if (days <= 2) return 100;
  if (days <= 7) return 80;
  if (days <= 14) return 60;
  if (days <= 30) return 40;
  return 20;
}

export function getCompletionScore(status: Topic['status']): number {
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 50;
  return 0;
}

export function getRevisionPerformanceScore(revisionCount: number, quizAccuracy: number): number {
  if (revisionCount === 0) return 30;
  // More revisions + decent quiz accuracy = better revision performance
  const countScore = Math.min(revisionCount * 15, 60);
  const accuracyScore = quizAccuracy * 0.4;
  return Math.min(countScore + accuracyScore, 100);
}

export function calculateTopicMastery(topic: Topic): number {
  const completion = getCompletionScore(topic.status);
  const recency = getRecencyScore(topic.last_studied);
  const revisionPerf = getRevisionPerformanceScore(topic.revision_count, topic.quiz_accuracy);

  const mastery =
    topic.quiz_accuracy * MASTERY_WEIGHTS.quiz_accuracy +
    topic.practice_accuracy * MASTERY_WEIGHTS.practice_accuracy +
    completion * MASTERY_WEIGHTS.completion +
    recency * MASTERY_WEIGHTS.recency +
    revisionPerf * MASTERY_WEIGHTS.revision_performance;

  return Math.round(Math.min(Math.max(mastery, 0), 100));
}

export function getMasteryLevel(mastery: number): TopicMasteryLevel {
  if (mastery < 40) return 'weak';
  if (mastery < 60) return 'developing';
  if (mastery < 80) return 'proficient';
  return 'mastered';
}

export function isRevisionDue(topic: Topic): boolean {
  if (!topic.next_revision) return false;
  const today = new Date().toISOString().slice(0, 10);
  return topic.next_revision <= today;
}

export function enrichTopicWithMastery(topic: Topic): TopicWithMastery {
  const mastery = calculateTopicMastery(topic);
  const daysSince = getDaysSince(topic.last_studied);
  return {
    ...topic,
    mastery_score: mastery,
    mastery_level: getMasteryLevel(mastery),
    days_since_studied: daysSince,
    is_revision_due: isRevisionDue(topic),
    syllabus_completion: getCompletionScore(topic.status),
  };
}

export function getSubjectOverallMastery(topics: TopicWithMastery[]): number {
  if (topics.length === 0) return 0;
  return Math.round(topics.reduce((sum, t) => sum + t.mastery_score, 0) / topics.length);
}

export function getSubjectQuizAccuracy(topics: TopicWithMastery[]): number {
  const topicsWithQuiz = topics.filter((t) => t.quiz_accuracy > 0);
  if (topicsWithQuiz.length === 0) return 0;
  return Math.round(topicsWithQuiz.reduce((sum, t) => sum + t.quiz_accuracy, 0) / topicsWithQuiz.length);
}

export function getSyllabusCompletion(topics: Topic[]): number {
  if (topics.length === 0) return 0;
  const completed = topics.filter((t) => t.status === 'completed').length;
  return Math.round((completed / topics.length) * 100);
}

export function getWeakTopics(topics: TopicWithMastery[], threshold = 60): TopicWithMastery[] {
  return topics
    .filter((t) => t.mastery_score < threshold)
    .sort((a, b) => a.mastery_score - b.mastery_score);
}

export function getOverallMastery(allTopics: TopicWithMastery[]): number {
  if (allTopics.length === 0) return 0;
  return Math.round(allTopics.reduce((sum, t) => sum + t.mastery_score, 0) / allTopics.length);
}
