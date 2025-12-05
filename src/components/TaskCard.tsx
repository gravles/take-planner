import { Task } from '@/types';
import { Clock, AlertCircle, Play, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';

interface TaskCardProps {
    task: Task;
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
}

export function TaskCard({ task, onFocus, onEdit }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const priorityColors = {
        low: 'bg-blue-100 text-blue-800 border-blue-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        high: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                'p-3 rounded-lg border shadow-sm bg-white cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-none group',
                priorityColors[task.priority],
                isDragging && 'opacity-50 z-50'
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
                {task.priority === 'high' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            </div>

            <div className="flex items-center justify-between mt-2">
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
