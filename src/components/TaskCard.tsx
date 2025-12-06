import { Task } from '@/types';
import { Clock, AlertCircle, Play, Pencil, CheckCircle, MinusCircle, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';

interface TaskCardProps {
    task: Task;
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    isCompact?: boolean;
    showTime?: boolean;
}

export function TaskCard({ task, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete, isCompact, showTime }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const isCompleted = task.status === 'completed';

    // Priority Colors (Border based)
    const priorityColors = {
        low: 'border-l-blue-500',
        medium: 'border-l-yellow-500',
        high: 'border-l-red-500',
    };

    const cardClasses = cn(
        'relative group bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing touch-none overflow-hidden',
        isDragging && 'opacity-50 z-50 rotate-2 scale-105',
        isCompleted ? 'bg-gray-50' : 'bg-white',
        isCompact
            ? 'rounded-md px-2 py-1 h-full flex items-center gap-2 text-xs'
            : `rounded-lg p-3 h-full flex flex-col border-l-4 ${priorityColors[task.priority]}`
    );

    const formattedTime = task.scheduled_at
        ? format(new Date(task.scheduled_at), 'h:mm a')
        : null;

    const completedTime = task.completed_at
        ? format(new Date(task.completed_at), 'h:mm a')
        : null;

    // Compact View (Week/Month)
    if (isCompact) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={cn(
                    cardClasses,
                    "min-h-[20px]" // Allow it to be small
                )}
            >
                {/* Status Indicator */}
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isCompleted ? "bg-green-500" :
                        task.priority === 'high' ? "bg-red-500" :
                            task.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                )} />

                {/* Time (if requested) */}
                {showTime && formattedTime && !isCompleted && (
                    <span className="text-gray-500 font-medium shrink-0">{formattedTime}</span>
                )}

                {/* Title */}
                <span className={cn(
                    "truncate font-medium flex-1",
                    isCompleted && "line-through text-gray-400"
                )}>
                    {task.title}
                </span>

                {/* Hover Actions */}
                <div className="hidden group-hover:flex items-center gap-1 bg-white/90 absolute right-1 top-1/2 -translate-y-1/2 px-1 rounded shadow-sm">
                    {onToggleComplete && (
                        <button onClick={() => onToggleComplete(task)} className="p-0.5 hover:text-green-600">
                            <CheckCircle className="w-3 h-3" />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={() => onDelete(task)} className="p-0.5 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Standard View (List/Bench/Day)
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cardClasses}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-start gap-2 flex-1">
                    {onToggleComplete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onToggleComplete(task)}
                            className={cn(
                                "mt-0.5 p-0.5 rounded-full transition-colors shrink-0",
                                isCompleted ? "text-green-500 hover:text-green-600" : "text-gray-300 hover:text-green-500"
                            )}
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <h3 className={cn("font-medium text-sm leading-tight", isCompleted && "line-through text-gray-400")}>
                            {task.title}
                        </h3>
                        {/* Completion Timestamp */}
                        {isCompleted && completedTime && (
                            <span className="text-[10px] text-green-600 font-medium mt-0.5">
                                Done at {completedTime}
                            </span>
                        )}
                        {/* Category Badge */}
                        {task.category && !isCompleted && (
                            <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 self-start"
                                style={{ backgroundColor: `${task.category.color}20`, color: task.category.color }}
                            >
                                {task.category.name}
                            </span>
                        )}
                    </div>
                </div>
                {task.priority === 'high' && !isCompleted && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 ml-1" />}
            </div>

            {/* Scheduled Time Display */}
            {task.scheduled_at && !isCompleted && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2 font-medium">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{format(new Date(task.scheduled_at), 'MMM d • h:mm a')}</span>
                </div>
            )}

            <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500 gap-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.duration_minutes}m</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onUnschedule && task.scheduled_at && !isCompleted && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onUnschedule(task)}
                            className="p-1.5 hover:bg-orange-50 rounded-md text-gray-400 hover:text-orange-600 transition-colors"
                            title="Unschedule"
                        >
                            <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onEdit(task)}
                            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-black transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onDelete(task)}
                            className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onFocus && !isCompleted && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onFocus(task)}
                            className="p-1.5 hover:bg-blue-50 rounded-md text-gray-400 hover:text-blue-600 transition-colors"
                            title="Start Focus"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
