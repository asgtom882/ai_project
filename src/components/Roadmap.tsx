import { useState, useMemo } from 'react';
import {
  Map, Clock, Calendar, AlertCircle, Sparkles, CheckCircle2,
  Circle, PlayCircle, Brain, TrendingUp, Target, BarChart2,
  AlertTriangle, ChevronRight, RefreshCw, Key,
} from 'lucide-react';
import type { Subject, Topic, StudySession, Task } from '@/lib/types';
import { generateRoadmap, getDaysUntilExam, getSubjectProgress, getRemainingHours } from '@/lib/ai';
import { getAIAnalysis, getAIRoadmap, type AIAnalysisResult, type AIRoadmapResult } from '@/lib/aiService';
import { getColor, formatHours, formatDate } from '@/lib/utils';

type Props = {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  tasks?: Task[];
};

export default function Roadmap({ subjects, topics, sessions, tasks = [] }: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [aiRoadmap, setAiRoadmap] = useState<AIRoadmapResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'analysis'>('roadmap');

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0] ?? null;
  const selectedTopics = topics.filter((t) => t.subject_id === selectedSubject?.id);

  const roadmap = useMemo(() => {
    if (!selectedSubject) return null;
    return generateRoadmap(selectedSubject, selectedTopics);
  }, [selectedSubject, selectedTopics]);

  const progress = useMemo(() => {
    if (!selectedSubject) return null;
    return getSubjectProgress(selectedTopics);
  }, [selectedSubject, selectedTopics]);

  const remainingHours = useMemo(() => getRemainingHours(selectedTopics), [selectedTopics]);

  const handleGetAIAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await getAIAnalysis(subjects, topics, sessions, tasks);
      setAiAnalysis(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setAnalysisError(
        msg.includes('OPENAI_API_KEY')
          ? 'OpenAI API key not configured. Please add your OPENAI_API_KEY in Supabase Edge Function secrets.'
          : msg
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGetAIRoadmap = async () => {
    if (!selectedSubject) return;
    setRoadmapLoading(true);
    setRoadmapError(null);
    setAiRoadmap(null);
    try {
      const result = await getAIRoadmap(subjects, topics, sessions, tasks, selectedSubject.name);
      setAiRoadmap(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setRoadmapError(
        msg.includes('OPENAI_API_KEY')
          ? 'OpenAI API key not configured. Please add your OPENAI_API_KEY in Supabase Edge Function secrets.'
          : msg
      );
    } finally {
      setRoadmapLoading(false);
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Roadmap</h2>
          <p className="text-gray-500 mt-1">Get a personalized study plan based on your syllabus and exam dates.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Map className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No subjects yet</p>
          <p className="text-sm text-gray-400">Add subjects and topics first, then come back for your AI roadmap.</p>
        </div>
      </div>
    );
  }

  const urgencyColor = (urgency: 'low' | 'medium' | 'high') =>
    urgency === 'high' ? 'text-rose-600 bg-rose-50 border-rose-200' :
    urgency === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-emerald-600 bg-emerald-50 border-emerald-200';

  const phaseColor = (priority: 'high' | 'medium' | 'low') =>
    priority === 'high' ? 'border-rose-200 bg-rose-50' :
    priority === 'medium' ? 'border-amber-200 bg-amber-50' :
    'border-emerald-200 bg-emerald-50';

  const phaseDot = (priority: 'high' | 'medium' | 'low') =>
    priority === 'high' ? 'bg-rose-500' :
    priority === 'medium' ? 'bg-amber-500' :
    'bg-emerald-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Roadmap</h2>
          <p className="text-gray-500 mt-1">Personalized study plan + AI analysis of your progress.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'roadmap' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Map className="w-4 h-4" />
            Study Plan
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analysis' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="w-4 h-4" />
            AI Analysis
          </button>
        </div>
      </div>

      {/* ===================== STUDY PLAN TAB ===================== */}
      {activeTab === 'roadmap' && (
        <>
          {/* Subject selector */}
          <div className="flex gap-2 flex-wrap">
            {subjects.map((s) => {
              const color = getColor(s.color);
              const isActive = (selectedSubject?.id ?? subjects[0]?.id) === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSubjectId(s.id); setAiRoadmap(null); setRoadmapError(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? `${color.light} ${color.text} border ${color.border}`
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                  {s.name}
                </button>
              );
            })}
          </div>

          {roadmap && selectedSubject && progress && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-500">Progress</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{progress.percent}%</p>
                  <p className="text-xs text-gray-400 mt-1">{progress.completed} of {progress.total} topics done</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-500">Remaining</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatHours(remainingHours)}</p>
                  <p className="text-xs text-gray-400 mt-1">of study left</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-500">Exam</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {roadmap.days_until_exam !== null ? `${roadmap.days_until_exam}d` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedSubject.exam_date ? formatDate(selectedSubject.exam_date) : 'No date set'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm text-blue-50">Recommended</span>
                  </div>
                  <p className="text-2xl font-bold">{roadmap.recommended_daily_hours}h</p>
                  <p className="text-xs text-blue-100 mt-1">per day to finish on time</p>
                </div>
              </div>

              {/* Urgency banner */}
              {roadmap.days_until_exam !== null && roadmap.days_until_exam <= 7 && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  roadmap.days_until_exam === 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">
                    {roadmap.days_until_exam === 0
                      ? `Your ${selectedSubject.name} exam is today. Focus on quick review and practice problems.`
                      : `Only ${roadmap.days_until_exam} days until your ${selectedSubject.name} exam. Study ${roadmap.recommended_daily_hours}h/day to cover everything.`}
                  </p>
                </div>
              )}

              {/* AI Roadmap Generator */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">AI-Generated Roadmap</p>
                      <p className="text-xs text-gray-500">Let AI create a smarter, phased study plan for {selectedSubject.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGetAIRoadmap}
                    disabled={roadmapLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-60 shadow-sm"
                  >
                    {roadmapLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate AI Roadmap</>
                    )}
                  </button>
                </div>

                {roadmapError && (
                  <div className="mt-4 p-3 bg-white rounded-xl border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                    {roadmapError.includes('API key') ? <Key className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{roadmapError}</span>
                  </div>
                )}

                {/* AI Roadmap Result */}
                {aiRoadmap && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-white rounded-xl border border-blue-100 p-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Overall Strategy</p>
                          <p className="text-sm text-gray-600">{aiRoadmap.overall_strategy}</p>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                            <Target className="w-3 h-3" />
                            {aiRoadmap.daily_hours_recommended}h/day recommended
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phases */}
                    <div className="space-y-3">
                      {aiRoadmap.phases.map((phase) => (
                        <div key={phase.phase} className={`bg-white rounded-xl border p-4 ${phaseColor(phase.priority)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${phaseDot(phase.priority)}`} />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phase {phase.phase}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{phase.duration}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                              phase.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                              phase.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>{phase.priority} priority</span>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{phase.title}</h4>
                          <p className="text-xs text-gray-500 mb-2">{phase.daily_goal}</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {phase.focus_topics.map((t) => (
                              <span key={t} className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-gray-700">{t}</span>
                            ))}
                          </div>
                          <div className="flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg w-fit">
                            <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{phase.milestone}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Exam tips + weak areas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiRoadmap.exam_tips.length > 0 && (
                        <div className="bg-white rounded-xl border border-blue-100 p-4">
                          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                            <Target className="w-4 h-4 text-blue-500" /> Exam Tips
                          </p>
                          <ul className="space-y-1.5">
                            {aiRoadmap.exam_tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiRoadmap.weak_areas.length > 0 && (
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Focus Areas
                          </p>
                          <ul className="space-y-1.5">
                            {aiRoadmap.weak_areas.map((area, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                                {area}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Original rule-based roadmap steps */}
              {roadmap.steps.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">All topics completed!</p>
                  <p className="text-sm text-gray-400 mt-1">You've finished the syllabus. Focus on review and practice.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Map className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Suggested Study Plan</h3>
                    <span className="text-sm text-gray-400">— {roadmap.steps.length} phases</span>
                  </div>

                  <div className="relative">
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100" />
                    <div className="space-y-6">
                      {roadmap.steps.map((step, i) => {
                        const isLast = i === roadmap.steps.length - 1;
                        const stepTopics = selectedTopics.filter((t) => step.topics.includes(t.name));
                        const allCompleted = stepTopics.length > 0 && stepTopics.every((t) => t.status === 'completed');
                        const someCompleted = stepTopics.some((t) => t.status === 'completed');
                        const Icon = allCompleted ? CheckCircle2 : someCompleted ? PlayCircle : Circle;
                        const iconColor = allCompleted ? 'text-emerald-500' : someCompleted ? 'text-amber-500' : 'text-gray-300';

                        return (
                          <div key={i} className="relative flex gap-4">
                            <div className="relative z-10 shrink-0">
                              <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center">
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                              </div>
                            </div>
                            <div className={`flex-1 pb-2 ${isLast ? 'pb-0' : ''}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 font-medium">
                                  ~{step.estimated_days} day{step.estimated_days > 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">{step.description}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {step.topics.map((topicName) => {
                                  const topic = stepTopics.find((t) => t.name === topicName);
                                  const isDone = topic?.status === 'completed';
                                  return (
                                    <span key={topicName} className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                      isDone ? 'bg-emerald-50 text-emerald-600 line-through' : 'bg-gray-50 text-gray-500'
                                    }`}>
                                      {topicName}
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg w-fit">
                                <Sparkles className="w-3 h-3" />
                                {step.milestone}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Topic breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Topic Breakdown</h3>
                <div className="space-y-2">
                  {selectedTopics.sort((a, b) => a.order_index - b.order_index).map((topic) => (
                    <div key={topic.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className={`w-2 h-2 rounded-full ${
                        topic.status === 'completed' ? 'bg-emerald-500' :
                        topic.status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm flex-1 ${topic.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {topic.name}
                      </span>
                      <span className="text-xs text-gray-400">{formatHours(topic.estimated_hours)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        topic.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        topic.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {topic.status === 'not_started' ? 'Not started' : topic.status === 'in_progress' ? 'In progress' : 'Done'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ===================== AI ANALYSIS TAB ===================== */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Header + generate button */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">AI Study Analysis</h3>
                  <p className="text-sm text-gray-500">Deep insights into your study patterns, strengths, and gaps</p>
                </div>
              </div>
              <button
                onClick={handleGetAIAnalysis}
                disabled={analysisLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-60 shadow-sm"
              >
                {analysisLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
                ) : aiAnalysis ? (
                  <><RefreshCw className="w-4 h-4" /> Re-analyze</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Analyze My Progress</>
                )}
              </button>
            </div>

            {!aiAnalysis && !analysisLoading && (
              <p className="text-xs text-blue-600 mt-3 bg-white/60 rounded-lg px-3 py-2 border border-blue-100">
                AI will analyze your study hours, topic completion, exam timelines, and consistency to give you personalized feedback.
              </p>
            )}
          </div>

          {analysisError && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-sm text-rose-700 flex items-start gap-3">
              {analysisError.includes('API key') ? <Key className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium mb-1">{analysisError.includes('API key') ? 'API Key Required' : 'Analysis failed'}</p>
                <p className="text-rose-600">{analysisError}</p>
                {analysisError.includes('API key') && (
                  <p className="text-xs text-rose-500 mt-2">
                    Go to your Supabase project → Edge Functions → Secrets → add <code className="bg-rose-100 px-1 py-0.5 rounded">OPENAI_API_KEY</code>
                  </p>
                )}
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-4">
              {/* Score + assessment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h4 className="font-semibold text-gray-900">Overall Assessment</h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{aiAnalysis.overall_assessment}</p>
                  <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 italic">"{aiAnalysis.motivational_message}"</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 mb-3">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={aiAnalysis.study_habit_score >= 70 ? '#10b981' : aiAnalysis.study_habit_score >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="10"
                        strokeDasharray={`${(aiAnalysis.study_habit_score / 100) * 251} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-bold text-gray-900">{aiAnalysis.study_habit_score}</span>
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Study Habit Score</p>
                  <p className="text-xs text-gray-400 text-center mt-1">{aiAnalysis.consistency_insight}</p>
                </div>
              </div>

              {/* Strengths + improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-emerald-100 p-5">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs text-emerald-700 font-bold">{i + 1}</span>
                        </div>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-2xl border border-amber-100 p-5">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Areas to Improve
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.improvement_areas.map((area, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs text-amber-700 font-bold">{i + 1}</span>
                        </div>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Subject insights */}
              {aiAnalysis.subject_insights.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" /> Subject-by-Subject Insights
                  </h4>
                  <div className="space-y-3">
                    {aiAnalysis.subject_insights.map((si, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 mt-0.5 ${urgencyColor(si.urgency)}`}>
                          {si.urgency}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{si.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{si.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next 7 days */}
              {aiAnalysis.next_7_days_focus.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-5">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" /> Focus for the Next 7 Days
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {aiAnalysis.next_7_days_focus.map((focus, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                        <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700">{focus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
