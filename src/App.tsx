import { useState } from 'react';
import Sidebar, { type View } from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Subjects from '@/components/Subjects';
import StudyTimer from '@/components/StudyTimer';
import Tasks from '@/components/Tasks';
import Roadmap from '@/components/Roadmap';
import { useStudentData } from '@/lib/useStudentData';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const data = useStudentData();

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your study dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active={view} onNavigate={setView} />
      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {view === 'dashboard' && (
          <Dashboard
            subjects={data.subjects}
            topics={data.topics}
            sessions={data.sessions}
            tasks={data.tasks}
            onNavigate={setView}
          />
        )}
        {view === 'subjects' && (
          <Subjects
            subjects={data.subjects}
            topics={data.topics}
            sessions={data.sessions}
            onAddSubject={data.addSubject}
            onUpdateSubject={data.updateSubject}
            onDeleteSubject={data.deleteSubject}
            onAddTopic={data.addTopic}
            onUpdateTopic={data.updateTopic}
            onDeleteTopic={data.deleteTopic}
          />
        )}
        {view === 'timer' && (
          <StudyTimer
            subjects={data.subjects}
            topics={data.topics}
            sessions={data.sessions}
            onAddSession={data.addSession}
            onDeleteSession={data.deleteSession}
          />
        )}
        {view === 'tasks' && (
          <Tasks
            subjects={data.subjects}
            topics={data.topics}
            sessions={data.sessions}
            tasks={data.tasks}
            onAddTask={data.addTask}
            onUpdateTask={data.updateTask}
            onDeleteTask={data.deleteTask}
          />
        )}
        {view === 'roadmap' && (
          <Roadmap
            subjects={data.subjects}
            topics={data.topics}
          />
        )}
      </main>
    </div>
  );
}
