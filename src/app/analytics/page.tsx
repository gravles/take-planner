'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, PieChart, TrendingUp } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useCategories } from '@/hooks/useCategories';
import { CompletionPieChart, CategoryBarChart, TrendLineChart } from '@/components/AnalyticsCharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

export default function AnalyticsPage() {
    const router = useRouter();
    const { tasks } = useTasks();
    const { categories } = useCategories();
    const [completionData, setCompletionData] = useState<{ name: string; value: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
    const [trendData, setTrendData] = useState<{ date: string; completed: number }[]>([]);

    useEffect(() => {
        if (!tasks.length) return;

        // 1. Completion Rate
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const todoCount = tasks.filter(t => t.status !== 'completed').length;
        setCompletionData([
            { name: 'Completed', value: completedCount },
            { name: 'Pending', value: todoCount },
        ]);

        // 2. Tasks by Category
        const catCounts: Record<string, number> = {};
        tasks.forEach(task => {
            if (task.category_id) {
                const catName = categories.find(c => c.id === task.category_id)?.name || 'Unknown';
                catCounts[catName] = (catCounts[catName] || 0) + 1;
            } else {
                catCounts['Uncategorized'] = (catCounts['Uncategorized'] || 0) + 1;
            }
        });
        setCategoryData(Object.entries(catCounts).map(([name, count]) => ({ name, count })));

        // 3. Completion Trend (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i);
            return date;
        });

        const trend = last7Days.map(date => {
            const count = tasks.filter(t =>
                t.status === 'completed' &&
                t.completed_at &&
                isSameDay(parseISO(t.completed_at), date)
            ).length;
            return {
                date: format(date, 'MMM dd'),
                completed: count
            };
        });
        setTrendData(trend);

    }, [tasks, categories]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Completion Rate */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChart className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold">Completion Rate</h2>
                        </div>
                        <CompletionPieChart data={completionData} />
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart2 className="w-5 h-5 text-green-500" />
                            <h2 className="text-lg font-semibold">Tasks by Category</h2>
                        </div>
                        <CategoryBarChart data={categoryData} />
                    </div>

                    {/* Productivity Trend */}
                    <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            <h2 className="text-lg font-semibold">Productivity Trend (Last 7 Days)</h2>
                        </div>
                        <TrendLineChart data={trendData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
