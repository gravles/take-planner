import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface TaskBenchProps {
    tasks: Task[];
    categories: Category[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

function CategoryZone({
    id,
    title,
    color,
    tasks,
    onFocus,
    onEdit,
    onToggleComplete,
    onUnschedule,
    onDelete
}: {
    id: string;
    title: string;
    color?: string;
    tasks: Task[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <div ref={setNodeRef} className={cn(
            "p-3 rounded-lg transition-colors min-h-[100px]",
            isOver ? "bg-blue-50 ring-2 ring-blue-200" : "bg-gray-50"
        )}>
            <div className="flex items-center gap-2 mb-2">
                {color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />}
                <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
                <span className="text-xs text-gray-400">({tasks.length})</span>
            </div>
            <div className="space-y-2">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onFocus={onFocus}
                        onEdit={onEdit}
                        onToggleComplete={onToggleComplete}
                        onUnschedule={onUnschedule}
                        onDelete={onDelete}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className="h-12 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    );
}

export function TaskBench({ tasks, categories, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: TaskBenchProps) {
    const uncategorizedTasks = tasks.filter(t => !t.category_id);

    return (
        <div className="w-80 md:w-80 bg-white border-r flex flex-col h-full shadow-xl z-20">
            <div className="p-4 border-b bg-gray-50">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    Task Bench
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{tasks.length}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">Drag tasks to categories</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                {/* Uncategorized Zone */}
                <CategoryZone
                    id="bench-uncategorized"
                    title="No Category"
                    tasks={uncategorizedTasks}
                    onFocus={onFocus}
                    onEdit={onEdit}
                    onToggleComplete={onToggleComplete}
                    onUnschedule={onUnschedule}
                    onDelete={onDelete}
                />

                {/* Category Zones */}
                {categories.map(category => (
                    <CategoryZone
                        key={category.id}
                        id={`bench-category-${category.id}`}
                        title={category.name}
                        color={category.color}
                        tasks={tasks.filter(t => t.category_id === category.id)}
                        onFocus={onFocus}
                        onEdit={onEdit}
                        onToggleComplete={onToggleComplete}
                        onUnschedule={onUnschedule}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}
