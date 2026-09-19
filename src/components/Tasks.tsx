import { useState, useMemo } from 'react';
import { Plus, Trash2, Check, SkipForward, Sparkles, Clock, Calendar, X } from 'lucide-react';
import type { Subject, Topic, StudySession, Task } from '@/lib/types';
import { generateDailyTasks } from '@/lib/ai';
import { getColor, formatDuration, formatRelativeDate } from '@/lib/utils';

type Props = {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  tasks: Task[];
  onAddTask: (data: { subject_id: string | null; topic_id: string | null; title: string; description: string | null; estimated_minutes: number; due_date: string | null; source: 'ai' | 'manual' }) => void;
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
};

export default function Tasks({ subjects, topics, sessions, tasks, onAddTask, onUpdateTask, onDeleteTask }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', subject_id: '', estimated_minutes: 30, due_date: '' });

  const aiSuggestions = useMemo(
    () => generateDailyTasks(subjects, topics, sessions, tasks),
    [subjects, topics, sessions, tasks]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.due_date === today || (t.status === 'pending' && !t.due_date));
  const upcomingTasks = tasks.filter((t) => t.due_date && t.due_date > today && t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    onAddTask({
      title: newTask.title.trim(),
      subject_id: newTask.subject_id || null,
      topic_id: null,
      description: null,
      estimated_minutes: newTask.estimated_minutes,
      due_date: newTask.due_date || today,
      source: 'manual',
    });
    setNewTask({ title: '', subject_id: '', estimated_minutes: 30, due_date: '' });
    setShowAddForm(false);
  };

  const handleAcceptSuggestion = (s: ReturnType<typeof generateDailyTasks>[number]) => {
    onAddTask({
      subject_id: s.subject_id,
      topic_id: s.topic_id,
      title: s.title,
      description: s.description,
      estimated_minutes: s.estimated_minutes,
      due_date: today,
      source: 'ai',
    });
  };

  const renderTask = (task: Task) => {
    const subject = task.subject_id ? subjects.find((s) => s.id === task.subject_id) : null;
    const topic = task.topic_id ? topics.find((t) => t.id === task.topic_id) : null;
    const color = subject ? getColor(subject.color) : null;
    const isCompleted = task.status === 'completed';
    const isSkipped = task.status === 'skipped';

    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 p-4 rounded-xl border transition-all group ${
          isCompleted ? 'bg-emerald-50/50 border-emerald-100' :
          isSkipped ? 'bg-gray-50 border-gray-100 opacity-60' :
          'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <button
          onClick={() => onUpdateTask(task.id, { status: isCompleted ? 'pending' : 'completed' })}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
            isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {task.title}
            </p>
            {task.source === 'ai' && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {subject && color && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full ${color.bg}`} />
                {subject.name}
              </span>
            )}
            {topic && <span className="text-xs text-gray-400">{topic.name}</span>}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatDuration(task.estimated_minutes)}
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {formatRelativeDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isCompleted && (
            <button
              onClick={() => onUpdateTask(task.id, { status: 'skipped' })}
              className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-100"
              title="Skip"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-500 mt-1">AI-suggested and manual tasks to keep you on track.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
              <p className="text-sm text-gray-500">Based on your progress, these are today's priorities.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiSuggestions.map((s, i) => {
              const subject = s.subject_id ? subjects.find((sub) => sub.id === s.subject_id) : null;
              const color = subject ? getColor(subject.color) : getColor('blue');
              return (
                <div key={i} className="bg-white rounded-xl border border-blue-100 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${color.bg} mt-1.5 shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                      {s.reason}
                    </span>
                    <button
                      onClick={() => handleAcceptSuggestion(s)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Task</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Title</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="e.g. Review chapter 5 problems"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject (optional)</label>
              <select
                value={newTask.subject_id}
                onChange={(e) => setNewTask({ ...newTask, subject_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Minutes</label>
              <input
                type="number"
                min="5"
                step="5"
                value={newTask.estimated_minutes}
                onChange={(e) => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Task
            </button>
          </div>
        </div>
      )}

      {/* Today's tasks */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Today</h3>
        {todayTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Check className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No tasks for today. Add one or accept an AI suggestion above.</p>
          </div>
        ) : (
          <div className="space-y-2">{todayTasks.map(renderTask)}</div>
        )}
      </div>

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Upcoming</h3>
          <div className="space-y-2">{upcomingTasks.map(renderTask)}</div>
        </div>
      )}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Completed ({completedTasks.length})</h3>
          <div className="space-y-2">{completedTasks.slice(0, 10).map(renderTask)}</div>
        </div>
      )}
    </div>
  );
}
