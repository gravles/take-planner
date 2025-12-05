import { Task } from '@/types';
import { Clock, AlertCircle, Play, Pencil, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';

interface TaskCardProps {
    task: Task;
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    isCompact?: boolean;
}

export function TaskCard({ task, onFocus, onEdit, onToggleComplete, isCompact }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const isCompleted = task.status === 'completed';

    const priorityColors = {
        low: 'bg-blue-100 text-blue-800 border-blue-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        high: 'bg-red-100 text-red-800 border-red-200',
    };

    const cardClasses = cn(
        'rounded border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-none group overflow-hidden',
        isCompleted ? 'bg-gray-50 text-gray-400 border-gray-100' : priorityColors[task.priority],
        isDragging && 'opacity-50 z-50',
        isCompact ? 'px-2 py-0.5 h-full flex items-center justify-between' : 'p-3 h-full flex flex-col'
    );

    if (isCompact) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={cardClasses}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {onToggleComplete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onToggleComplete(task)}
                            className={cn(
                                "p-0.5 rounded-full transition-colors shrink-0",
                                isCompleted ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-green-500"
                            )}
                        >
                            <CheckCircle className="w-3 h-3" />
                        </button>
                    )}
                    <span className={cn("font-medium text-xs truncate", isCompleted && "line-through")}>
                        {task.title}
                    </span>
                </div>

                {onFocus && !isCompleted && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded px-1 ml-2">
                        {onEdit && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => onEdit(task)}
                                className="p-0.5 hover:text-black transition-colors"
                            >
                                <Pencil className="w-2.5 h-2.5" />
                            </button>
                        )}
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onFocus(task)}
                            className="p-0.5 hover:text-blue-600 transition-colors"
                        >
                            <Play className="w-2.5 h-2.5 fill-current" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cardClasses}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-start gap-2">
                    {onToggleComplete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onToggleComplete(task)}
                            className={cn(
                                "mt-0.5 p-0.5 rounded-full transition-colors shrink-0",
                                isCompleted ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-green-500"
                            )}
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    )}
                    <h3 className={cn("font-medium text-sm line-clamp-2 leading-tight", isCompleted && "line-through")}>
                        {task.title}
                    </h3>
                </div>
                {task.priority === 'high' && !isCompleted && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 ml-1" />}
            </div>

            <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-600 gap-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.duration_minutes}m</span>
                    </div>
                </div>
                {onFocus && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => onEdit(task)}
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-600 hover:text-black transition-colors"
                                title="Edit Task"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onFocus(task)}
                            className="p-1 hover:bg-blue-50 rounded-full text-gray-600 hover:text-blue-600 transition-colors"
                            title="Start Focus"
                        >
                            <Play className="w-3 h-3 fill-current" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
