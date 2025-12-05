import { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface FocusTimerProps {
    activeTask?: Task | null;
}

export function FocusTimer({ activeTask }: FocusTimerProps) {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play sound or notify
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(25 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!activeTask) return null;

    return (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg border p-4 w-80 z-50">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Timer className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800 text-sm">Focus Mode</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{activeTask.title}</p>
                </div>
            </div>

            <div className="text-4xl font-bold text-center font-mono text-gray-800 mb-6">
                {formatTime(timeLeft)}
            </div>

            <div className="flex justify-center gap-3">
                <button
                    onClick={toggleTimer}
                    className={cn(
                        "p-3 rounded-full transition-colors",
                        isActive
                            ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                >
                    {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                <button
                    onClick={resetTimer}
                    className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    <Square className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
