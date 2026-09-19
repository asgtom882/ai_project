import { useMemo } from 'react';
import { Clock, Flame, TrendingUp, Target, Calendar, BookOpen } from 'lucide-react';
import type { Subject, Topic, StudySession, Task } from '@/lib/types';
import { getWeeklyStudyData, getStreak, calculateStudiedHours, getSubjectProgress, getDaysUntilExam } from '@/lib/ai';
import { getColor, formatDuration, formatHours, formatDate } from '@/lib/utils';

type Props = {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  tasks: Task[];
  onNavigate: (view: 'subjects' | 'timer' | 'tasks' | 'roadmap') => void;
};

export default function Dashboard({ subjects, topics, sessions, tasks, onNavigate }: Props) {
  const weeklyData = useMemo(() => getWeeklyStudyData(sessions), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);
  const totalMinutes = useMemo(() => sessions.reduce((s, ses) => s + ses.duration_minutes, 0), [sessions]);
  const totalHours = totalMinutes / 60;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMinutes = sessions.filter((s) => s.studied_at === todayStr).reduce((s, ses) => s + ses.duration_minutes, 0);

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  const maxWeeklyMinutes = Math.max(...weeklyData.map((d) => d.minutes), 60);

  const upcomingExams = useMemo(() => {
    return subjects
      .filter((s) => s.exam_date)
      .map((s) => ({ subject: s, daysLeft: getDaysUntilExam(s.exam_date) }))
      .filter((x) => x.daysLeft !== null)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
      .slice(0, 3);
  }, [subjects]);

  const subjectProgress = useMemo(() => {
    return subjects.map((s) => {
      const subjTopics = topics.filter((t) => t.subject_id === s.id);
      const progress = getSubjectProgress(subjTopics);
      const subjSessions = sessions.filter((ses) => ses.subject_id === s.id);
      const studiedHours = calculateStudiedHours(subjSessions);
      return { subject: s, ...progress, studiedHours };
    });
  }, [subjects, topics, sessions]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Track your study progress and stay on top of your goals.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Today"
          value={formatDuration(todayMinutes)}
          sublabel="studied today"
          color="blue"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${streak} day${streak === 1 ? '' : 's'}`}
          sublabel={streak > 0 ? 'keep it going!' : 'start studying today'}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="Total"
          value={formatHours(totalHours)}
          sublabel="all-time study"
          color="emerald"
        />
        <StatCard
          icon={Target}
          label="Tasks"
          value={`${pendingTasks}`}
          sublabel={`${completedTasks} completed`}
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">This Week</h3>
              <p className="text-sm text-gray-500">Daily study minutes</p>
            </div>
            <button
              onClick={() => onNavigate('timer')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Log session
            </button>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {weeklyData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 group-hover:opacity-80 ${
                      d.minutes > 0 ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-gray-100'
                    }`}
                    style={{
                      height: `${Math.max((d.minutes / maxWeeklyMinutes) * 100, 4)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">{d.day}</span>
                <span className="text-xs text-gray-400">{d.minutes > 0 ? formatDuration(d.minutes) : '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming exams */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Upcoming Exams</h3>
          </div>
          {upcomingExams.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No exam dates set.</p>
              <button
                onClick={() => onNavigate('subjects')}
                className="text-sm text-blue-600 hover:text-blue-700 mt-2"
              >
                Add exam date
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map(({ subject, daysLeft }) => {
                const color = getColor(subject.color);
                return (
                  <div key={subject.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className={`w-2 h-10 rounded-full ${color.bg}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{subject.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(subject.exam_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${daysLeft === 0 ? 'text-rose-600' : daysLeft! <= 7 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {daysLeft}
                      </p>
                      <p className="text-xs text-gray-400">days</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subject progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Subject Progress</h3>
          </div>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Manage subjects
          </button>
        </div>
        {subjectProgress.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No subjects yet.</p>
            <p className="text-sm text-gray-400">Add your first subject to start tracking progress.</p>
            <button
              onClick={() => onNavigate('subjects')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Add Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectProgress.map(({ subject, percent, total, completed, studiedHours }) => {
              const color = getColor(subject.color);
              return (
                <div key={subject.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                      <span className="font-medium text-gray-900 text-sm">{subject.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{formatHours(studiedHours)} studied</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-10 text-right">{percent}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {completed} of {total} topics completed
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sublabel: string;
  color: 'blue' | 'amber' | 'emerald' | 'violet';
}) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  };
  const c = colors[color];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-[18px] h-[18px] ${c.text}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sublabel}</p>
    </div>
  );
}
