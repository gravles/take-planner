import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, NewTask } from '@/types';
import { useIntegrationToken } from './useIntegrationToken';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const { token: msToken } = useIntegrationToken('azure');

    useEffect(() => {
        fetchTasks();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('tasks-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                (payload) => {
                    fetchTasks(); // Refresh on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchTasks() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('tasks')
                .select('*, category:categories(*)')
                .eq('user_id', session.user.id) // Ensure we only get user's tasks
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
            // Handle Microsoft To Do creation
            if (newTask.source === 'microsoft_todo' && msToken) {
                const response = await fetch(
                    'https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${msToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: newTask.title,
                            importance: newTask.priority === 'high' ? 'high' : 'normal',
                        })
                    }
                );

                if (response.ok) {
                    const msTask = await response.json();
                    newTask.external_id = msTask.id;
                    // We continue to insert into Supabase below
                }
            }

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
            // Handle Microsoft To Do updates
            const task = tasks.find(t => t.id === id);
            if (task?.source === 'microsoft_todo' && task.external_id && msToken) {
                // Map updates to MS Graph fields
                const msUpdates: any = {};
                if (updates.title) msUpdates.title = updates.title;
                if (updates.status) msUpdates.status = updates.status === 'completed' ? 'completed' : 'notStarted';
                if (updates.priority) msUpdates.importance = updates.priority === 'high' ? 'high' : 'normal';

                if (Object.keys(msUpdates).length > 0) {
                    await fetch(
                        `https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks/${task.external_id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                Authorization: `Bearer ${msToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(msUpdates)
                        }
                    );
                }
            }

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
            // Handle Microsoft To Do deletion
            const task = tasks.find(t => t.id === id);
            if (task?.source === 'microsoft_todo' && task.external_id && msToken) {
                await fetch(
                    `https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks/${task.external_id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${msToken}`,
                        }
                    }
                );
            }

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
