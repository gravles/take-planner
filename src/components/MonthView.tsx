import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';

interface MonthViewProps {
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

function MonthDay({ date, tasks, categories, events, isCurrentMonth, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: {
    date: Date;
    tasks: Task[];
    categories?: Category[];
    events: GoogleEvent[];
    isCurrentMonth: boolean;
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

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[100px] border-b border-r border-slate-200 dark:border-slate-800 p-1 flex flex-col transition-colors",
                !isCurrentMonth ? "bg-gray-50/50 dark:bg-slate-900/30 text-gray-400 dark:text-slate-600" : "bg-white dark:bg-slate-900"
            )}
        >
            <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                isToday ? "bg-blue-600 text-white" : "text-gray-500 dark:text-slate-400"
            )}>
                {format(date, 'd')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-h-0">
                {/* Events */}
                {events.map(event => (
                    <div key={event.id} className="min-h-0 shrink-0">
                        <div
                            className="border-l-2 rounded px-1 py-0.5 text-[10px] truncate font-medium"
                            style={{
                                backgroundColor: `${event.displayColor}20`,
                                borderColor: event.displayColor,
                                color: '#1e293b'
                            }}
                        >
                            {event.summary}
                        </div>
                    </div>
                ))}

                {/* Tasks */}
                {tasks.map(task => (
                    <div key={task.id} className="min-h-0 shrink-0">
                        <TaskCard
                            task={task}
                            categories={categories}
                            onFocus={onFocus}
                            onEdit={onEdit}
                            onToggleComplete={onToggleComplete}
                            onUnschedule={onUnschedule}
                            onDelete={onDelete}
                            isCompact
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MonthView({ currentDate, tasks, categories = [], events = [], onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: MonthViewProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1 overflow-y-auto auto-rows-fr">
                {calendarDays.map(date => {
                    const dayTasks = tasks.filter(t =>
                        t.scheduled_at && isSameDay(new Date(t.scheduled_at), date)
                    );

                    const dayEvents = events.filter(e => {
                        const eventStart = new Date(e.start.dateTime || e.start.date!);
                        return isSameDay(eventStart, date);
                    });

                    return (
                        <MonthDay
                            key={date.toISOString()}
                            date={date}
                            tasks={dayTasks}
                            categories={categories}
                            events={dayEvents}
                            isCurrentMonth={isSameMonth(date, currentDate)}
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
    );
}
