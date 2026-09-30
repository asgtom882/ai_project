import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ============ TYPES ============
type SubjectSummary = {
  name: string;
  color: string;
  exam_date: string | null;
  target_hours: number;
  total_topics: number;
  completed_topics: number;
  in_progress_topics: number;
  studied_hours: number;
  topics: { name: string; status: string; estimated_hours: number }[];
};

type StudyStats = {
  streak: number;
  total_hours: number;
  today_minutes: number;
  weekly_minutes: number;
  weekly_breakdown: { day: string; minutes: number }[];
  pending_tasks: number;
  completed_tasks: number;
};

type AnalysisRequest = {
  subjects: SubjectSummary[];
  stats: StudyStats;
  mode: "analysis" | "roadmap";
  target_subject?: string;
};

type RoadmapPhase = {
  phase: number;
  title: string;
  duration: string;
  focus_topics: string[];
  daily_goal: string;
  milestone: string;
  priority: "high" | "medium" | "low";
};

type AIRoadmap = {
  subject_name: string;
  overall_strategy: string;
  daily_hours_recommended: number;
  phases: RoadmapPhase[];
  exam_tips: string[];
  weak_areas: string[];
};

type AIAnalysis = {
  overall_assessment: string;
  strengths: string[];
  improvement_areas: string[];
  study_habit_score: number;
  consistency_insight: string;
  subject_insights: { subject: string; insight: string; urgency: "low" | "medium" | "high" }[];
  next_7_days_focus: string[];
  motivational_message: string;
};

// ============ PROMPT BUILDERS ============

function buildAnalysisPrompt(req: AnalysisRequest): string {
  const { subjects, stats } = req;

  const subjectLines = subjects.map((s) => {
    const pct = s.total_topics > 0 ? Math.round((s.completed_topics / s.total_topics) * 100) : 0;
    const daysUntilExam = s.exam_date
      ? Math.ceil((new Date(s.exam_date).getTime() - Date.now()) / 86400000)
      : null;
    return [
      `Subject: ${s.name}`,
      `  Syllabus completion: ${pct}% (${s.completed_topics}/${s.total_topics} topics done)`,
      `  Studied so far: ${s.studied_hours.toFixed(1)} hours (target: ${s.target_hours}h)`,
      `  Exam: ${daysUntilExam !== null ? `in ${daysUntilExam} days` : "no date set"}`,
      `  Topics: ${s.topics.map((t) => `${t.name} [${t.status}]`).join(", ")}`,
    ].join("\n");
  }).join("\n\n");

  const weeklyChart = stats.weekly_breakdown
    .map((d) => `  ${d.day}: ${Math.round(d.minutes / 60 * 10) / 10}h`)
    .join("\n");

  return `You are an expert AI study coach analyzing a student's study data. Be specific, actionable, and encouraging.

STUDENT STUDY DATA:
===================
Study streak: ${stats.streak} days
Total study time: ${stats.total_hours.toFixed(1)} hours
Today: ${stats.today_minutes} minutes
This week: ${Math.round(stats.weekly_minutes / 60 * 10) / 10} hours

Weekly breakdown:
${weeklyChart}

Tasks: ${stats.pending_tasks} pending, ${stats.completed_tasks} completed

SUBJECTS:
=========
${subjectLines}

TASK: Analyze this student's study performance and return a JSON object with this exact structure:
{
  "overall_assessment": "2-3 sentence honest assessment of their current study state",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvement_areas": ["area 1", "area 2", "area 3"],
  "study_habit_score": <number 1-100 based on consistency and effort>,
  "consistency_insight": "1-2 sentences about their study consistency pattern",
  "subject_insights": [
    { "subject": "<name>", "insight": "specific insight", "urgency": "low|medium|high" }
  ],
  "next_7_days_focus": ["specific actionable focus 1", "focus 2", "focus 3"],
  "motivational_message": "personalized motivational message"
}

Return ONLY valid JSON. No markdown, no code blocks.`;
}

function buildRoadmapPrompt(req: AnalysisRequest): string {
  const { subjects, stats, target_subject } = req;

  const subject = subjects.find((s) => s.name === target_subject) ?? subjects[0];
  if (!subject) return "";

  const pct = subject.total_topics > 0
    ? Math.round((subject.completed_topics / subject.total_topics) * 100)
    : 0;
  const daysUntilExam = subject.exam_date
    ? Math.ceil((new Date(subject.exam_date).getTime() - Date.now()) / 86400000)
    : null;
  const remainingTopics = subject.topics.filter((t) => t.status !== "completed");
  const remainingHours = remainingTopics.reduce((s, t) => s + t.estimated_hours, 0);
  const studyHoursPerDay = stats.weekly_minutes > 0
    ? Math.round((stats.weekly_minutes / 7 / 60) * 10) / 10
    : 2;

  return `You are an expert study planner. Create a detailed, realistic study roadmap for a student.

STUDENT CONTEXT:
================
Subject: ${subject.name}
Current completion: ${pct}% (${subject.completed_topics} of ${subject.total_topics} topics done)
Study hours logged: ${subject.studied_hours.toFixed(1)}h
Target hours: ${subject.target_hours}h
Remaining study needed: ~${remainingHours}h
Exam: ${daysUntilExam !== null ? `in ${daysUntilExam} days` : "no date set"}
Student's average daily study: ${studyHoursPerDay}h/day (based on this week)
Study streak: ${stats.streak} days

REMAINING TOPICS (in order):
${remainingTopics.map((t, i) => `${i + 1}. ${t.name} — ${t.estimated_hours}h estimated [${t.status}]`).join("\n")}

COMPLETED TOPICS:
${subject.topics.filter((t) => t.status === "completed").map((t) => `✓ ${t.name}`).join(", ") || "None yet"}

TASK: Create a smart, phased study roadmap and return a JSON object with this exact structure:
{
  "subject_name": "${subject.name}",
  "overall_strategy": "2-3 sentence strategy tailored to their pace and timeline",
  "daily_hours_recommended": <number, realistic based on their pace and deadline>,
  "phases": [
    {
      "phase": 1,
      "title": "Phase title",
      "duration": "X days",
      "focus_topics": ["topic1", "topic2"],
      "daily_goal": "Specific goal for each study session",
      "milestone": "What they should be able to do after this phase",
      "priority": "high|medium|low"
    }
  ],
  "exam_tips": ["specific tip 1", "tip 2", "tip 3"],
  "weak_areas": ["area to focus more on 1", "area 2"]
}

Create 3-5 phases. Make it realistic for their current pace. Return ONLY valid JSON. No markdown, no code blocks.`;
}

// ============ OPENAI CALL ============

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ============ HANDLER ============

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured. Add it in Supabase Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AnalysisRequest = await req.json();

    if (!body.subjects || !body.stats) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subjects, stats" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt =
      body.mode === "roadmap"
        ? buildRoadmapPrompt(body)
        : buildAnalysisPrompt(body);

    const raw = await callOpenAI(prompt, apiKey);

    // Parse JSON — strip any accidental markdown fences
    const cleaned = raw.replace(/^```json?\s*/m, "").replace(/```\s*$/m, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify({ result: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
