export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
    id: string;
    created_at: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    priority: TaskPriority;
    status: TaskStatus;
    scheduled_at: string | null;
    user_id: string;
}

export type NewTask = Omit<Task, 'id' | 'created_at' | 'user_id'>;
