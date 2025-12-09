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
            let externalId = null;
            let source = newTask.source || 'supabase';

            // Default to Microsoft To Do if connected and no specific category is chosen
            if (!newTask.category_id && msToken && !newTask.source) {
                source = 'microsoft_todo';
            }

            // Check if category belongs to Microsoft To Do
            if (newTask.category_id && msToken) {
                const { data: category } = await supabase
                    .from('categories')
                    .select('source, external_id')
                    .eq('id', newTask.category_id)
                    .single();

                if (category?.source === 'microsoft_todo' && category.external_id) {
                    source = 'microsoft_todo';
                    // Create in MS To Do List
                    const response = await fetch(
                        `https://graph.microsoft.com/v1.0/me/todo/lists/${category.external_id}/tasks`,
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${msToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                title: newTask.title,
                                importance: newTask.priority === 'high' ? 'high' : 'normal',
                                dueDateTime: newTask.scheduled_at ? {
                                    dateTime: newTask.scheduled_at,
                                    timeZone: 'UTC'
                                } : undefined
                            })
                        }
                    );

                    if (response.ok) {
                        const msTask = await response.json();
                        externalId = msTask.id;
                    } else if (response.status === 401) {
                        console.warn('MS To Do Token invalid (401). Task will be created locally only.');
                    }
                }
            }

            // Fallback: If source is explicitly MS To Do but no category (default list)
            if (source === 'microsoft_todo' && !externalId && msToken) {
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
                    externalId = msTask.id;
                } else if (response.status === 401) {
                    console.warn('MS To Do Token invalid (401). Task will be created locally only.');
                }
            }

            const { data, error } = await supabase
                .from('tasks')
                .insert([{ ...newTask, source, external_id: externalId }])
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
            const task = tasks.find(t => t.id === id);
            if (!task) return false;

            // Handle Microsoft To Do updates
            if (task.source === 'microsoft_todo' && task.external_id && msToken) {
                // Map updates to MS Graph fields
                const msUpdates: any = {};
                if (updates.title) msUpdates.title = updates.title;
                if (updates.status) msUpdates.status = updates.status === 'completed' ? 'completed' : 'notStarted';
                if (updates.priority) msUpdates.importance = updates.priority === 'high' ? 'high' : 'normal';

                // Sync Scheduling
                if (updates.scheduled_at !== undefined) {
                    if (updates.scheduled_at === null) {
                        // Clear due date
                        msUpdates.dueDateTime = null;
                    } else {
                        // Set due date
                        msUpdates.dueDateTime = {
                            dateTime: updates.scheduled_at,
                            timeZone: 'UTC'
                        };
                    }
                }

                if (Object.keys(msUpdates).length > 0) {
                    let url = `https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks/${task.external_id}`; // Default fallback

                    if (task.category_id) {
                        const { data: category } = await supabase
                            .from('categories')
                            .select('external_id')
                            .eq('id', task.category_id)
                            .single();

                        if (category?.external_id) {
                            url = `https://graph.microsoft.com/v1.0/me/todo/lists/${category.external_id}/tasks/${task.external_id}`;
                        }
                    }

                    const res = await fetch(url, {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${msToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(msUpdates)
                    });

                    if (res.status === 401) {
                        console.warn('MS To Do Token invalid (401). Sync failed.');
                    }
                }
            }

            // Handle Recurrence: Create next task if completing a recurring task
            if (updates.status === 'completed' && task.recurrence && task.status !== 'completed') {
                const nextDate = new Date(task.scheduled_at || new Date());

                switch (task.recurrence) {
                    case 'daily':
                        nextDate.setDate(nextDate.getDate() + 1);
                        break;
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + 7);
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        break;
                    case 'yearly':
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                        break;
                }

                // Create the new task
                await addTask({
                    title: task.title,
                    description: task.description,
                    duration_minutes: task.duration_minutes,
                    priority: task.priority,
                    status: 'todo',
                    scheduled_at: nextDate.toISOString(),
                    recurrence: task.recurrence, // Propagate recurrence
                    category_id: task.category_id,
                    source: task.source, // Keep source? If MS To Do, it might duplicate there too if we aren't careful.
                    // For MS To Do, they handle recurrence natively usually. 
                    // If we create a new task here for MS To Do source, it will create a NEW separate task in MS To Do.
                    // This is probably desired if we are managing recurrence ourselves.
                });
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
                const res = await fetch(
                    `https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks/${task.external_id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${msToken}`,
                        }
                    }
                );
                if (res.status === 401) {
                    console.warn('MS To Do Token invalid (401). Deletion failed remotely.');
                }
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
