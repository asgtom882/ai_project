import { useState, useMemo } from 'react';
import { Map, Clock, Calendar, AlertCircle, Sparkles, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import type { Subject, Topic } from '@/lib/types';
import { generateRoadmap, getDaysUntilExam, getSubjectProgress, getRemainingHours } from '@/lib/ai';
import { getColor, formatHours, formatDate } from '@/lib/utils';

type Props = {
  subjects: Subject[];
  topics: Topic[];
};

export default function Roadmap({ subjects, topics }: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Roadmap</h2>
        <p className="text-gray-500 mt-1">A personalized study plan based on your syllabus and exam dates.</p>
      </div>

      {/* Subject selector */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map((s) => {
          const color = getColor(s.color);
          const isActive = (selectedSubject?.id ?? subjects[0]?.id) === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
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

          {/* Roadmap steps */}
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
                <h3 className="font-semibold text-gray-900">Your Study Plan</h3>
                <span className="text-sm text-gray-400">— {roadmap.steps.length} phases</span>
              </div>

              <div className="relative">
                {/* Vertical line */}
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
                                <span
                                  key={topicName}
                                  className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                    isDone
                                      ? 'bg-emerald-50 text-emerald-600 line-through'
                                      : 'bg-gray-50 text-gray-500'
                                  }`}
                                >
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

          {/* Topic status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Topic Breakdown</h3>
            <div className="space-y-2">
              {selectedTopics
                .sort((a, b) => a.order_index - b.order_index)
                .map((topic) => {
                  const color = getColor(selectedSubject.color);
                  return (
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
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
