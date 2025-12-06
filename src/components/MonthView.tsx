import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthViewProps {
    currentDate: Date;
    tasks: Task[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

function MonthDay({ date, tasks, isCurrentMonth, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: {
    date: Date;
    tasks: Task[];
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
                "min-h-[100px] border-b border-r p-1 flex flex-col",
                !isCurrentMonth && "bg-gray-50/50 text-gray-400"
            )}
        >
            <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                isToday ? "bg-blue-600 text-white" : "text-gray-500"
            )}>
                {format(date, 'd')}
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-gray-200">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onFocus={onFocus}
                        onEdit={onEdit}
                        onToggleComplete={onToggleComplete}
                        onUnschedule={onUnschedule}
                        onDelete={onDelete}
                        isCompact
                    />
                ))}
            </div>
        </div>
    );
}

export function MonthView({ currentDate, tasks, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: MonthViewProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-semibold text-gray-500 uppercase">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1 overflow-y-auto auto-rows-fr">
                {calendarDays.map(date => {
                    const dayTasks = tasks.filter(t =>
                        t.scheduled_at && isSameDay(new Date(t.scheduled_at), date)
                    );

                    return (
                        <MonthDay
                            key={date.toISOString()}
                            date={date}
                            tasks={dayTasks}
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
