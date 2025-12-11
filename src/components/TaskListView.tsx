import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
    const unscheduledTasks = tasks.filter(t => !t.scheduled_at && t.status !== 'completed');
    const scheduledTasks = tasks.filter(t => t.scheduled_at && t.status !== 'completed');
    const completedTasks = tasks
        .filter(t => t.status === 'completed')
        .sort((a, b) => {
            if (!a.completed_at && !b.completed_at) return 0;
            if (!a.completed_at) return 1;
            if (!b.completed_at) return -1;
            return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        });

    const renderTaskGroup = (groupTasks: Task[]) => {
        // Group by category
        const categorized: Record<string, Task[]> = {};
        const uncategorized: Task[] = [];

        groupTasks.forEach(task => {
            if (task.category_id) {
                if (!categorized[task.category_id]) categorized[task.category_id] = [];
                categorized[task.category_id].push(task);
            } else {
                uncategorized.push(task);
            }
        });

        return (
            <div className="space-y-6">
                {/* Uncategorized */}
                {uncategorized.length > 0 && (
                    <div className="space-y-2">
                        {categories.length > 0 && <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No Category</h4>}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {uncategorized.map(task => (
                                <div key={task.id} className="h-32">
                                    <TaskCard
                                        task={task}
                                        onFocus={onFocus}
                                        onEdit={onEdit}
                                        onToggleComplete={onToggleComplete}
                                        onUnschedule={onUnschedule}
                                        onDelete={onDelete}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Categorized */}
                {categories.map(category => {
                    const catTasks = categorized[category.id];
                    if (!catTasks || catTasks.length === 0) return null;

                    return (
                        <div key={category.id} className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                                {category.name}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {catTasks.map(task => (
                                    <div key={task.id} className="h-32">
                                        <TaskCard
                                            task={task}
                                            onFocus={onFocus}
                                            onEdit={onEdit}
                                            onToggleComplete={onToggleComplete}
                                            onUnschedule={onUnschedule}
                                            onDelete={onDelete}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (tasks.length === 0) {
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
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">No Tasks!</h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            You're all caught up. Enjoy the break or add a new task to get started.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-white dark:bg-slate-950/50 p-8">
            <div className="max-w-5xl mx-auto space-y-12">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">All Tasks</h2>

                {/* Unscheduled Tasks */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        Unscheduled
                        <span className="bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full">{unscheduledTasks.length}</span>
                    </h3>
                    {renderTaskGroup(unscheduledTasks)}
                </section>

                {/* Scheduled Tasks */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        Scheduled
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">{scheduledTasks.length}</span>
                    </h3>
                    {renderTaskGroup(scheduledTasks)}
                </section>

                {/* Completed Tasks */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        Completed
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">{completedTasks.length}</span>
                    </h3>
                    {renderTaskGroup(completedTasks)}
                </section>
            </div>
        </div>
    );
}
