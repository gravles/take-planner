import { Task, Category } from '@/types';
import { Clock, AlertCircle, Play, Pencil, CheckCircle, MinusCircle, Trash2, Calendar as CalendarIcon, Bell, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';

interface TaskCardProps {
    task: Task;
    categories?: Category[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    isCompact?: boolean;
    showTime?: boolean;
}

export function TaskCard({ task, categories = [], onFocus, onEdit, onToggleComplete, onUnschedule, onDelete, isCompact, showTime }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const isCompleted = task.status === 'completed';
    // Resolve category from ID if possible, fallback to task.category
    const category = categories.find(c => c.id === task.category_id) || task.category;

    // Priority Colors (Border based)
    const priorityColors = {
        low: 'border-l-blue-500',
        medium: 'border-l-yellow-500',
        high: 'border-l-red-500',
    };

    const cardClasses = cn(
        'relative group bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-grab active:cursor-grabbing touch-none overflow-hidden',
        isDragging && 'opacity-50 z-50 rotate-2 scale-105 shadow-xl ring-2 ring-blue-500/20',
        isCompleted ? 'bg-slate-50 opacity-75' : 'bg-white',
        isCompact
            ? 'rounded-lg px-2 py-1 h-full flex items-center gap-2 text-xs border border-transparent hover:border-slate-200'
            : 'rounded-xl p-3.5 h-full flex flex-col border border-slate-100'
    );

    const formattedTime = task.scheduled_at
        ? format(new Date(task.scheduled_at), 'h:mm a')
        : null;

    const completedTime = task.completed_at
        ? format(new Date(task.completed_at), 'h:mm a')
        : null;

    // Priority Dot Color
    const priorityDotColor = {
        low: 'bg-blue-400',
        medium: 'bg-amber-400',
        high: 'bg-rose-500',
    };

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
                    "min-h-[24px] cursor-pointer hover:ring-1 hover:ring-slate-200" // Slightly taller for better touch
                )}
                onClick={() => onEdit && onEdit(task)}
            >
                {/* Priority Dot */}
                {!isCompleted && (
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDotColor[task.priority])} />
                )}

                {/* Status Check (if completed) */}
                {isCompleted ? (
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                ) : (
                    onToggleComplete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(task);
                            }}
                            className="w-3 h-3 rounded-full border border-slate-300 hover:border-green-500 hover:bg-green-500 text-transparent hover:text-white flex items-center justify-center transition-all shrink-0 p-0"
                        >
                            <CheckCircle className="w-2 h-2 fill-current" />
                        </button>
                    )
                )}

                {/* Category Indicator (Compact) */}
                {task.category && !isCompleted && (
                    <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-inset ring-black/5"
                        style={{ backgroundColor: task.category.color }}
                        title={task.category.name}
                    />
                )}

                {/* Time (if requested) */}
                {showTime && formattedTime && !isCompleted && (
                    <span className="text-slate-500 font-medium shrink-0 tracking-tight">{formattedTime}</span>
                )}

                {/* Title */}
                <span className={cn(
                    "truncate font-medium flex-1 text-slate-700",
                    isCompleted && "line-through text-slate-400"
                )}>
                    {task.title}
                </span>
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
            className={cn(cardClasses, "cursor-pointer hover:ring-1 hover:ring-slate-200")}
            onClick={() => onEdit && onEdit(task)}
        >
            <div className="flex justify-between items-start mb-1.5 gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {onToggleComplete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(task);
                            }}
                            className={cn(
                                "mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                                isCompleted
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-slate-300 hover:border-green-500 text-transparent hover:text-green-500 bg-white"
                            )}
                        >
                            <CheckCircle className="w-3.5 h-3.5 fill-current" />
                        </button>
                    )}
                    <div className="flex flex-col min-w-0">
                        <h3 className={cn(
                            "font-semibold text-[13px] leading-snug text-slate-800 break-words",
                            isCompleted && "line-through text-slate-400"
                        )}>
                            {task.title}
                        </h3>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {/* Category Badge */}
                            {task.category && !isCompleted && (
                                <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium ring-1 ring-inset ring-black/5"
                                    style={{ backgroundColor: `${task.category.color}15`, color: task.category.color }}
                                >
                                    {task.category.name}
                                </span>
                            )}

                            {/* Priority Badge (if high/medium) */}
                            {!isCompleted && task.priority !== 'low' && (
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1",
                                    task.priority === 'high' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                                )}>
                                    <div className={cn("w-1 h-1 rounded-full", task.priority === 'high' ? "bg-rose-500" : "bg-amber-500")} />
                                    {task.priority === 'high' ? 'High' : 'Medium'}
                                </span>
                            )}

                            {/* Reminder Indicator */}
                            {task.reminder_at && !isCompleted && (
                                <span className="text-slate-400" title={`Reminder: ${format(new Date(task.reminder_at), 'h:mm a')}`}>
                                    <Bell className="w-3 h-3" />
                                </span>
                            )}

                            {/* Notes Indicator */}
                            {task.description && !isCompleted && (
                                <div className="group/note relative">
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/note:opacity-100 transition-opacity pointer-events-none z-50">
                                        <p className="line-clamp-3">{task.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Completion Timestamp */}
                        {isCompleted && completedTime && (
                            <span className="text-[10px] text-slate-400 font-medium mt-1">
                                Completed {completedTime}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Scheduled Time Display */}
            {task.scheduled_at && !isCompleted && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2 font-medium bg-slate-50 self-start px-2 py-1 rounded-md">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{format(new Date(task.scheduled_at), 'MMM d • h:mm a')}</span>
                </div>
            )}

            <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-50">
                <div className="flex items-center text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.duration_minutes}m</span>
                    </div>
                </div>

                {/* Action Buttons - Floating Pill on Hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 bg-white shadow-sm border border-slate-100 rounded-lg p-0.5">
                    {onUnschedule && task.scheduled_at && !isCompleted && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnschedule(task);
                            }}
                            className="p-1.5 hover:bg-slate-50 rounded-md text-slate-400 hover:text-amber-600 transition-colors"
                            title="Unschedule"
                        >
                            <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(task);
                            }}
                            className="p-1.5 hover:bg-slate-50 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task);
                            }}
                            className="p-1.5 hover:bg-slate-50 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onFocus && !isCompleted && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFocus(task);
                            }}
                            className="p-1.5 hover:bg-blue-50 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
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
