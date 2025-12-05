import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface TaskBenchProps {
    tasks: Task[];
    onFocus: (task: Task) => void;
    onEdit: (task: Task) => void;
}

export function TaskBench({ tasks, onFocus, onEdit }: TaskBenchProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'bench',
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-80 bg-gray-50 border-r h-screen p-4 flex flex-col overflow-y-auto transition-colors",
                isOver && "bg-gray-100"
            )}
        >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Task Bench</h2>
            <div className="space-y-3">
                {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No unplanned tasks</p>
                ) : (
                    tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onFocus={onFocus}
                            onEdit={onEdit}
                            onToggleComplete={onToggleComplete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
