import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
    tasks: Task[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
}

function CalendarSlot({ hour, children }: { hour: number; children?: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${hour}`,
        data: { hour },
    });

    return (
        <div key={hour} className="flex border-b border-gray-200 h-20 last:border-0">
            <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-sm text-gray-500 font-medium">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 relative border-l border-gray-100 transition-colors",
                    isOver ? "bg-blue-50" : "hover:bg-gray-100/50"
                )}
            >
                {children}
            </div>
        </div>
    );
}

export function CalendarView({ tasks, onFocus, onEdit }: CalendarViewProps) {
    // Generate time slots from 8 AM to 8 PM
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-white p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Today's Schedule</h2>

            <div className="relative border rounded-xl bg-gray-50 min-h-[800px]">
                {hours.map(hour => {
                    // Find tasks scheduled for this hour
                    // Note: This is a simplified check. Real app needs proper date comparison
                    const slotTasks = tasks.filter(t => {
                        if (!t.scheduled_at) return false;
                        const date = new Date(t.scheduled_at);
                        return date.getHours() === hour;
                    });

                    return (
                        <CalendarSlot key={hour} hour={hour}>
                            {slotTasks.map(task => {
                                // Calculate height: 1 minute = 2px (so 60 mins = 120px)
                                // Standard slot is 80px (h-20), so we need to adjust scale or slot height.
                                // Let's make the slot height taller to accommodate: h-32 (128px) for 1 hour?
                                // Or keep h-20 (80px) and map 60mins -> 80px.
                                // 1 min = 80/60 = 1.33px.

                                const height = Math.max(40, (task.duration_minutes / 60) * 80); // Min height 40px
                                const date = new Date(task.scheduled_at!);
                                const minutes = date.getMinutes();
                                const top = (minutes / 60) * 80;

                                return (
                                    <div
                                        key={task.id}
                                        className="absolute inset-x-1 z-10"
                                        style={{
                                            height: `${height}px`,
                                            top: `${top}px`
                                        }}
                                    >
                                        <TaskCard task={task} onFocus={onFocus} onEdit={onEdit} />
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
