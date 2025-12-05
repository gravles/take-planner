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

export function CalendarView({ tasks, onFocus, onEdit }: CalendarViewProps) {
    // Generate time slots from 8 AM to 8 PM
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

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

                    return (
                        <CalendarSlot key={hour} hour={hour}>
                            {slotTasks.map((task, index) => {
                                // Calculate height: 1 minute = 2px (120px / 60min)
                                const height = Math.max(32, task.duration_minutes * 2);
                                const date = new Date(task.scheduled_at!);
                                const minutes = date.getMinutes();
                                const top = minutes * 2;

                                // Side-by-side logic
                                const widthPercent = 100 / slotTasks.length;
                                const leftPercent = index * widthPercent;

                                return (
                                    <div
                                        key={task.id}
                                        className="absolute z-10 px-1 transition-all duration-200"
                                        style={{
                                            height: `${height}px`,
                                            top: `${top}px`,
                                            width: `${widthPercent}%`,
                                            left: `${leftPercent}%`
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
