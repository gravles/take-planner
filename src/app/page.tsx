'use client';

import { TaskBench } from '@/components/TaskBench';
import { CalendarView } from '@/components/CalendarView';
import { useTasks } from '@/hooks/useTasks';
import { useCategories } from '@/hooks/useCategories';
import { TaskListView } from '@/components/TaskListView';
import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, LayoutList, Calendar } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { TaskCard } from '@/components/TaskCard';
import { Task } from '@/types';
import { FocusTimer } from '@/components/FocusTimer';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { NotificationManager } from '@/components/NotificationManager';
import { DatePicker } from '@/components/DatePicker';

import { WeekView } from '@/components/WeekView';
import { MonthView } from '@/components/MonthView';

export default function Home() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const { categories } = useCategories();
  const [activeTask, setActiveTask] = useState<Task | null>(null); // For drag overlay
  const [focusTask, setFocusTask] = useState<Task | null>(null); // For timer
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'list'>('day');

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updates: Partial<Task> = { status: newStatus };

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    await updateTask(task.id, updates);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Separate tasks into bench (unscheduled) and calendar (scheduled)
  const benchTasks = tasks.filter(t => !t.scheduled_at);

  const scheduledTasks = tasks.filter(t => {
    if (!t.scheduled_at) return false;
    const taskDate = new Date(t.scheduled_at);
    return (
      taskDate.getDate() === currentDate.getDate() &&
      taskDate.getMonth() === currentDate.getMonth() &&
      taskDate.getFullYear() === currentDate.getFullYear()
    );
  });

  const handleUnscheduleTask = async (task: Task) => {
    await updateTask(task.id, { scheduled_at: null });
  };

  const handleDeleteTask = async (task: Task) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    let success = false;
    if (editingTask) {
      success = await updateTask(editingTask.id, taskData) || false;
    } else {
      success = await addTask(taskData as any) || false;
    }

    if (success) {
      setIsModalOpen(false);
      setEditingTask(null);
    } else {
      alert('Failed to save task. Check console for details.');
    }
  };

  const handleDragStart = (event: any) => {
    setActiveTask(event.active.data.current);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Dropped on Bench
    if (over.id === 'bench-uncategorized') {
      await updateTask(taskId, {
        scheduled_at: null,
        category_id: null
      });
      return;
    }

    if (typeof over.id === 'string' && over.id.startsWith('bench-category-')) {
      const categoryId = over.id.replace('bench-category-', '');
      await updateTask(taskId, {
        scheduled_at: null,
        category_id: categoryId
      });
      return;
    }

    if (over.id === 'bench') {
      if (task.scheduled_at) {
        await updateTask(taskId, { scheduled_at: null });
      }
      return;
    }

    // Dropped on Calendar Slot
    const overId = over.id as string;
    if (overId.startsWith('slot-')) {
      const hour = over.data.current?.hour;
      if (typeof hour === 'number') {
        const scheduledAt = new Date(currentDate);

        // Calculate minutes based on drop position
        // We need the Y coordinate relative to the droppable container
        // dnd-kit provides `delta` (change in position) but not relative offset directly in `over`.
        // However, we can use the `active.rect` and `over.rect` to find the relative position.

        const overRect = over.rect;
        const activeRect = active.rect.current.translated;

        if (overRect && activeRect) {
          const relativeY = activeRect.top - overRect.top;
          const slotHeight = 120; // Must match CalendarView height

          // Calculate raw minutes: (relativeY / slotHeight) * 60
          // Clamp between 0 and 55 to stay within the hour
          let minutes = Math.max(0, Math.min(55, (relativeY / slotHeight) * 60));

          // Round to nearest 5 minutes
          minutes = Math.round(minutes / 5) * 5;

          scheduledAt.setHours(hour, minutes, 0, 0);
          await updateTask(taskId, { scheduled_at: scheduledAt.toISOString() });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex h-screen overflow-hidden bg-white">
        {viewMode !== 'list' && (
          <TaskBench
            tasks={benchTasks}
            categories={categories}
            onFocus={setFocusTask}
            onEdit={handleEditTask}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteTask}
            onUnschedule={handleUnscheduleTask}
          />
        )}

        <div className="flex-1 flex flex-col h-screen relative">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">My Planner</h1>

              {viewMode !== 'list' && (
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))}
                    className="p-1 hover:bg-white rounded-md transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <DatePicker currentDate={currentDate} onDateChange={setCurrentDate} />

                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))}
                    className="p-1 hover:bg-white rounded-md transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-4">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  Month
                </button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                  title="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </header>

          {viewMode === 'day' && (
            <CalendarView
              tasks={scheduledTasks}
              onFocus={setFocusTask}
              onEdit={handleEditTask}
              onToggleComplete={handleToggleComplete}
              onUnschedule={handleUnscheduleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks} // Pass all tasks, filtering happens inside
              onFocus={setFocusTask}
              onEdit={handleEditTask}
              onToggleComplete={handleToggleComplete}
              onUnschedule={handleUnscheduleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              tasks={tasks} // Pass all tasks, filtering happens inside
              onFocus={setFocusTask}
              onEdit={handleEditTask}
              onToggleComplete={handleToggleComplete}
              onUnschedule={handleUnscheduleTask}
              onDelete={handleDeleteTask}
            />
          )}

          {viewMode === 'list' && (
            <TaskListView
              tasks={tasks}
              categories={categories}
              onFocus={setFocusTask}
              onEdit={handleEditTask}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onUnschedule={handleUnscheduleTask}
            />
          )}
        </div>
      </main>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>

      {focusTask && <FocusTimer activeTask={focusTask} onClose={() => setFocusTask(null)} />}

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />

      <NotificationManager tasks={tasks} />
    </DndContext>
  );
}
