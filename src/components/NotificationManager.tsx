import { useEffect, useRef } from 'react';
import { Task } from '@/types';

interface NotificationManagerProps {
    tasks: Task[];
}

export function NotificationManager({ tasks }: NotificationManagerProps) {
    const notifiedTasks = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Request permission on mount
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const checkMissedTasks = () => {
            if (Notification.permission !== 'granted') return;

            const now = new Date();

            tasks.forEach(task => {
                if (!task.scheduled_at || task.status === 'completed') return;

                const scheduledTime = new Date(task.scheduled_at);

                // If task is scheduled in the past (missed) and we haven't notified yet
                if (scheduledTime < now && !notifiedTasks.current.has(task.id)) {
                    try {
                        new Notification('Missed Task', {
                            body: `You missed: ${task.title}`,
                            icon: '/favicon.ico' // Fallback icon
                        });
                    } catch (e) {
                        console.error('Failed to create notification:', e);
                    }

                    notifiedTasks.current.add(task.id);
                }
            });
        };

        // Check every minute
        const interval = setInterval(checkMissedTasks, 60000);

        // Initial check
        checkMissedTasks();

        return () => clearInterval(interval);
    }, [tasks]);

    return null; // Headless component
}
