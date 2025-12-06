import { useState, useEffect } from 'react';
import { Task, TaskPriority, Category } from '@/types';
import { X, Calendar, Clock, Tag, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useCategories } from '@/hooks/useCategories';
import { CategoryManager } from './CategoryManager';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => Promise<void>;
    initialTask?: Task | null;
}

export function CreateTaskModal({ isOpen, onClose, onSave, initialTask }: CreateTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(30);
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

    useEffect(() => {
        if (isOpen && initialTask) {
            setTitle(initialTask.title);
            setDescription(initialTask.description || '');
            setDuration(initialTask.duration_minutes);
            setPriority(initialTask.priority);
            setCategoryId(initialTask.category_id || '');

            if (initialTask.scheduled_at) {
                const date = new Date(initialTask.scheduled_at);
                setScheduledDate(format(date, 'yyyy-MM-dd'));
                setScheduledTime(format(date, 'HH:mm'));
            } else {
                setScheduledDate('');
                setScheduledTime('');
            }
        } else if (isOpen) {
            // Reset for new task
            setTitle('');
            setDescription('');
            setDuration(30);
            setPriority('medium');
            setScheduledDate('');
            setScheduledTime('');
            setCategoryId('');
        }
    }, [isOpen, initialTask]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            let scheduled_at = null;
            if (scheduledDate && scheduledTime) {
                scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            await onSave({
                ...(initialTask ? { id: initialTask.id } : {}),
                title,
                description: description || null,
                duration_minutes: duration,
                priority,
                status: initialTask?.status || 'todo',
                scheduled_at,
                category_id: categoryId || null,
            });
            onClose();
        } catch (error) {
            console.error('Failed to save task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-xl font-bold mb-6 text-gray-800">
                        {initialTask ? 'Edit Task' : 'Create New Task'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                placeholder="What needs to be done?"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none h-20"
                                placeholder="Add details..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                        min="5"
                                        step="5"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryManagerOpen(true)}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <Settings className="w-3 h-3" /> Manage
                                </button>
                            </div>
                            <div className="relative">
                                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none appearance-none bg-white"
                                >
                                    <option value="">No Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (Optional)</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                    />
                                </div>
                                <input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                />
                            </div>
                            {scheduledDate && (
                                <button
                                    type="button"
                                    onClick={() => { setScheduledDate(''); setScheduledTime(''); }}
                                    className="text-xs text-red-500 hover:text-red-700 mt-1"
                                >
                                    Clear Schedule (Move to Bench)
                                </button>
                            )}
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim() || isSubmitting}
                                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : (initialTask ? 'Save Changes' : 'Create Task')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {isCategoryManagerOpen && (
                <CategoryManager
                    categories={categories}
                    onAdd={addCategory}
                    onUpdate={updateCategory}
                    onDelete={deleteCategory}
                    onClose={() => setIsCategoryManagerOpen(false)}
                />
            )}
        </>
    );
}
