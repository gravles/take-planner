'use client';

import { TaskBench } from '@/components/TaskBench';
import { CalendarView } from '@/components/CalendarView';
import { useTasks } from '@/hooks/useTasks';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { TaskCard } from '@/components/TaskCard';
import { Task } from '@/types';
import { FocusTimer } from '@/components/FocusTimer';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { NotificationManager } from '@/components/NotificationManager';

export default function Home() {
  const { tasks, loading, addTask, updateTask } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null); // For drag overlay
  const [focusTask, setFocusTask] = useState<Task | null>(null); // For timer
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Separate tasks into bench (unscheduled) and calendar (scheduled)
  const benchTasks = tasks.filter(t => !t.scheduled_at);
  const scheduledTasks = tasks.filter(t => t.scheduled_at);

  const handleCreateTask = () => {
    setIsModalOpen(true);
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
        const now = new Date();
        const scheduledAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);

        await updateTask(taskId, { scheduled_at: scheduledAt.toISOString() });
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
        <TaskBench tasks={benchTasks} onFocus={setFocusTask} />

        <div className="flex-1 flex flex-col h-screen relative">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
            <h1 className="text-xl font-bold text-gray-800">My Planner</h1>
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </header>

          <CalendarView tasks={scheduledTasks} onFocus={setFocusTask} />
        </div>
      </main>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>

      {focusTask && <FocusTimer activeTask={focusTask} />}

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={addTask}
      />

      <NotificationManager tasks={tasks} />
    </DndContext>
  );
}
