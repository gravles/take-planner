import { Task, Category } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskBenchProps {
    tasks: Task[];
    categories: Category[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onReorderCategories?: (categories: Category[]) => void;
}

function CategoryZone({
    id,
    title,
    color,
    tasks,
    onFocus,
    onEdit,
    onToggleComplete,
    onUnschedule,
    onDelete,
    isSortable = false,
    category
}: {
    id: string;
    title: string;
    color?: string;
    tasks: Task[];
    onFocus?: (task: Task) => void;
    onEdit?: (task: Task) => void;
    onToggleComplete?: (task: Task) => void;
    onUnschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    isSortable?: boolean;
    category?: Category;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    // Sortable hooks (only if it's a category)
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: category ? `category-${category.id}` : 'uncategorized-zone',
        data: category,
        disabled: !isSortable
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setSortableRef}
            style={style}
            className={cn(
                "rounded-xl transition-all duration-200 border border-transparent",
                isDragging ? "opacity-50 z-50 bg-slate-100 dark:bg-slate-800 shadow-lg scale-105" : "",
                isOver ? "bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800 border-blue-200 dark:border-blue-800" : "bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
        >
            <div className="flex items-center gap-2 p-2 group select-none">
                {isSortable && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors"
                >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {color && <div className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5 dark:ring-white/10" style={{ backgroundColor: color }} />}
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{title}</h3>
                    <span className="text-xs text-slate-400 font-medium bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div ref={setNodeRef} className="p-2 pt-0 space-y-2 min-h-[60px]">
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onFocus={onFocus}
                            onEdit={onEdit}
                            onToggleComplete={onToggleComplete}
                            onUnschedule={onUnschedule}
                            onDelete={onDelete}
                        />
                    ))}
                    {tasks.length === 0 && (
                        <div className="h-10 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
                            Drop here
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function TaskBench({ tasks, categories, onFocus, onEdit, onToggleComplete, onUnschedule, onDelete, onReorderCategories }: TaskBenchProps) {
    const uncategorizedTasks = tasks.filter(t => !t.category_id);

    return (
        <div className="w-80 md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-xl shadow-slate-200/50 dark:shadow-black/20 z-20">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                    Task Bench
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full font-medium">{tasks.length}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Drag tasks to categories</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {/* Uncategorized Zone (Not sortable) */}
                <CategoryZone
                    id="bench-uncategorized"
                    title="No Category"
                    tasks={uncategorizedTasks}
                    onFocus={onFocus}
                    onEdit={onEdit}
                    onToggleComplete={onToggleComplete}
                    onUnschedule={onUnschedule}
                    onDelete={onDelete}
                    isSortable={false}
                />

                {/* Sortable Category Zones */}
                <SortableContext
                    items={categories.map(c => `category-${c.id}`)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {categories.map(category => (
                            <CategoryZone
                                key={category.id}
                                id={`bench-category-${category.id}`}
                                title={category.name}
                                color={category.color}
                                tasks={tasks.filter(t => t.category_id === category.id)}
                                onFocus={onFocus}
                                onEdit={onEdit}
                                onToggleComplete={onToggleComplete}
                                onUnschedule={onUnschedule}
                                onDelete={onDelete}
                                isSortable={true}
                                category={category}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}
