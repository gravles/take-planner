import { useState, useEffect } from 'react';
import { useIntegrationToken } from './useIntegrationToken';

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
            // First, get the default task list
            // For MVP, we'll just fetch from the default 'Tasks' folder
            // Or we can list all task folders: https://graph.microsoft.com/v1.0/me/todo/lists

            // Let's try fetching from the default list first
            const response = await fetch(
                'https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks',
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
            setTasks(data.value || []);
        } catch (err: any) {
            console.error('Error fetching Microsoft To Do tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchTasks();
        }
    }, [token]);

    return { tasks, loading: loading || tokenLoading, error, fetchTasks };
}
