import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, Calendar, Clock, X } from 'lucide-react';
import type { Subject, Topic } from '@/lib/types';
import { getColor, SUBJECT_COLORS, formatHours, formatDate, formatDuration } from '@/lib/utils';
import { getSubjectProgress, getDaysUntilExam, calculateStudiedHours } from '@/lib/ai';
import type { StudySession } from '@/lib/types';

type Props = {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  onAddSubject: (data: { name: string; color: string; target_hours: number; exam_date: string | null }) => void;
  onUpdateSubject: (id: string, data: Partial<Subject>) => void;
  onDeleteSubject: (id: string) => void;
  onAddTopic: (data: { subject_id: string; name: string; estimated_hours: number; order_index: number }) => void;
  onUpdateTopic: (id: string, data: Partial<Topic>) => void;
  onDeleteTopic: (id: string) => void;
};

export default function Subjects({
  subjects,
  topics,
  sessions,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', color: 'blue', target_hours: 20, exam_date: '' });
  const [newTopicName, setNewTopicName] = useState<Record<string, string>>({});
  const [newTopicHours, setNewTopicHours] = useState<Record<string, string>>({});

  const handleAddSubject = () => {
    if (!newSubject.name.trim()) return;
    onAddSubject({
      name: newSubject.name.trim(),
      color: newSubject.color,
      target_hours: newSubject.target_hours,
      exam_date: newSubject.exam_date || null,
    });
    setNewSubject({ name: '', color: 'blue', target_hours: 20, exam_date: '' });
    setShowAddForm(false);
  };

  const handleAddTopic = (subjectId: string) => {
    const name = (newTopicName[subjectId] ?? '').trim();
    if (!name) return;
    const hours = parseFloat(newTopicHours[subjectId] ?? '2') || 2;
    const subjectTopics = topics.filter((t) => t.subject_id === subjectId);
    onAddTopic({
      subject_id: subjectId,
      name,
      estimated_hours: hours,
      order_index: subjectTopics.length,
    });
    setNewTopicName((prev) => ({ ...prev, [subjectId]: '' }));
    setNewTopicHours((prev) => ({ ...prev, [subjectId]: '' }));
  };

  const cycleTopicStatus = (topic: Topic) => {
    const next = topic.status === 'not_started' ? 'in_progress' : topic.status === 'in_progress' ? 'completed' : 'not_started';
    onUpdateTopic(topic.id, { status: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subjects</h2>
          <p className="text-gray-500 mt-1">Manage your subjects and break down the syllabus into topics.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Subject</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Name</label>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                placeholder="e.g. Mathematics"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Hours</label>
              <input
                type="number"
                min="1"
                value={newSubject.target_hours}
                onChange={(e) => setNewSubject({ ...newSubject, target_hours: parseFloat(e.target.value) || 20 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Date (optional)</label>
              <input
                type="date"
                value={newSubject.exam_date}
                onChange={(e) => setNewSubject({ ...newSubject, exam_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
              <div className="flex gap-2 flex-wrap">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setNewSubject({ ...newSubject, color: c.name })}
                    className={`w-8 h-8 rounded-lg ${c.bg} transition-all ${
                      newSubject.color === c.name ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubject}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Subject
            </button>
          </div>
        </div>
      )}

      {subjects.length === 0 && !showAddForm ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No subjects yet</p>
          <p className="text-sm text-gray-400">Add your first subject to start building your syllabus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => {
            const color = getColor(subject.color);
            const subjTopics = topics.filter((t) => t.subject_id === subject.id).sort((a, b) => a.order_index - b.order_index);
            const progress = getSubjectProgress(subjTopics);
            const subjSessions = sessions.filter((s) => s.subject_id === subject.id);
            const studiedHours = calculateStudiedHours(subjSessions);
            const daysLeft = getDaysUntilExam(subject.exam_date);
            const isExpanded = expandedId === subject.id;

            return (
              <div key={subject.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : subject.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-1 h-12 rounded-full ${color.bg}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      {daysLeft !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          daysLeft === 0 ? 'bg-rose-50 text-rose-600' : daysLeft <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {daysLeft === 0 ? 'Exam today' : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {progress.completed}/{progress.total} topics
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatHours(studiedHours)} / {formatHours(subject.target_hours)}
                      </span>
                      {subject.exam_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(subject.exam_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color.bg} rounded-full transition-all duration-500`} style={{ width: `${progress.percent}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">{progress.percent}%</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Syllabus Topics</h4>
                      <button
                        onClick={() => onDeleteSubject(subject.id)}
                        className="text-xs text-gray-400 hover:text-rose-600 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete subject
                      </button>
                    </div>

                    {subjTopics.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No topics yet. Add your first topic below.</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {subjTopics.map((topic) => (
                          <div key={topic.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 group">
                            <button
                              onClick={() => cycleTopicStatus(topic)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                topic.status === 'completed'
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : topic.status === 'in_progress'
                                  ? 'border-amber-400 bg-amber-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {topic.status === 'completed' && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {topic.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${topic.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {topic.name}
                              </p>
                              <p className="text-xs text-gray-400">{formatHours(topic.estimated_hours)} estimated</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              topic.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                              topic.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-50 text-gray-400'
                            }`}>
                              {topic.status === 'not_started' ? 'Not started' : topic.status === 'in_progress' ? 'In progress' : 'Done'}
                            </span>
                            <button
                              onClick={() => onDeleteTopic(topic.id)}
                              className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTopicName[subject.id] ?? ''}
                        onChange={(e) => setNewTopicName((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic(subject.id)}
                        placeholder="New topic name..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={newTopicHours[subject.id] ?? ''}
                        onChange={(e) => setNewTopicHours((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic(subject.id)}
                        placeholder="hrs"
                        className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                      <button
                        onClick={() => handleAddTopic(subject.id)}
                        className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
