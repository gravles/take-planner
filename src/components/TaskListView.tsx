import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format, isBefore, isToday, isTomorrow, isThisWeek, addDays, startOfDay, parseISO } from 'date-fns';
import { useState } from 'react';
import { EventDetailsModal } from './EventDetailsModal';

interface TaskListViewProps {
    tasks: Task[];
    categories: Category[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

export function TaskListView({ tasks, categories, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: TaskListViewProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Filter out completed tasks (or maybe show them in a history section? For now, hide/separate)
    // The "Upcoming" view usually focuses on active tasks.
    const activeTasks = tasks.filter(t => t.status !== 'completed');

    // Grouping
    const groups = {
        overdue: [] as Task[],
        today: [] as Task[],
        tomorrow: [] as Task[],
        thisWeek: [] as Task[],
        later: [] as Task[],
        unscheduled: [] as Task[]
    };

    const now = new Date();
    const todayStart = startOfDay(now);

    activeTasks.forEach(task => {
        if (!task.scheduled_at) {
            groups.unscheduled.push(task);
            return;
        }

        const date = new Date(task.scheduled_at);

        if (isBefore(date, todayStart)) {
            groups.overdue.push(task);
        } else if (isToday(date)) {
            groups.today.push(task);
        } else if (isTomorrow(date)) {
            groups.tomorrow.push(task);
        } else if (isThisWeek(date, { weekStartsOn: 1 })) { // Adjust week start as needed
            groups.thisWeek.push(task);
        } else {
            groups.later.push(task);
        }
    });

    // Helper to render a group
    const renderGroup = (title: string, groupTasks: Task[], colorClass: string, emptyMessage?: string) => {
        if (groupTasks.length === 0) return null;

        return (
            <div className="space-y-3">
                <h3 className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur py-2 z-10", colorClass)}>
                    {title}
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        {groupTasks.length}
                    </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {groupTasks.map(task => (
                        <div key={task.id} className="h-full">
                            <TaskCard
                                task={task}
                                categories={categories}
                                onFocus={onFocus}
                                onEdit={onEdit}
                                onToggleComplete={onToggleComplete}
                                onUnschedule={onUnschedule}
                                onDelete={onDelete}
                                onSelect={setSelectedTask}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (activeTasks.length === 0 && tasks.length === 0) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-white dark:bg-slate-950/50 p-8">
                <div className="max-w-md text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative w-72 h-72 mx-auto">
                        <Image
                            src="/images/empty-state.png"
                            alt="No tasks"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">All Clear!</h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            You have no upcoming tasks. Enjoy your free time!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4 md:p-8 scrollbar-gutter-stable">
            <EventDetailsModal
                task={selectedTask}
                categories={categories}
                onClose={() => setSelectedTask(null)}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onEdit={onEdit}
            />

            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Upcoming Tasks</h2>
                </div>

                {renderGroup("Overdue", groups.overdue, "text-rose-600 dark:text-rose-400")}
                {renderGroup("Today", groups.today, "text-blue-600 dark:text-blue-400")}
                {renderGroup("Tomorrow", groups.tomorrow, "text-amber-600 dark:text-amber-400")}
                {renderGroup("This Week", groups.thisWeek, "text-slate-600 dark:text-slate-400")}
                {renderGroup("Later", groups.later, "text-slate-500 dark:text-slate-500")}

                {renderGroup("Unscheduled", groups.unscheduled, "text-slate-400 dark:text-slate-500")}
            </div>
        </div>
    );
}
