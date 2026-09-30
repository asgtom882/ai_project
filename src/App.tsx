import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import Sidebar, { type View } from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Subjects from '@/components/Subjects';
import StudyTimer from '@/components/StudyTimer';
import Tasks from '@/components/Tasks';
import Roadmap from '@/components/Roadmap';
import { useStudentData } from '@/lib/useStudentData';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;
  const data = useStudentData(userId);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your study dashboard...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active={view} onNavigate={setView} onSignOut={handleSignOut} />
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
            sessions={data.sessions}
            tasks={data.tasks}
          />
        )}
      </main>
    </div>
  );
}
