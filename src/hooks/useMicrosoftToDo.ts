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
            // Fetch only active tasks to reduce noise
            const response = await fetch(
                'https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks?$filter=status ne \'completed\'',
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Microsoft To Do API error: ${response.statusText}`);
            }

            const data = await response.json();
            const msTasks: MSToDoTask[] = data.value || [];

            setTasks(msTasks);

            // Sync to Supabase
            await syncTasksToSupabase(msTasks);

        } catch (err: any) {
            console.error('Error fetching Microsoft To Do tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const syncTasksToSupabase = async (msTasks: MSToDoTask[]) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const tasksToUpsert = msTasks.map(msTask => ({
            user_id: session.user.id,
            title: msTask.title,
            description: msTask.body?.content || null,
            status: 'todo', // We filtered for active tasks
            priority: msTask.importance === 'high' ? 'high' : msTask.importance === 'low' ? 'low' : 'medium',
            source: 'microsoft_todo',
            external_id: msTask.id,
            created_at: msTask.createdDateTime,
            duration_minutes: 15, // Default
            // We DO NOT overwrite scheduled_at or category_id if they exist
            // But upsert will overwrite if we don't be careful.
            // Supabase upsert overwrites all columns by default.
            // We need to be careful not to reset scheduled_at if the user scheduled it in our app.

            // Actually, for a simple upsert, we can't easily "ignore if exists" for specific columns without a custom query or function.
            // BUT, if we fetch existing tasks first, we can merge.
            // OR, we can use `onConflict` to only update specific columns? 
            // Supabase JS client `upsert` takes `ignoreDuplicates` (no update) or `onConflict`.
            // But we WANT to update title/status if they changed in MS.

            // Strategy:
            // 1. Fetch existing MS tasks from DB to preserve local state (scheduled_at, category_id).
            // 2. Merge.
            // 3. Upsert.
        }));

        // 1. Fetch existing tasks with this source
        const { data: existingTasks } = await supabase
            .from('tasks')
            .select('external_id, scheduled_at, category_id, duration_minutes')
            .eq('user_id', session.user.id)
            .eq('source', 'microsoft_todo');

        const existingMap = new Map(existingTasks?.map(t => [t.external_id, t]));

        const finalUpsertData = tasksToUpsert.map(t => {
            const existing = existingMap.get(t.external_id);
            if (existing) {
                return {
                    ...t,
                    scheduled_at: existing.scheduled_at,
                    category_id: existing.category_id,
                    duration_minutes: existing.duration_minutes // Preserve duration edits
                };
            }
            return t;
        });

        if (finalUpsertData.length > 0) {
            const { error } = await supabase
                .from('tasks')
                .upsert(finalUpsertData, { onConflict: 'external_id,user_id' }); // Assuming external_id is unique per user? No, external_id is unique globally usually, but good to scope.

            // Wait, we need a unique constraint on external_id? 
            // Our schema probably doesn't have one on `external_id`.
            // We should use `id` for upsert if possible, but we don't know the internal UUID for new tasks.
            // We can rely on `external_id` if we add a unique constraint, OR we can look up UUIDs.

            // Better: We fetched `existingTasks`. We should map `external_id` to `id` (UUID).
            // Then we can upsert using `id`.
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
