import type { Subject, Topic, TopicWithMastery, StudentProfile, PlanAllocation, TaskType, TaskPriority } from './types';
import { enrichTopicWithMastery, getDaysUntilExamFromSubject } from './analyticsHelpers';
import { isRevisionDue } from './mastery';

// ============ TOPIC PRIORITY ENGINE ============
// Replaces the naive "first incomplete topic" approach.
// Priority = Weakness + Exam Urgency + PYQ Frequency + Topic Importance + Revision Urgency

type TopicPriorityInput = {
  topic: TopicWithMastery;
  subject: Subject;
  daysUntilExam: number | null;
};

export function calculateTopicPriority(input: TopicPriorityInput): number {
  const { topic, daysUntilExam } = input;

  // Weakness signal (0-100): lower mastery = higher priority
  const weaknessScore = 100 - topic.mastery_score;

  // Exam urgency (0-100): closer exam = higher priority
  let examUrgency = 30;
  if (daysUntilExam !== null) {
    if (daysUntilExam <= 3) examUrgency = 100;
    else if (daysUntilExam <= 7) examUrgency = 85;
    else if (daysUntilExam <= 14) examUrgency = 65;
    else if (daysUntilExam <= 30) examUrgency = 45;
    else examUrgency = 25;
  }

  // PYQ frequency (0-100)
  const pyqScore = topic.pyq_frequency === 'high' ? 100 : topic.pyq_frequency === 'medium' ? 60 : 30;

  // Topic importance (0-100)
  const importanceScore = topic.importance === 'high' ? 100 : topic.importance === 'medium' ? 60 : 30;

  // Revision urgency (0-100)
  let revisionUrgency = 20;
  if (isRevisionDue(topic)) revisionUrgency = 90;

  // Completion bonus: incomplete topics get a boost so the planner covers syllabus
  const completionBonus = topic.status === 'not_started' ? 20 : topic.status === 'in_progress' ? 10 : 0;

  // Weighted combination
  const priority =
    weaknessScore * 0.30 +
    examUrgency * 0.25 +
    pyqScore * 0.15 +
    importanceScore * 0.15 +
    revisionUrgency * 0.10 +
    completionBonus * 0.05;

  return Math.round(priority);
}

export type TopicPriorityResult = {
  topic: TopicWithMastery;
  subject: Subject;
  priority: number;
  daysUntilExam: number | null;
  reasons: string[];
  suggestedTaskType: TaskType;
  suggestedMinutes: number;
};

export function getTaskTypeForTopic(topic: TopicWithMastery): TaskType {
  if (isRevisionDue(topic)) return 'revision';
  if (topic.mastery_score < 40 && topic.quiz_accuracy < 50) return 'practice';
  if (topic.status === 'completed' && topic.mastery_score >= 60) return 'quiz';
  if (topic.pyq_frequency === 'high') return 'pyq_practice';
  return 'study';
}

export function getPriorityLevel(priority: number): TaskPriority {
  if (priority >= 65) return 'high';
  if (priority >= 40) return 'medium';
  return 'low';
}

export function generateReasons(topic: TopicWithMastery, subject: Subject, daysUntilExam: number | null): string[] {
  const reasons: string[] = [];

  if (topic.mastery_score < 40) {
    reasons.push(`current mastery is ${topic.mastery_score}%`);
  }
  if (topic.quiz_accuracy > 0 && topic.quiz_accuracy < 50) {
    reasons.push(`recent quiz accuracy is low (${Math.round(topic.quiz_accuracy)}%)`);
  }
  if (topic.pyq_frequency === 'high') {
    reasons.push(`topic appeared frequently in uploaded PYQs`);
  }
  if (daysUntilExam !== null && daysUntilExam <= 14) {
    reasons.push(`exam is approaching (${daysUntilExam} days)`);
  }
  if (isRevisionDue(topic)) {
    reasons.push(`revision is due`);
  }
  if (topic.status === 'not_started') {
    reasons.push(`topic hasn't been started yet`);
  }
  if (topic.importance === 'high') {
    reasons.push(`topic is marked as high importance`);
  }
  if (reasons.length === 0) {
    reasons.push(`next topic in your ${subject.name} syllabus`);
  }

  return reasons;
}

// ============ STUDY PLANNER ============

export type PlannerResult = {
  allocations: PlanAllocation[];
  totalMinutes: number;
  availableMinutes: number;
  priorityResults: TopicPriorityResult[];
};

export function generateStudyPlan(
  subjects: Subject[],
  topics: Topic[],
  profile: StudentProfile | null,
  studiedTodayMinutes: number
): PlannerResult {
  const availableHours = profile?.available_hours_per_day ?? 3;
  const sessionLength = profile?.preferred_session_length ?? 45;
  const totalAvailableMinutes = Math.round(availableHours * 60);
  const availableMinutes = Math.max(0, totalAvailableMinutes - studiedTodayMinutes);

  // Enrich all topics with mastery
  const enrichedTopics: { topic: TopicWithMastery; subject: Subject }[] = [];
  for (const subject of subjects) {
    for (const topic of topics) {
      if (topic.subject_id === subject.id) {
        enrichedTopics.push({
          topic: enrichTopicWithMastery(topic),
          subject,
        });
      }
    }
  }

  // Calculate priorities
  const priorityResults: TopicPriorityResult[] = enrichedTopics.map(({ topic, subject }) => {
    const daysUntilExam = getDaysUntilExamFromSubject(subject);
    const priority = calculateTopicPriority({ topic, subject, daysUntilExam });
    const reasons = generateReasons(topic, subject, daysUntilExam);
    const suggestedTaskType = getTaskTypeForTopic(topic);

    return {
      topic,
      subject,
      priority,
      daysUntilExam,
      reasons,
      suggestedTaskType,
      suggestedMinutes: sessionLength,
    };
  });

  // Sort by priority (highest first), skip mastered topics unless revision due
  const sortedPriorities = priorityResults
    .filter((p) => p.topic.mastery_score < 85 || p.topic.is_revision_due || p.topic.status !== 'completed')
    .sort((a, b) => b.priority - a.priority);

  // Allocate time
  const allocations: PlanAllocation[] = [];
  let remainingMinutes = availableMinutes;

  for (const result of sortedPriorities) {
    if (remainingMinutes < 15) break;

    // Allocate session length or remaining time, whichever is smaller
    const minutes = Math.min(result.suggestedMinutes, remainingMinutes);

    allocations.push({
      topic_id: result.topic.id,
      subject_id: result.subject.id,
      topic_name: result.topic.name,
      subject_name: result.subject.name,
      minutes,
      task_type: result.suggestedTaskType,
      priority: getPriorityLevel(result.priority),
      reason: result.reasons.join('; '),
    });

    remainingMinutes -= minutes;
  }

  // Add a quiz task if we have time left and there are weak topics
  const weakTopics = sortedPriorities.filter((p) => p.topic.mastery_score < 50);
  if (remainingMinutes >= 20 && weakTopics.length > 0) {
    const quizTarget = weakTopics[0];
    allocations.push({
      topic_id: quizTarget.topic.id,
      subject_id: quizTarget.subject.id,
      topic_name: quizTarget.topic.name,
      subject_name: quizTarget.subject.name,
      minutes: Math.min(20, remainingMinutes),
      task_type: 'quiz',
      priority: 'medium',
      reason: `Practice quiz to measure understanding of weak topics`,
    });
    remainingMinutes -= Math.min(20, remainingMinutes);
  }

  return {
    allocations,
    totalMinutes: availableMinutes - remainingMinutes,
    availableMinutes,
    priorityResults: sortedPriorities,
  };
}

// ============ DAILY TASK SUGGESTIONS (for Tasks page) ============

export type TaskSuggestion = {
  title: string;
  description: string;
  estimated_minutes: number;
  subject_id: string | null;
  topic_id: string | null;
  reason: string;
  task_type: TaskType;
  priority: TaskPriority;
  source: 'planner';
};

export function generateDailyTaskSuggestions(
  subjects: Subject[],
  topics: Topic[],
  profile: StudentProfile | null,
  existingTaskCount: number
): TaskSuggestion[] {
  const plan = generateStudyPlan(subjects, topics, profile, 0);
  const maxSuggestions = Math.max(0, 5 - existingTaskCount);
  if (maxSuggestions === 0) return [];

  return plan.allocations.slice(0, maxSuggestions).map((alloc) => {
    const taskTypeLabels: Record<TaskType, string> = {
      study: 'Study',
      revision: 'Revise',
      practice: 'Practice',
      quiz: 'Quiz',
      doubt_review: 'Review Doubt',
      pyq_practice: 'PYQ Practice',
    };

    return {
      title: `${taskTypeLabels[alloc.task_type]}: ${alloc.topic_name} (${alloc.subject_name})`,
      description: `Spend ${alloc.minutes} minutes on ${alloc.topic_name}. ${alloc.reason}.`,
      estimated_minutes: alloc.minutes,
      subject_id: alloc.subject_id,
      topic_id: alloc.topic_id,
      reason: alloc.reason,
      task_type: alloc.task_type,
      priority: alloc.priority,
      source: 'planner' as const,
    };
  });
}
