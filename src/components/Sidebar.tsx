import { LayoutDashboard, BookOpen, Timer, CheckSquare, Map, Brain } from 'lucide-react';

export type View = 'dashboard' | 'subjects' | 'timer' | 'tasks' | 'roadmap';

type Props = {
  active: View;
  onNavigate: (view: View) => void;
};

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'timer', label: 'Study Timer', icon: Timer },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'roadmap', label: 'AI Roadmap', icon: Map },
];

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">StudyPilot</h1>
            <p className="text-xs text-gray-500">AI Study Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-4">
          <p className="text-xs font-semibold text-blue-900 mb-1">AI-Powered</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Get personalized roadmaps and daily task suggestions based on your progress.
          </p>
        </div>
      </div>
    </aside>
  );
}
