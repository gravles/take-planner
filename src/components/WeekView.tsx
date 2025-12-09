import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';

interface WeekViewProps {
    currentDate: Date;
    tasks: Task[];
    categories?: Category[];
    events?: GoogleEvent[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

function WeekColumn({ date, tasks, categories, events, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: {
    date: Date;
    tasks: Task[];
    categories?: Category[];
    events: GoogleEvent[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}) {
    const { setNodeRef } = useDroppable({
        id: `day-${format(date, 'yyyy-MM-dd')}`,
        data: { date }
    });

    const isToday = isSameDay(date, new Date());
    const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM to 11 PM

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[120px] border-r border-slate-200 dark:border-slate-800 last:border-r-0 relative bg-white dark:bg-slate-900">
            {/* Hour grid lines */}
            {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-50 dark:border-slate-800/50 box-border w-full" />
            ))}

            {/* Google Events */}
            {events.map(event => {
                const eventStart = new Date(event.start.dateTime || event.start.date!);
                const eventEnd = new Date(event.end.dateTime || event.end.date!);
                const hour = eventStart.getHours();
                if (hour < 7 || hour > 23) return null;

                const minutes = eventStart.getMinutes();
                const top = (hour - 7) * 60 + minutes;
                const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
                const height = Math.max(24, durationMinutes);

                return (
                    <div
                        key={event.id}
                        className="absolute left-0.5 right-0.5 z-0 px-1"
                        style={{
                            top: `${top}px`,
                            height: `${height}px`,
                        }}
                    >
                        <div
                            className="h-full w-full border-l-4 rounded p-1 text-xs overflow-hidden opacity-90 shadow-sm flex flex-col cursor-pointer"
                            style={{
                                backgroundColor: `${event.displayColor}20`,
                                borderColor: event.displayColor,
                                borderColor: event.displayColor,
                                color: '#1e293b'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                            }}
                        >
                            <div className="font-semibold text-blue-800 truncate">{event.summary}</div>
                            <div className="text-blue-600 text-[10px] truncate">
                                {eventStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {eventEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </div>
                            {event.location && (
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 text-[10px] truncate mt-auto hover:underline cursor-pointer block"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    📍 {event.location}
                                </a>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Tasks */}
            {tasks.map(task => {
                if (!task.scheduled_at) return null;
                const taskDate = new Date(task.scheduled_at);
                const hour = taskDate.getHours();
                if (hour < 7 || hour > 23) return null; // Out of view

                const minutes = taskDate.getMinutes();
                // Calculate position: (hour - 7) * 60px + minutes
                const top = (hour - 7) * 60 + minutes;
                // Height: 1 min = 1px (compact)
                const height = Math.max(24, task.duration_minutes);

                return (
                    <div
                        key={task.id}
                        className="absolute left-0.5 right-0.5 z-10"
                        style={{
                            top: `${top}px`,
                            height: `${height}px`,
                        }}
                    >
                        <TaskCard
                            task={task}
                            categories={categories}
                            onFocus={onFocus}
                            onEdit={onEdit}
                            onToggleComplete={onToggleComplete}
                            onUnschedule={onUnschedule}
                            onDelete={onDelete}
                            isCompact
                            showTime={false} // Time is implied by position, but maybe show if space?
                        />
                    </div>
                );
            })}
        </div>
    );
}

import { EventDetailsModal } from './EventDetailsModal';
import { useState } from 'react';

export function WeekView({ currentDate, tasks, categories = [], events = [], onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: WeekViewProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);
    const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);

    return (
        <div className="flex h-full overflow-hidden flex-col">
            <EventDetailsModal event={selectedEvent!} onClose={() => setSelectedEvent(null)} />
            {/* Header */}
            <div className="flex border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shrink-0 pl-16 scrollbar-gutter-stable">
                {weekDays.map(date => {
                    const isToday = isSameDay(date, new Date());
                    return (
                        <div key={date.toISOString()} className="flex-1 py-2 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                            <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">{format(date, 'EEE')}</div>
                            <div className={cn("text-sm font-bold inline-block w-7 h-7 leading-7 rounded-full", isToday ? "bg-blue-600 text-white" : "text-gray-900 dark:text-slate-100")}>
                                {format(date, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Grid */}
            <div className="flex-1 overflow-y-auto flex relative">
                {/* Time Axis */}
                <div className="w-16 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 pt-0 sticky left-0 z-20">
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] text-xs text-gray-400 dark:text-slate-500 text-right pr-2 relative -top-2">
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex flex-1">
                    {weekDays.map(date => {
                        const dayTasks = tasks.filter(t =>
                            t.scheduled_at && isSameDay(new Date(t.scheduled_at), date)
                        );

                        const dayEvents = events.filter(e => {
                            const eventStart = new Date(e.start.dateTime || e.start.date!);
                            return isSameDay(eventStart, date);
                        });

                        return (
                            <WeekColumn
                                key={date.toISOString()}
                                date={date}
                                tasks={dayTasks}
                                categories={categories}
                                events={dayEvents}
                                onFocus={onFocus}
                                onEdit={onEdit}
                                onToggleComplete={onToggleComplete}
                                onUnschedule={onUnschedule}
                                onDelete={onDelete}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
