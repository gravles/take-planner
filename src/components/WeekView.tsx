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
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[120px] border-r last:border-r-0 relative bg-white">
            {/* Hour grid lines */}
            {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-50 box-border w-full" />
            ))}

            {/* Tasks */}
            {tasks.map(task => {
                if (!task.scheduled_at) return null;
                const taskDate = new Date(task.scheduled_at);
                const hour = taskDate.getHours();
                if (hour < 8 || hour > 20) return null; // Out of view

                const minutes = taskDate.getMinutes();
                // Calculate position: (hour - 8) * 60px + minutes
                const top = (hour - 8) * 60 + minutes;
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

export function WeekView({ currentDate, tasks, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: WeekViewProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
        <div className="flex h-full overflow-hidden flex-col">
            {/* Header */}
            <div className="flex border-b bg-white shrink-0 pl-16 scrollbar-gutter-stable">
                {weekDays.map(date => {
                    const isToday = isSameDay(date, new Date());
                    return (
                        <div key={date.toISOString()} className="flex-1 py-2 text-center border-r last:border-r-0">
                            <div className="text-xs font-medium text-gray-500 uppercase">{format(date, 'EEE')}</div>
                            <div className={cn("text-sm font-bold inline-block w-7 h-7 leading-7 rounded-full", isToday ? "bg-blue-600 text-white" : "text-gray-900")}>
                                {format(date, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Grid */}
            <div className="flex-1 overflow-y-auto flex relative">
                {/* Time Axis */}
                <div className="w-16 flex-shrink-0 bg-white border-r pt-0 sticky left-0 z-20">
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] text-xs text-gray-400 text-right pr-2 relative -top-2">
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
            </div>
        </div>
    );
}
