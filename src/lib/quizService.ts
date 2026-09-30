import type { QuizQuestion, Topic } from './types';

// ============ QUIZ GENERATION ============
// Rule-based question generation — NOT AI-generated.
// Generates questions from topic names and properties.
// In production, the backend LLM would generate richer questions.

type GeneratedQuestion = {
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'descriptive' | 'scenario';
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic_id: string | null;
};

const QUESTION_TEMPLATES: Array<{
  type: 'mcq' | 'true_false' | 'descriptive' | 'scenario';
  generate: (topic: Topic, difficulty: string) => GeneratedQuestion;
}> = [
  {
    type: 'mcq',
    generate: (topic) => ({
      question_text: `Which of the following best describes "${topic.name}"?`,
      question_type: 'mcq',
      options: [
        `A fundamental concept that forms the basis of the subject area`,
        `An advanced optimization technique with limited practical use`,
        `A historical method no longer used in modern systems`,
        `A programming language feature specific to one language`,
      ],
      correct_answer: `A fundamental concept that forms the basis of the subject area`,
      explanation: `"${topic.name}" is a core concept. Understanding it is essential for mastering this subject area.`,
      difficulty: topic.difficulty,
      topic_id: topic.id,
    }),
  },
  {
    type: 'mcq',
    generate: (topic) => ({
      question_text: `What is the primary purpose of "${topic.name}"?`,
      question_type: 'mcq',
      options: [
        `To solve a specific class of problems efficiently`,
        `To increase system complexity without benefit`,
        `To replace all other concepts in the subject`,
        `To make code harder to maintain`,
      ],
      correct_answer: `To solve a specific class of problems efficiently`,
      explanation: `"${topic.name}" is designed to address specific problems. Knowing when to apply it is key.`,
      difficulty: topic.difficulty,
      topic_id: topic.id,
    }),
  },
  {
    type: 'true_false',
    generate: (topic) => ({
      question_text: `"${topic.name}" is considered a ${topic.importance} importance topic in the syllabus.`,
      question_type: 'true_false',
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: `This topic is marked as ${topic.importance} importance in your syllabus.`,
      difficulty: 'easy',
      topic_id: topic.id,
    }),
  },
  {
    type: 'true_false',
    generate: (topic) => ({
      question_text: `Understanding "${topic.name}" requires no prior knowledge of related concepts.`,
      question_type: 'true_false',
      options: ['True', 'False'],
      correct_answer: 'False',
      explanation: `Most topics build on related concepts. "${topic.name}" likely has prerequisites.`,
      difficulty: 'easy',
      topic_id: topic.id,
    }),
  },
  {
    type: 'descriptive',
    generate: (topic) => ({
      question_text: `Explain "${topic.name}" with at least two real-world examples.`,
      question_type: 'descriptive',
      options: null,
      correct_answer: `A good answer defines the concept, provides context, and gives relevant examples.`,
      explanation: `Descriptive questions test deep understanding. Structure your answer: definition, explanation, examples.`,
      difficulty: topic.difficulty,
      topic_id: topic.id,
    }),
  },
  {
    type: 'scenario',
    generate: (topic) => ({
      question_text: `You are working on a project where "${topic.name}" is directly applicable. Describe how you would apply it and what challenges you might face.`,
      question_type: 'scenario',
      options: null,
      correct_answer: `A good answer identifies the application context, describes the approach, and anticipates challenges.`,
      explanation: `Scenario-based questions test practical application. Think about real-world constraints.`,
      difficulty: 'hard',
      topic_id: topic.id,
    }),
  },
];

export function generateQuizQuestions(
  topics: Topic[],
  numQuestions: number,
  questionType: 'mcq' | 'true_false' | 'descriptive' | 'scenario' | 'mixed',
  difficulty: 'easy' | 'medium' | 'hard'
): GeneratedQuestion[] {
  if (topics.length === 0) return [];

  const questions: GeneratedQuestion[] = [];
  const targetCount = Math.min(numQuestions, topics.length * 2);

  for (let i = 0; i < targetCount; i++) {
    const topic = topics[i % topics.length];
    const preferredType = questionType === 'mixed' ? undefined : questionType;

    // Filter templates by preferred type
    let templates = QUESTION_TEMPLATES;
    if (preferredType) {
      templates = QUESTION_TEMPLATES.filter((t) => t.type === preferredType);
      if (templates.length === 0) templates = QUESTION_TEMPLATES;
    }

    const template = templates[i % templates.length];
    const question = template.generate(topic, difficulty);
    questions.push({
      ...question,
      difficulty,
    });
  }

  return questions;
}

// ============ AI ASSISTANT SERVICE INTERFACE ============
// This is the interface the frontend uses. All LLM calls must go through
// a backend/edge function — never directly from the frontend.
// Currently returns a rule-based response since no LLM backend is connected.

export type AssistantResponse = {
  content: string;
  topic: string | null;
  source_refs: Array<{ filename: string; page: number | null; chunk_index: number | null }> | null;
  mastery: number | null;
  is_ai_generated: boolean;
};

export function generateAssistantResponse(
  question: string,
  detectedTopic: string,
  topicMastery: number | null,
  sourceChunks: Array<{ filename: string; page: number | null; chunk_index: number; content: string }> | null
): AssistantResponse {
  const hasRAGContext = sourceChunks && sourceChunks.length > 0;

  // Build a grounded response — if RAG context is available, reference it
  let content: string;
  if (hasRAGContext && sourceChunks) {
    const firstChunk = sourceChunks[0];
    content = `Based on your uploaded notes (${firstChunk.filename}${
      firstChunk.page ? `, page ${firstChunk.page}` : ''
    }), here's an explanation of "${detectedTopic}":\n\n`;
    content += firstChunk.content.slice(0, 500) + '...\n\n';
    content += `This concept is fundamental to understanding the broader topic. `;
    if (topicMastery !== null && topicMastery < 50) {
      content += `Since your current mastery is ${topicMastery}%, I recommend reviewing this topic and taking a practice quiz.`;
    } else {
      content += `You seem to have a good grasp of this — try a scenario-based question to deepen your understanding.`;
    }
  } else {
    content = `I can explain "${detectedTopic}" for you. `;
    content += `To give you a more grounded answer based on your specific course material, upload your notes to the Resources page. `;
    content += `Once your documents are indexed, I'll be able to retrieve relevant content from your own study materials before answering.\n\n`;
    content += `For now, here's a general overview: "${detectedTopic}" is a key concept that you should understand in the context of your subject. `;
    if (topicMastery !== null) {
      content += `Your current mastery on this topic is ${topicMastery}%.`;
    }
  }

  return {
    content,
    topic: detectedTopic,
    source_refs: hasRAGContext
      ? sourceChunks!.slice(0, 3).map((c) => ({
          filename: c.filename,
          page: c.page,
          chunk_index: c.chunk_index,
        }))
      : null,
    mastery: topicMastery,
    is_ai_generated: false, // Rule-based until LLM backend is connected
  };
}
