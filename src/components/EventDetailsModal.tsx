
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import { Task, Category } from '@/types';
import { X, Calendar, MapPin, AlignLeft, ExternalLink, Trash2, CheckCircle, Pencil, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventDetailsModalProps {
    event?: GoogleEvent | null;
    task?: Task | null;
    categories?: Category[];
    onClose: () => void;
    onToggleComplete?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onEdit?: (task: Task) => void;
}

export function EventDetailsModal({ event, task, categories = [], onClose, onToggleComplete, onDelete, onEdit }: EventDetailsModalProps) {
    if (!event && !task) return null;

    // Normalize data for display
    const isTask = !!task;
    const title = isTask ? task.title : event?.summary;
    const description = isTask ? task.description : event?.description;

    // Dates
    let start: Date | null = null;
    let end: Date | null = null;
    let isAllDay = false;

    if (isTask) {
        if (task.scheduled_at) {
            start = new Date(task.scheduled_at);
            end = new Date(start.getTime() + task.duration_minutes * 60000);
            if (start.getHours() === 0 && start.getMinutes() === 0) isAllDay = true;
        }
    } else if (event) {
        start = event.start.dateTime ? new Date(event.start.dateTime) : (event.start.date ? new Date(event.start.date) : null);
        end = event.end.dateTime ? new Date(event.end.dateTime) : (event.end.date ? new Date(event.end.date) : null);
        isAllDay = !event.start.dateTime;
    }

    // Color
    let displayColor = '#3b82f6'; // blue-500 default
    if (isTask && task.category_id) {
        const cat = categories.find(c => c.id === task.category_id) || task.category;
        if (cat) displayColor = cat.color;
    } else if (event?.displayColor) {
        displayColor = event.displayColor;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
                style={{ borderTop: `4px solid ${displayColor}` }}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 pb-2">
                    <h2 className={cn("text-xl font-semibold text-slate-900 dark:text-slate-100 pr-8 break-words leading-tight", isTask && task.status === 'completed' && "line-through text-slate-500")}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 pt-2 space-y-4">
                    {/* Time */}
                    {(start || isTask) && (
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {start ? (
                                    <div>
                                        {format(start, 'EEEE, MMMM d, yyyy')}
                                        {!isAllDay && (
                                            <span className="text-slate-500 dark:text-slate-400 font-normal">
                                                {' • ' + format(start, 'h:mm a')}
                                                {end && ' - ' + format(end, 'h:mm a')}
                                            </span>
                                        )}
                                        {isAllDay && <span className="text-slate-500 dark:text-slate-400 font-normal"> • All Day</span>}
                                    </div>
                                ) : (
                                    <span className="text-slate-500 italic">Unscheduled Task</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Duration (Tasks) */}
                    {isTask && task.duration_minutes > 0 && (
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                {task.duration_minutes} minutes
                            </div>
                        </div>
                    )}

                    {/* Location (Events) */}
                    {!isTask && event?.location && (
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-words"
                            >
                                {event.location}
                            </a>
                        </div>
                    )}

                    {/* Description */}
                    {description && (
                        <div className="flex items-start gap-3">
                            <AlignLeft className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div
                                className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto"
                                dangerouslySetInnerHTML={isTask ? undefined : { __html: description }}
                            >
                                {isTask ? description : undefined}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons (Task Only) */}
                    {isTask && (
                        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {onToggleComplete && (
                                <button
                                    onClick={() => {
                                        onToggleComplete(task);
                                        onClose();
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors border",
                                        task.status === 'completed'
                                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    )}
                                >
                                    <CheckCircle className={cn("w-5 h-5", task.status === 'completed' && "fill-current")} />
                                    <span className="text-xs font-medium">{task.status === 'completed' ? 'Completed' : 'Complete'}</span>
                                </button>
                            )}

                            {onEdit && (
                                <button
                                    onClick={() => {
                                        onEdit(task);
                                        onClose();
                                    }}
                                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                >
                                    <Pencil className="w-5 h-5" />
                                    <span className="text-xs font-medium">Edit</span>
                                </button>
                            )}

                            {onDelete && (
                                <button
                                    onClick={() => {
                                        onDelete(task);
                                        onClose();
                                    }}
                                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors border bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    <span className="text-xs font-medium">Delete</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Footer / Account Info (Events) */}
                    {!isTask && event && (
                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="text-xs text-slate-400">
                                Calendar: <span className="font-medium text-slate-600 dark:text-slate-300">{event.account_email || 'Primary'}</span>
                            </div>
                            {event.htmlLink && (
                                <a
                                    href={event.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    Open in Google Calendar
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
