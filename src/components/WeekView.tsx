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

// Helper to detect overlaps and assign layout positions
function calculateLayout(items: LayoutItem[]) {
    // 1. Sort by start time, then duration (desc)
    const sorted = [...items].sort((a, b) => {
        if (a.start.getTime() !== b.start.getTime()) {
            return a.start.getTime() - b.start.getTime();
        }
        return b.end.getTime() - a.end.getTime() - (b.end.getTime() - a.start.getTime()); // Longer duration first?
    });

    const columns: LayoutItem[][] = [];

    // 2. Place items into columns
    sorted.forEach(item => {
        let placed = false;
        for (const column of columns) {
            // Check if item overlaps with the last item in this column
            // Actually, we need to check if it overlaps with ANY item in this column that intersects in time.
            const hasOverlap = column.some(existing =>
                item.start < existing.end && item.end > existing.start
            );

            if (!hasOverlap) {
                column.push(item);
                placed = true;
                break;
            }
        }

        if (!placed) {
            columns.push([item]);
        }
    });

    // 3. Calculate Layout
    // This simple column approach is good ("packing"), but we want them to expand if space permits?
    // A simpler standard approach:
    // Group conflicting items -> Calculate max width based on max concurrent collisions.
    return sorted.map(item => {
        // Find which column this item ended up in
        const colIndex = columns.findIndex(col => col.includes(item));
        const totalCols = columns.length; // This isn't quite right, totalCols should be local to the collision group.

        // Better heuristic:
        // Find all items that overlap with THIS item.
        // The number of columns needed is the max size of a clique in the overlap graph.
        // Simplified: The number of columns we generated IS the max overlap count for the whole day in some sense,
        // but visually we might want to be smarter.

        // Let's stick to the column buckets for now, it guarantees no overlap.
        // We need to know how many columns are active *at this time*.
        // But simply dividing by total columns for the whole day is too thin if overlaps are disjoint.

        // Refinement: Expand width if neighboring columns are empty? Complex.
        // Let's stick to: width = 100 / totalCols.
        // Wait, totalCols of the whole day? No, that shrinks everything if there's one busy hour.

        // Re-evaluating:
        // We have `columns` which are arrays of non-overlapping items.
        // Ideally we group `sorted` into "clusters" of interacting events.
        // For each cluster, we run the column packing.
        // Then width = 100 / cluster.columns.length.

        return {
            ...item,
            colIndex,
            // We need to know the layout context (total columns in this overlap group)
            // For MVP: let's just use the column approach but maybe refine totalCols later.
            // Actually, if we just use the simple column packing, we can set left = colIndex * (100/totalCols) %?
            // No, we need to cluster.
        };
    });
}
// Actually, let's use a simpler known algorithm inline or just the column bucket approach for now 
// and improve if user complains about thin events.
// "columns" array contains rows of non-overlapping events.
// The width of an event at `colIndex` should be `100 / columns.length`? 
// No, only if they actually overlap.
//
// Let's try a standard "Group by overlap" approach.

interface LayoutItem {
    id: string;
    type: 'task' | 'event';
    data: Task | GoogleEvent;
    start: Date;
    end: Date;
    top: number;
    height: number;
    colIndex?: number;
    totalCols?: number;
}

function organizeEvents(items: LayoutItem[]): LayoutItem[] {
    // Sort by start time
    items.sort((a, b) => a.start.getTime() - b.start.getTime());

    const columns: LayoutItem[][] = [];
    let lastEventEnd: Date | null = null;

    items.forEach(item => {
        // If this item starts after the last processed item ended (in universal sense? No, tricky).
        // Let's just use the greedy column packer.
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const lastInCol = col[col.length - 1];
            if (item.start >= lastInCol.end) {
                col.push(item);
                item.colIndex = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            columns.push([item]);
            item.colIndex = columns.length - 1;
        }
    });

    // Now we have items with colIndex. 
    // We need to determine width. 
    // A simple robust way is: look at all items overlapping `item`.
    // The max `colIndex` found among them + 1 determines the grid size for that bracket?
    //
    // Simplification for reliability:
    // Just calculate `width = 1 / columns.length` for the whole day? 
    // Bad if 9am has 1 event and 5pm has 4. 9am event will be 1/4 width.
    //
    // Better: Group into disjoint clusters.
    const clusters: LayoutItem[][] = [];
    let currentCluster: LayoutItem[] = [];
    let clusterEnd = 0;

    // Re-sort by start just to be sure
    // items is already sorted.

    // Flatten columns to get items back with colIndex assigned? 
    // Actually we can iterate the sorted items and build clusters.
    for (const item of items) {
        if (currentCluster.length === 0) {
            currentCluster.push(item);
            clusterEnd = item.end.getTime();
        } else {
            if (item.start.getTime() < clusterEnd) {
                currentCluster.push(item);
                if (item.end.getTime() > clusterEnd) clusterEnd = item.end.getTime();
            } else {
                clusters.push(currentCluster);
                currentCluster = [item];
                clusterEnd = item.end.getTime();
            }
        }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);

    // Now for each cluster, we recalculate columns/width LOCALLY.
    const result: LayoutItem[] = [];

    clusters.forEach(cluster => {
        // Pack cluster
        const clusterCols: LayoutItem[][] = [];
        cluster.forEach(item => {
            let placed = false;
            for (let i = 0; i < clusterCols.length; i++) {
                const col = clusterCols[i];
                const last = col[col.length - 1];
                if (item.start >= last.end) {
                    col.push(item);
                    item.colIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                clusterCols.push([item]);
                item.colIndex = clusterCols.length - 1;
            }
        });

        // Set totalCols for items in this cluster
        const n = clusterCols.length;
        cluster.forEach(item => {
            item.totalCols = n;
            result.push(item);
        });
    });

    return result;
}


function WeekColumn({ date, tasks, categories, events, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete, onEventClick }: {
    date: Date;
    tasks: Task[];
    categories?: Category[];
    events: GoogleEvent[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onEventClick: (event: GoogleEvent) => void;
}) {
    const { setNodeRef } = useDroppable({
        id: `day-${format(date, 'yyyy-MM-dd')}`,
        data: { date }
    });

    const isToday = isSameDay(date, new Date());
    const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM to 11 PM

    // PREPARE ITEMS
    // 1. Convert events to LayoutItems
    const eventItems: LayoutItem[] = events
        .map(event => {
            const start = new Date(event.start.dateTime || event.start.date!);
            const end = new Date(event.end.dateTime || event.end.date!);
            // Filter all day (already done somewhat by caller but let's be safe)
            if (!event.start.dateTime) return null;

            const hour = start.getHours();
            // Clip to view range
            if (hour < 7 && end.getHours() < 7) return null;
            if (hour > 23) return null;

            const minutes = start.getMinutes();
            const top = Math.max(0, (hour - 7) * 60 + minutes); // clamp top?
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            const height = Math.max(24, durationMinutes);

            return {
                id: event.id,
                type: 'event',
                data: event,
                start, end, top, height
            } as LayoutItem;
        })
        .filter((i): i is LayoutItem => i !== null);

    // 2. Convert tasks to LayoutItems
    const taskItems: LayoutItem[] = tasks
        .map(task => {
            if (!task.scheduled_at) return null;
            const start = new Date(task.scheduled_at);
            if (start.getHours() === 0 && start.getMinutes() === 0) return null; // Skip all day

            const hour = start.getHours();
            if (hour < 7 || hour > 23) return null;

            const minutes = start.getMinutes();
            const top = (hour - 7) * 60 + minutes;
            const height = Math.max(24, task.duration_minutes);
            const end = new Date(start.getTime() + task.duration_minutes * 60000);

            return {
                id: task.id,
                type: 'task',
                data: task,
                start, end, top, height
            } as LayoutItem;
        })
        .filter((i): i is LayoutItem => i !== null);

    const laidOutItems = organizeEvents([...eventItems, ...taskItems]);

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[120px] border-r border-slate-200 dark:border-slate-800 last:border-r-0 relative bg-white dark:bg-slate-900">
            {/* Hour grid lines */}
            {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-50 dark:border-slate-800/50 box-border w-full" />
            ))}

            {/* Render Items */}
            {laidOutItems.map(item => {
                const width = 100 / (item.totalCols || 1);
                const left = (item.colIndex || 0) * width;

                if (item.type === 'event') {
                    const event = item.data as GoogleEvent;
                    return (
                        <div
                            key={event.id}
                            className="absolute z-10 px-0.5 transition-all"
                            style={{
                                top: `${item.top}px`,
                                height: `${item.height}px`,
                                left: `${left}%`,
                                width: `${width}%`
                            }}
                        >
                            <div
                                className="h-full w-full border-l-4 rounded p-1 text-xs overflow-hidden opacity-90 shadow-sm flex flex-col cursor-pointer hover:z-20 hover:opacity-100 transition-opacity"
                                style={{
                                    backgroundColor: `${event.displayColor}20`,
                                    borderColor: event.displayColor,
                                    color: '#1e293b'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(event);
                                }}
                            >
                                <div className="font-semibold text-blue-800 truncate">{event.summary}</div>
                                <div className="text-blue-600 text-[10px] truncate">
                                    {item.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                } else {
                    const task = item.data as Task;
                    return (
                        <div
                            key={task.id}
                            className="absolute z-10 px-0.5 transition-all"
                            style={{
                                top: `${item.top}px`,
                                height: `${item.height}px`,
                                left: `${left}%`,
                                width: `${width}%`
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
                                showTime={false}
                            />
                        </div>
                    );
                }
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

            {/* All Day Row */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 relative z-30 shadow-sm">
                <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 start-0 z-40">
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-medium uppercase tracking-wider rotate-[-90deg]">
                        All Day
                    </div>
                </div>
                {weekDays.map(date => {
                    // Filter All Day Items
                    const dayAllDayEvents = events.filter(e => {
                        const start = new Date(e.start.date || e.start.dateTime!);
                        return isSameDay(start, date) && (!!e.start.date || !e.start.dateTime);
                    });
                    const dayAllDayTasks = tasks.filter(t => {
                        if (!t.scheduled_at) return false;
                        const tDate = new Date(t.scheduled_at);
                        return isSameDay(tDate, date) && tDate.getHours() === 0 && tDate.getMinutes() === 0;
                    });

                    return (
                        <div key={date.toISOString()} className="flex-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0 p-1 min-h-[32px]">
                            <div className="flex flex-col gap-1">
                                {dayAllDayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate font-medium cursor-pointer hover:opacity-80"
                                        style={{
                                            backgroundColor: `${event.displayColor}20`,
                                            borderColor: event.displayColor,
                                            color: '#1e293b'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEvent(event);
                                        }}
                                    >
                                        {event.summary}
                                    </div>
                                ))}
                                {dayAllDayTasks.map(task => (
                                    <div key={task.id}>
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
                                onEventClick={(e) => setSelectedEvent(e)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
