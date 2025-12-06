import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
}

export function DatePicker({ currentDate, onDateChange }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(currentDate);

    const toggleOpen = () => {
        if (!isOpen) {
            setViewDate(currentDate);
        }
        setIsOpen(!isOpen);
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(subMonths(viewDate, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(addMonths(viewDate, 1));
    };

    const handleDateClick = (date: Date) => {
        onDateChange(date);
        setIsOpen(false);
    };

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate padding days for the start of the month
    const startDay = monthStart.getDay(); // 0 is Sunday
    const paddingDays = Array.from({ length: startDay }, (_, i) => i);

    return (
        <div className="relative">
            <button
                onClick={toggleOpen}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
            >
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span>{format(currentDate, 'MMM d, yyyy')}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border p-4 z-50 w-64 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-semibold text-sm">
                                {format(viewDate, 'MMMM yyyy')}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-center text-xs text-gray-400 font-medium">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {paddingDays.map(i => (
                                <div key={`padding-${i}`} />
                            ))}
                            {daysInMonth.map(date => {
                                const isSelected = isSameDay(date, currentDate);
                                const isCurrentMonth = isSameMonth(date, viewDate);
                                const isDayToday = isToday(date);

                                return (
                                    <button
                                        key={date.toISOString()}
                                        onClick={() => handleDateClick(date)}
                                        className={cn(
                                            "h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors relative",
                                            isSelected ? "bg-black text-white hover:bg-gray-800" : "hover:bg-gray-100 text-gray-700",
                                            isDayToday && !isSelected && "text-blue-600 font-bold bg-blue-50",
                                            !isCurrentMonth && "text-gray-300"
                                        )}
                                    >
                                        {format(date, 'd')}
                                        {isDayToday && !isSelected && (
                                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
