import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeekViewProps {
    currentDate: Date;
    tasks: Task[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

function WeekColumn({ date, tasks, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: {
    date: Date;
    tasks: Task[];
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
        <div ref={setNodeRef} className="flex-1 min-w-[150px] border-r last:border-r-0 flex flex-col h-full">
            <div className={cn("p-2 text-center border-b sticky top-0 bg-white z-10", isToday && "bg-blue-50")}>
                <div className="text-xs font-medium text-gray-500 uppercase">{format(date, 'EEE')}</div>
                <div className={cn("text-sm font-bold", isToday ? "text-blue-600" : "text-gray-900")}>
                    {format(date, 'd')}
                </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-gray-50/30">
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
                        showTime
                    />
                ))}
            </div>
        </div>
    );
}

export function WeekView({ currentDate, tasks, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: WeekViewProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="flex h-full overflow-x-auto">
            {weekDays.map(date => {
                const dayTasks = tasks.filter(t =>
                    t.scheduled_at && isSameDay(new Date(t.scheduled_at), date)
                );

                return (
                    <WeekColumn
                        key={date.toISOString()}
                        date={date}
                        tasks={dayTasks}
                        onFocus={onFocus}
                        onEdit={onEdit}
                        onToggleComplete={onToggleComplete}
                        onUnschedule={onUnschedule}
                        onDelete={onDelete}
                    />
                );
            })}
        </div>
    );
}
