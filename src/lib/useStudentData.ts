import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { Subject, Topic, StudySession, Task } from './types';

export function useStudentData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [subjectsRes, topicsRes, sessionsRes, tasksRes] = await Promise.all([
      supabase.from('subjects').select('*').order('created_at'),
      supabase.from('topics').select('*').order('order_index'),
      supabase.from('study_sessions').select('*').order('studied_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    ]);

    setSubjects((subjectsRes.data as Subject[]) ?? []);
    setTopics((topicsRes.data as Topic[]) ?? []);
    setSessions((sessionsRes.data as StudySession[]) ?? []);
    setTasks((tasksRes.data as Task[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addSubject = useCallback(async (data: Omit<Subject, 'id' | 'created_at'>) => {
    const { data: row } = await supabase.from('subjects').insert(data).select().single();
    if (row) setSubjects((prev) => [...prev, row as Subject]);
    return row;
  }, []);

  const updateSubject = useCallback(async (id: string, data: Partial<Subject>) => {
    const { data: row } = await supabase.from('subjects').update(data).eq('id', id).select().single();
    if (row) setSubjects((prev) => prev.map((s) => (s.id === id ? row as Subject : s)));
    return row;
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopics((prev) => prev.filter((t) => t.subject_id !== id));
    setSessions((prev) => prev.filter((s) => s.subject_id !== id));
    setTasks((prev) => prev.filter((t) => t.subject_id !== id));
  }, []);

  const addTopic = useCallback(async (data: Omit<Topic, 'id' | 'created_at' | 'status'>) => {
    const { data: row } = await supabase.from('topics').insert(data).select().single();
    if (row) setTopics((prev) => [...prev, row as Topic]);
    return row;
  }, []);

  const updateTopic = useCallback(async (id: string, data: Partial<Topic>) => {
    const { data: row } = await supabase.from('topics').update(data).eq('id', id).select().single();
    if (row) setTopics((prev) => prev.map((t) => (t.id === id ? row as Topic : t)));
    return row;
  }, []);

  const deleteTopic = useCallback(async (id: string) => {
    await supabase.from('topics').delete().eq('id', id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addSession = useCallback(async (data: Omit<StudySession, 'id' | 'created_at'>) => {
    const { data: row } = await supabase.from('study_sessions').insert(data).select().single();
    if (row) setSessions((prev) => [row as StudySession, ...prev]);
    return row;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from('study_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addTask = useCallback(async (data: Omit<Task, 'id' | 'created_at' | 'status'>) => {
    const { data: row } = await supabase.from('tasks').insert(data).select().single();
    if (row) setTasks((prev) => [row as Task, ...prev]);
    return row;
  }, []);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const { data: row } = await supabase.from('tasks').update(data).eq('id', id).select().single();
    if (row) setTasks((prev) => prev.map((t) => (t.id === id ? row as Task : t)));
    return row;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    subjects,
    topics,
    sessions,
    tasks,
    loading,
    fetchAll,
    addSubject,
    updateSubject,
    deleteSubject,
    addTopic,
    updateTopic,
    deleteTopic,
    addSession,
    deleteSession,
    addTask,
    updateTask,
    deleteTask,
  };
}
