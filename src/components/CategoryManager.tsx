import { useState } from 'react';
import { Category } from '@/types';
import { X, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryManagerProps {
    categories: Category[];
    onAdd: (name: string, color: string) => Promise<any>;
    onUpdate: (id: string, updates: Partial<Category>) => Promise<any>;
    onDelete: (id: string) => Promise<any>;
    onClose: () => void;
}

const COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#64748b', // slate-500
];

export function CategoryManager({ categories, onAdd, onUpdate, onDelete, onClose }: CategoryManagerProps) {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[5]); // Default blue
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        await onAdd(newCategoryName, selectedColor);
        setNewCategoryName('');
        setSelectedColor(COLORS[5]);
    };

    const startEdit = (category: Category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setEditColor(category.color);
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        await onUpdate(editingId, { name: editName, color: editColor });
        setEditingId(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Manage Categories</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Add New Category */}
                <div className="mb-6 space-y-3">
                    <label className="text-sm font-medium text-gray-700">Add New Category</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Category Name"
                            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newCategoryName.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={cn(
                                    "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                    selectedColor === color && "ring-2 ring-offset-2 ring-blue-500 scale-110"
                                )}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>

                {/* Category List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {categories.map(category => (
                        <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                            {editingId === category.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                        autoFocus
                                    />
                                    <div className="flex gap-1">
                                        {COLORS.slice(0, 5).map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setEditColor(color)}
                                                className={cn(
                                                    "w-4 h-4 rounded-full",
                                                    editColor === color && "ring-1 ring-offset-1 ring-black"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: category.color }}
                                        />
                                        <span className="font-medium text-gray-700">{category.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(category)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(category.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="text-center text-gray-500 text-sm py-4">No categories yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
