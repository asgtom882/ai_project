import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, BookOpen, Plus, Trash2 } from 'lucide-react';
import type { Subject, Topic, StudySession } from '@/lib/types';
import { getColor, formatDuration, formatDate } from '@/lib/utils';

type Props = {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  onAddSession: (data: { subject_id: string; topic_id: string | null; duration_minutes: number; studied_at: string; notes: string | null }) => void;
  onDeleteSession: (id: string) => void;
};

export default function StudyTimer({ subjects, topics, sessions, onAddSession, onDeleteSession }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = () => {
    if (!selectedSubject) return;
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (elapsed > 0) {
      const minutes = Math.max(1, Math.round(elapsed / 60));
      onAddSession({
        subject_id: selectedSubject,
        topic_id: selectedTopic || null,
        duration_minutes: minutes,
        studied_at: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || null,
      });
    }
    setElapsed(0);
    setNotes('');
  };

  const handleCancel = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  const handleManualLog = () => {
    const minutes = parseInt(manualMinutes);
    if (!minutes || minutes < 1 || !selectedSubject) return;
    onAddSession({
      subject_id: selectedSubject,
      topic_id: selectedTopic || null,
      duration_minutes: minutes,
      studied_at: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || null,
    });
    setManualMinutes('');
    setNotes('');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const availableTopics = topics.filter((t) => t.subject_id === selectedSubject && t.status !== 'completed');
  const recentSessions = sessions.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Study Timer</h2>
        <p className="text-gray-500 mt-1">Track your study sessions with a live timer or log time manually.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-40 h-40 rounded-full transition-all duration-500 ${
              isRunning ? 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-500/20' : 'bg-gray-50 border-2 border-gray-100'
            }`}>
              <div className="text-center">
                <p className={`font-mono text-3xl font-bold ${isRunning ? 'text-white' : 'text-gray-800'}`}>
                  {formatTime(elapsed)}
                </p>
                <p className={`text-xs mt-1 ${isRunning ? 'text-blue-100' : 'text-gray-400'}`}>
                  {isRunning ? 'studying...' : 'ready'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(''); }}
                disabled={isRunning}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">Select a subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic (optional)</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={isRunning || !selectedSubject}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">No specific topic</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isRunning}
                placeholder="What did you study?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={!selectedSubject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400"
              >
                <Play className="w-4 h-4" />
                Start Timer
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop & Save
              </button>
            )}
            {elapsed > 0 && (
              <button
                onClick={handleCancel}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Manual log + recent sessions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Log Manually</h3>
            <p className="text-sm text-gray-500 mb-4">Already studied? Log the time directly.</p>
            <div className="space-y-3">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="Minutes"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleManualLog}
                  disabled={!selectedSubject || !manualMinutes}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Log
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Sessions</h3>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No sessions logged yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => {
                  const subject = subjects.find((s) => s.id === session.subject_id);
                  const topic = session.topic_id ? topics.find((t) => t.id === session.topic_id) : null;
                  const color = subject ? getColor(subject.color) : getColor('blue');
                  return (
                    <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 group">
                      <div className={`w-1.5 h-8 rounded-full ${color.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {subject?.name ?? 'Unknown subject'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {topic ? topic.name + ' · ' : ''}{formatDate(session.studied_at)}
                          {session.notes ? ` · ${session.notes}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{formatDuration(session.duration_minutes)}</span>
                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
