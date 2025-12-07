import { useState, useEffect } from 'react';
import { useIntegrationToken } from './useIntegrationToken';
import { supabase } from '@/lib/supabase';

export interface MSToDoTask {
    id: string;
    title: string;
    status: 'notStarted' | 'completed';
    importance: 'low' | 'normal' | 'high';
    isReminderOn: boolean;
    createdDateTime: string;
    lastModifiedDateTime: string;
    dueDateTime?: { dateTime: string; timeZone: string };
    body?: { content: string; contentType: string };
}

export function useMicrosoftToDo() {
    const [tasks, setTasks] = useState<MSToDoTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token, loading: tokenLoading } = useIntegrationToken('azure');

    const fetchTasks = async () => {
        if (!token) return;

        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Lists
            const listsResponse = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!listsResponse.ok) throw new Error(`Failed to fetch lists: ${listsResponse.statusText}`);

            const listsData = await listsResponse.json();
            const msLists: any[] = listsData.value || [];

            // 2. Sync Lists to Categories
            const categoryMap = await syncListsToCategories(msLists);

            // 3. Fetch Tasks from ALL lists
            let allMsTasks: MSToDoTask[] = [];

            for (const list of msLists) {
                const tasksResponse = await fetch(
                    `https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (tasksResponse.ok) {
                    const tasksData = await tasksResponse.json();
                    const tasks = tasksData.value || [];
                    // Attach the list ID as a temporary property to help with mapping
                    const tasksWithListId = tasks.map((t: any) => ({ ...t, listId: list.id }));
                    allMsTasks = [...allMsTasks, ...tasksWithListId];
                }
            }

            setTasks(allMsTasks);

            // 4. Sync Tasks to Supabase (passing the category map)
            await syncTasksToSupabase(allMsTasks, categoryMap);

        } catch (err: any) {
            console.error('Error fetching Microsoft To Do data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const syncListsToCategories = async (msLists: any[]) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return new Map();

        // Prepare upsert data
        const upsertData = msLists.map(list => ({
            user_id: session.user.id,
            name: list.displayName,
            color: '#0078D7', // Default MS Blue
            source: 'microsoft_todo',
            external_id: list.id
        }));

        // Fetch existing to preserve IDs
        const { data: existingCats } = await supabase
            .from('categories')
            .select('id, external_id')
            .eq('user_id', session.user.id)
            .eq('source', 'microsoft_todo');

        const existingMap = new Map(existingCats?.map(c => [c.external_id, c.id]));

        const finalUpsert = upsertData.map(c => {
            const existingId = existingMap.get(c.external_id);
            if (existingId) {
                return { ...c, id: existingId };
            }
            return c;
        });

        if (finalUpsert.length > 0) {
            const { data, error } = await supabase
                .from('categories')
                .upsert(finalUpsert, { onConflict: 'user_id,external_id' })
                .select();

            if (error) console.error('Error syncing categories:', error);

            // Return map of external_id -> supabase_id
            if (data) {
                return new Map(data.map(c => [c.external_id, c.id]));
            }
        }

        return existingMap; // Fallback
    };

    const syncTasksToSupabase = async (msTasks: any[], categoryMap: Map<string, string>) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const tasksToUpsert = msTasks.map(msTask => {
            // Determine category_id from the listId we attached
            const categoryId = categoryMap.get(msTask.listId) || null;

            return {
                user_id: session.user.id,
                title: msTask.title,
                description: msTask.body?.content || null,
                status: 'todo',
                priority: msTask.importance === 'high' ? 'high' : msTask.importance === 'low' ? 'low' : 'medium',
                source: 'microsoft_todo',
                external_id: msTask.id,
                created_at: msTask.createdDateTime,
                duration_minutes: 15,
                category_id: categoryId
            };
        });

        // 1. Fetch existing tasks with this source
        const { data: existingTasks } = await supabase
            .from('tasks')
            .select('external_id, scheduled_at, duration_minutes, id')
            .eq('user_id', session.user.id)
            .eq('source', 'microsoft_todo');

        const existingMap = new Map(existingTasks?.map(t => [t.external_id, t]));

        const finalUpsertData = tasksToUpsert.map(t => {
            const existing = existingMap.get(t.external_id);
            if (existing) {
                return {
                    ...t,
                    id: existing.id,
                    scheduled_at: existing.scheduled_at,
                    duration_minutes: existing.duration_minutes,
                    // We overwrite category_id because MS To Do is the source of truth for lists
                };
            }
            return t;
        });

        if (finalUpsertData.length > 0) {
            await supabase
                .from('tasks')
                .upsert(finalUpsertData, { onConflict: 'user_id,external_id' });
        }
    };

    useEffect(() => {
        if (token) {
            fetchTasks();
        }
    }, [token]);

    const toggleComplete = async (task: MSToDoTask) => {
        if (!token) return;

        const newStatus = task.status === 'completed' ? 'notStarted' : 'completed';

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === task.id ? { ...t, status: newStatus } : t
        ));

        try {
            const response = await fetch(
                `https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks/${task.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update task status');
            }
        } catch (err) {
            console.error('Error updating Microsoft To Do task:', err);
            // Revert optimistic update
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: task.status } : t
            ));
        }
    };

    return { tasks, loading: loading || tokenLoading, error, fetchTasks, toggleComplete };
}
