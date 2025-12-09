import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';

interface CalendarViewProps {
    tasks: Task[];
    categories?: Category[];
    events?: GoogleEvent[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

function CalendarSlot({ hour, children }: { hour: number; children?: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${hour}`,
        data: { hour },
    });

    return (
        <div key={hour} className="flex border-b border-slate-100 dark:border-slate-800 h-[120px] last:border-0">
            <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 relative border-l border-slate-100 dark:border-slate-800 transition-colors group",
                    isOver ? "bg-blue-50/50 dark:bg-blue-900/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                )}
            >
                {/* 15-minute markers (Subtle) */}
                <div className="absolute w-full border-t border-slate-50 dark:border-slate-800/50 border-dashed top-1/4 pointer-events-none"></div>
                <div className="absolute w-full border-t border-slate-100 dark:border-slate-800 border-dashed top-2/4 pointer-events-none"></div>
                <div className="absolute w-full border-t border-slate-50 dark:border-slate-800/50 border-dashed top-3/4 pointer-events-none"></div>
                {children}
            </div>
        </div>
    );
}

import { EventDetailsModal } from './EventDetailsModal';
import { useState } from 'react';

export function CalendarView({ tasks, categories = [], events = [], onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: CalendarViewProps) {
    // Generate time slots from 7 AM to 11 PM
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);
    const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-white/50 dark:bg-slate-950/50 p-6">
            <EventDetailsModal event={selectedEvent!} onClose={() => setSelectedEvent(null)} />
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100 tracking-tight">Today's Schedule</h2>

            <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm min-h-[800px] overflow-hidden">
                {/* All Day / Due Today Slot */}
                <CalendarSlot hour={0}>
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-400 pointer-events-none bg-slate-50/50">
                        All Day / Due Today
                    </div>
                    {tasks.filter(t => {
                        if (!t.scheduled_at) return false;
                        const date = new Date(t.scheduled_at);
                        return date.getHours() === 0 && date.getMinutes() === 0;
                    }).map(task => (
                        <div key={task.id} className="relative z-10 mb-1">
                            <TaskCard
                                task={task}
                                categories={categories}
                                onFocus={onFocus}
                                onEdit={onEdit}
                                isCompact={true}
                                onToggleComplete={onToggleComplete}
                                onUnschedule={onUnschedule}
                                onDelete={onDelete}
                            />
                        </div>
                    ))}
                </CalendarSlot>

                {hours.map(hour => {
                    // Find tasks scheduled for this hour (excluding 00:00 which is All Day)
                    const slotTasks = tasks.filter(t => {
                        if (!t.scheduled_at) return false;
                        const date = new Date(t.scheduled_at);
                        return date.getHours() === hour && !(hour === 0);
                    });

                    // Find events for this hour
                    const slotEvents = events.filter(e => {
                        if (!e.start.dateTime) return false;
                        const date = new Date(e.start.dateTime);
                        return date.getHours() === hour;
                    });

                    // Combine items for layout
                    const items = [
                        ...slotTasks.map(t => ({ type: 'task' as const, data: t })),
                        ...slotEvents.map(e => ({ type: 'event' as const, data: e }))
                    ];

                    return (
                        <CalendarSlot key={hour} hour={hour}>
                            {items.map((item, index) => {
                                const widthPercent = 100 / items.length;
                                const leftPercent = index * widthPercent;

                                if (item.type === 'task') {
                                    const task = item.data as Task;
                                    const height = Math.max(20, task.duration_minutes * 2);
                                    const date = new Date(task.scheduled_at!);
                                    const minutes = date.getMinutes();
                                    const top = minutes * 2;
                                    const isCompact = task.duration_minutes < 30;

                                    return (
                                        <div
                                            key={task.id}
                                            className="absolute z-10 px-1 transition-all duration-200"
                                            style={{
                                                height: `${height}px`,
                                                top: `${top}px`,
                                                width: `${widthPercent}%`,
                                                left: `${leftPercent}%`,
                                                zIndex: 10
                                            }}
                                        >
                                            <TaskCard
                                                task={task}
                                                categories={categories}
                                                onFocus={onFocus}
                                                onEdit={onEdit}
                                                isCompact={isCompact}
                                                onToggleComplete={onToggleComplete}
                                                onUnschedule={onUnschedule}
                                                onDelete={onDelete}
                                            />
                                        </div>
                                    );
                                } else {
                                    const event = item.data as GoogleEvent;
                                    const date = new Date(event.start.dateTime!);
                                    const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(date.getTime() + 60 * 60 * 1000);
                                    const durationMinutes = (endDate.getTime() - date.getTime()) / (1000 * 60);
                                    const height = Math.max(20, durationMinutes * 2);
                                    const minutes = date.getMinutes();
                                    const top = minutes * 2;

                                    return (
                                        <div
                                            key={`${event.id}-${event.account_email || 'p'}`}
                                            className="absolute z-10 px-1 transition-all duration-200"
                                            style={{
                                                height: `${height}px`,
                                                top: `${top}px`,
                                                width: `${widthPercent}%`,
                                                left: `${leftPercent}%`,
                                                zIndex: 5
                                            }}
                                        >
                                            <div
                                                className="h-full w-full border-l-4 rounded p-1 text-xs overflow-hidden opacity-90 hover:opacity-100 hover:z-20 shadow-sm flex flex-col transition-opacity cursor-pointer"
                                                style={{
                                                    backgroundColor: `${event.displayColor}20`, // 20 = ~12% opacity
                                                    borderColor: event.displayColor,
                                                    color: '#1e293b' // slate-800
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEvent(event);
                                                }}
                                            >
                                                <div className="font-semibold text-blue-800 truncate">{event.summary}</div>
                                                <div className="text-blue-600 text-[10px] truncate">
                                                    {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                                {event.location && (
                                                    <a
                                                        href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 text-[10px] truncate mt-auto flex items-center gap-1 hover:underline cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span>📍</span>
                                                        {event.location}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </CalendarSlot>
                    );
                })}
            </div>
        </div>
    );
}
