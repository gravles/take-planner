import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';

interface CalendarViewProps {
    tasks: Task[];
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

export function CalendarView({ tasks, events = [], onFocus, onEdit, onToggleComplete, onUnschedule, onDelete }: CalendarViewProps) {
    // Generate time slots from 7 AM to 11 PM
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-white p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Today's Schedule</h2>

            <div className="relative border rounded-xl bg-gray-50 min-h-[800px]">
                {hours.map(hour => {
                    // Find tasks scheduled for this hour
                    const slotTasks = tasks.filter(t => {
                        if (!t.scheduled_at) return false;
                        const date = new Date(t.scheduled_at);
                        return date.getHours() === hour;
                    });

                    // Find events for this hour
                    const slotEvents = events.filter(e => {
                        if (!e.start.dateTime) return false;
                        const date = new Date(e.start.dateTime);
                        return date.getHours() === hour;
                    });

                    // Combine for layout calculations (simple overlap handling)
                    // For now, we'll render events first (background) then tasks
                    // Or side-by-side? Let's do side-by-side if possible, but types differ.
                    // Let's just render events with a fixed width or overlapping for now.

                    return (
                        <CalendarSlot key={hour} hour={hour}>
                            {/* Render Google Events */}
                            {slotEvents.map((event, index) => {
                                const date = new Date(event.start.dateTime!);
                                const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(date.getTime() + 60 * 60 * 1000);
                                const durationMinutes = (endDate.getTime() - date.getTime()) / (1000 * 60);

                                const height = Math.max(20, durationMinutes * 2);
                                const minutes = date.getMinutes();
                                const top = minutes * 2;

                                return (
                                    <div
                                        key={event.id}
                                        className="absolute z-0 px-1 transition-all duration-200"
                                        style={{
                                            height: `${height}px`,
                                            top: `${top}px`,
                                            width: `90%`, // Events take mostly full width but sit behind?
                                            left: `0%`,
                                            zIndex: 5
                                        }}
                                    >
                                        <div className="h-full w-full bg-blue-100 border-l-4 border-blue-500 rounded p-1 text-xs overflow-hidden opacity-90 hover:opacity-100 hover:z-20 shadow-sm">
                                            <div className="font-semibold text-blue-800 truncate">{event.summary}</div>
                                            <div className="text-blue-600">
                                                {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Render Tasks */}
                            {slotTasks.map((task, index) => {
                                const height = Math.max(20, task.duration_minutes * 2);
                                const date = new Date(task.scheduled_at!);
                                const minutes = date.getMinutes();
                                const top = minutes * 2;

                                // Side-by-side logic for TASKS
                                const widthPercent = 100 / slotTasks.length;
                                const leftPercent = index * widthPercent;
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
                                            zIndex: 10 // Tasks above events
                                        }}
                                    >
                                        <TaskCard
                                            task={task}
                                            onFocus={onFocus}
                                            onEdit={onEdit}
                                            isCompact={isCompact}
                                            onToggleComplete={onToggleComplete}
                                            onUnschedule={onUnschedule}
                                            onDelete={onDelete}
                                        />
                                    </div>
                                );
                            })}
                        </CalendarSlot>
                    );
                })}
            </div>
        </div>
    );
}
