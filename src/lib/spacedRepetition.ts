import type { Topic, RevisionItem } from './types';

// ============ SPACED REPETITION ============
// Educational scheduling mechanism — not a medical/scientific guarantee.
// Intervals adapt based on quiz performance.

const BASE_INTERVALS = [1, 3, 7, 14, 30, 60];

export function getNextRevisionInterval(
  currentInterval: number,
  performance: number | null,
  revisionCount: number
): number {
  // If no performance data, use base progression
  if (performance === null) {
    const idx = Math.min(revisionCount, BASE_INTERVALS.length - 1);
    return BASE_INTERVALS[idx];
  }

  // Poor performance: shorten interval (go back or stay)
  if (performance < 40) {
    return Math.max(1, Math.round(currentInterval * 0.5));
  }

  // Mediocre: keep current interval
  if (performance < 70) {
    return currentInterval;
  }

  // Good performance: increase interval
  const nextIdx = Math.min(revisionCount + 1, BASE_INTERVALS.length - 1);
  return BASE_INTERVALS[nextIdx];
}

export function getNextRevisionDate(intervalDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().slice(0, 10);
}

export function computeInitialRevisionDate(topic: Topic): string | null {
  if (topic.status === 'not_started') return null;
  // Topics just studied get a 1-day initial revision
  if (topic.last_studied) {
    return getNextRevisionDate(1);
  }
  return null;
}

export function categorizeRevisions(
  revisions: RevisionItem[]
): { dueToday: RevisionItem[]; upcoming: RevisionItem[]; completed: RevisionItem[] } {
  const today = new Date().toISOString().slice(0, 10);
  return {
    dueToday: revisions
      .filter((r) => r.status === 'pending' && r.revision_date <= today)
      .sort((a, b) => a.revision_date.localeCompare(b.revision_date)),
    upcoming: revisions
      .filter((r) => r.status === 'pending' && r.revision_date > today)
      .sort((a, b) => a.revision_date.localeCompare(b.revision_date)),
    completed: revisions
      .filter((r) => r.status === 'completed')
      .sort((a, b) => b.revision_date.localeCompare(a.revision_date)),
  };
}

// ============ ADAPTIVE QUIZ DIFFICULTY ============

export function suggestNextDifficulty(
  currentDifficulty: 'easy' | 'medium' | 'hard',
  accuracy: number
): 'easy' | 'medium' | 'hard' {
  // High accuracy (>=80%): bump up difficulty
  if (accuracy >= 80) {
    if (currentDifficulty === 'easy') return 'medium';
    if (currentDifficulty === 'medium') return 'hard';
    return 'hard';
  }
  // Low accuracy (<50%): drop difficulty
  if (accuracy < 50) {
    if (currentDifficulty === 'hard') return 'medium';
    if (currentDifficulty === 'medium') return 'easy';
    return 'easy';
  }
  // Moderate: keep same
  return currentDifficulty;
}

// ============ DOUBT CONCEPT DETECTION ============

export function detectConcept(question: string): string {
  const lower = question.toLowerCase();
  // Simple keyword-based concept detection
  // In production this would use NLP/embeddings
  const conceptPatterns: Record<string, string[]> = {
    'Recursion': ['recursion', 'recursive', 'recursive function', 'base case'],
    'Transactions': ['transaction', 'acid', 'commit', 'rollback', 'serializability'],
    'Indexing': ['index', 'b-tree', 'hash index', 'indexing'],
    'Deadlocks': ['deadlock', 'lock', 'wait'],
    'Normalization': ['normalization', 'normal form', 'bcnf', '3nf', '2nf', '1nf'],
    'Backpropagation': ['backpropagation', 'backprop', 'gradient descent'],
    'Congestion Control': ['congestion', 'flow control', 'tcp'],
    'Scheduling': ['scheduling', 'round robin', 'fcfs', 'sjf'],
    'Paging': ['paging', 'page fault', 'virtual memory'],
    'SQL': ['sql', 'query', 'join', 'select'],
  };

  for (const [concept, keywords] of Object.entries(conceptPatterns)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return concept;
    }
  }

  return 'General';
}

export function findRepeatedConcepts(doubts: Array<{ question: string; detected_concept: string | null }>): Map<string, number> {
  const conceptCounts = new Map<string, number>();
  for (const doubt of doubts) {
    const concept = doubt.detected_concept || detectConcept(doubt.question);
    conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
  }
  return conceptCounts;
}
