'use client';

import { TaskBench } from '@/components/TaskBench';
import { CalendarView } from '@/components/CalendarView';
import { useTasks } from '@/hooks/useTasks';
import { useCategories } from '@/hooks/useCategories';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useMicrosoftToDo } from '@/hooks/useMicrosoftToDo';
import { TaskListView } from '@/components/TaskListView';
import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, LayoutList, Calendar, Menu, X, Loader2, LogOut, Settings } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners } from '@dnd-kit/core';
import Link from 'next/link';
import { Auth } from '@/components/Auth';
import { supabase } from '@/lib/supabase';
import { TaskCard } from '@/components/TaskCard';
import { Task } from '@/types';
import { FocusTimer } from '@/components/FocusTimer';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { NotificationManager } from '@/components/NotificationManager';
import { DatePicker } from '@/components/DatePicker';

import { WeekView } from '@/components/WeekView';
import { MonthView } from '@/components/MonthView';

export default function Home() {
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useTasks();
  const { categories, loading: categoriesLoading } = useCategories();
  const { events: googleEvents, fetchEvents: fetchGoogleEvents } = useGoogleCalendar();
  const { tasks: msToDoTasks } = useMicrosoftToDo();



  const [activeTask, setActiveTask] = useState<Task | null>(null); // For drag overlay
  const [focusTask, setFocusTask] = useState<Task | null>(null); // For timer
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'list'>('day');
  const [isBenchOpen, setIsBenchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Google Events when date or view changes
  useEffect(() => {
    if (session?.user?.app_metadata?.provider === 'google') {
      const start = new Date(currentDate);
      const end = new Date(currentDate);

      if (viewMode === 'day') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (viewMode === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (viewMode === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }

      // Add some buffer to be safe
      fetchGoogleEvents(start, end);
    }
  }, [currentDate, viewMode, session]);



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
      success = await addTask({
        ...taskData as any,
        user_id: session?.user?.id, // Use actual user ID
        status: 'todo',
      }) || false;
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

        if (hour === 0) {
          // All Day / Due Today
          scheduledAt.setHours(0, 0, 0, 0);
        } else {
          // Calculate minutes based on drop position
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
          } else {
            scheduledAt.setHours(hour, 0, 0, 0);
          }
        }

        await updateTask(taskId, { scheduled_at: scheduledAt.toISOString() });
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
    >
      <main className="flex flex-col md:flex-row h-screen overflow-hidden bg-white relative">
        {/* Mobile Header Overlay for Bench */}
        {isBenchOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsBenchOpen(false)}
          />
        )}

        {/* Task Bench - Sidebar on Desktop, Drawer on Mobile */}
        {viewMode !== 'list' && (
          <div className={`
            fixed md:relative z-40 h-full transition-transform duration-300 ease-in-out
            ${isBenchOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <TaskBench
              tasks={benchTasks}
              categories={categories}
              onFocus={setFocusTask}
              onEdit={handleEditTask}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onUnschedule={handleUnscheduleTask}
            />
            {/* Close button for mobile bench */}
            <button
              onClick={() => setIsBenchOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col h-screen relative w-full bg-slate-50/50">
          <header className="h-16 border-b border-slate-200/60 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-30 shrink-0 gap-2">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile Bench Toggle */}
              {viewMode !== 'list' && (
                <button
                  onClick={() => setIsBenchOpen(true)}
                  className="p-2 -ml-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate hidden sm:block tracking-tight">My Planner</h1>

              {viewMode !== 'list' && (
                <div className="flex items-center gap-1 md:gap-2 bg-slate-100/50 rounded-lg p-1 border border-slate-200/50">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))}
                    className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <DatePicker currentDate={currentDate} onDateChange={setCurrentDate} />

                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))}
                    className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-slate-100/80 rounded-lg p-1 ml-2 md:ml-4 overflow-x-auto no-scrollbar border border-slate-200/50">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Month
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1 hidden sm:block" />
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  title="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs md:text-sm font-medium whitespace-nowrap shrink-0 shadow-md shadow-slate-900/10"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">New</span>
            </button>

            <div className="relative ml-2">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Backdrop to close menu */}
              {isUserMenuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
              )}

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Signed in as</p>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {session.user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {viewMode === 'day' && (
            <CalendarView
              tasks={scheduledTasks}
              categories={categories}
              events={googleEvents}
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
              categories={categories}
              events={googleEvents}
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
              categories={categories}
              events={googleEvents}
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
