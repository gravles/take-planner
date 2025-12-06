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
                .select('*, category:categories(*)')
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
                return true;
            }
        } catch (error) {
            console.error('Error adding task:', error);
            return false;
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
            return true;
        } catch (error) {
            console.error('Error updating task:', error);
            return false;
        }
    }

    async function deleteTask(id: string) {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTasks(tasks.filter(t => t.id !== id));
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            return false;
        }
    }

    return { tasks, loading, addTask, updateTask, deleteTask, refreshTasks: fetchTasks };
}
