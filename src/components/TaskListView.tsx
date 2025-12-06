import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';

interface TaskListViewProps {
    tasks: Task[];
    onFocus: (task: Task) => void;
    onEdit: (task: Task) => void;
    onToggleComplete: (task: Task) => void;
    onDelete: (task: Task) => void;
}

export function TaskListView({ tasks, onFocus, onEdit, onToggleComplete, onDelete }: TaskListViewProps) {
    const unscheduledTasks = tasks.filter(t => !t.scheduled_at && t.status !== 'completed');
    const scheduledTasks = tasks.filter(t => t.scheduled_at && t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    const TaskGroup = ({ title, groupTasks, className }: { title: string, groupTasks: Task[], className?: string }) => (
        <div className={cn("mb-8", className)}>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                {title}
                <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {groupTasks.length}
                </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupTasks.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No tasks</p>
                ) : (
                    groupTasks.map(task => (
                        <div key={task.id} className="h-32">
                            <TaskCard
                                task={task}
                                onFocus={onFocus}
                                onEdit={onEdit}
                                onToggleComplete={onToggleComplete}
                                onDelete={onDelete}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-white p-8">
            <h2 className="text-2xl font-bold mb-8 text-gray-800">All Tasks</h2>

            <TaskGroup title="Unscheduled" groupTasks={unscheduledTasks} />
            <TaskGroup title="Scheduled" groupTasks={scheduledTasks} />
            <TaskGroup title="Completed" groupTasks={completedTasks} className="opacity-75" />
        </div>
    );
}
