import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, NewTask } from '@/types';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    async function fetchTasks() {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            if (data) {
                setTasks(data);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    }

    async function addTask(newTask: NewTask) {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert([newTask])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setTasks([data, ...tasks]);
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }

    async function updateTask(id: string, updates: Partial<Task>) {
        try {
            const { error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setTasks(tasks.map(t => (t.id === id ? { ...t, ...updates } : t)));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    return { tasks, loading, addTask, updateTask, refreshTasks: fetchTasks };
}
