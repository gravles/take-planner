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
        <div key={hour} className="flex border-b border-gray-200 h-[120px] last:border-0">
            <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-sm text-gray-500 font-medium">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 relative border-l border-gray-100 transition-colors group",
                    isOver ? "bg-blue-50" : "hover:bg-gray-100/50"
                )}
            >
                {/* 15-minute markers */}
                <div className="absolute w-full border-t border-gray-50 border-dashed top-1/4 pointer-events-none"></div>
                <div className="absolute w-full border-t border-gray-100 border-dashed top-2/4 pointer-events-none"></div>
                <div className="absolute w-full border-t border-gray-50 border-dashed top-3/4 pointer-events-none"></div>
                {children}
            </div>
        </div>
    );
}

export function CalendarView({ tasks, categories = [], events = [], onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: CalendarViewProps) {
    // Generate time slots from 7 AM to 11 PM
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-white p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Today's Schedule</h2>

            <div className="relative border rounded-xl bg-gray-50 min-h-[800px]">
                {/* All Day / Due Today Slot */}
                <CalendarSlot hour={0}>
                    <div className="absolute inset-0 flex items-center px-2 text-xs text-gray-400 pointer-events-none">
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
                                            key={event.id}
                                            className="absolute z-10 px-1 transition-all duration-200"
                                            style={{
                                                height: `${height}px`,
                                                top: `${top}px`,
                                                width: `${widthPercent}%`,
                                                left: `${leftPercent}%`,
                                                zIndex: 5
                                            }}
                                        >
                                            <div className="h-full w-full bg-blue-100 border-l-4 border-blue-500 rounded p-1 text-xs overflow-hidden opacity-90 hover:opacity-100 hover:z-20 shadow-sm flex flex-col">
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
