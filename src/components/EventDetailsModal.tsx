
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import { X, Calendar, MapPin, AlignLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface EventDetailsModalProps {
    event: GoogleEvent;
    onClose: () => void;
}

export function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
    if (!event) return null;

    const start = event.start.dateTime ? new Date(event.start.dateTime) : (event.start.date ? new Date(event.start.date) : null);
    const end = event.end.dateTime ? new Date(event.end.dateTime) : (event.end.date ? new Date(event.end.date) : null);

    const isAllDay = !event.start.dateTime;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
                style={{ borderTop: `4px solid ${event.displayColor || '#3b82f6'}` }}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 pb-2">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 pr-8 break-words leading-tight">
                        {event.summary}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 pt-2 space-y-4">
                    {/* Time */}
                    <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {start && (
                                <div>
                                    {format(start, 'EEEE, MMMM d, yyyy')}
                                    {!isAllDay && (
                                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                                            {' • ' + format(start, 'h:mm a')}
                                            {end && ' - ' + format(end, 'h:mm a')}
                                        </span>
                                    )}
                                    {isAllDay && <span className="text-slate-500 dark:text-slate-400 font-normal"> • All Day</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-words"
                            >
                                {event.location}
                            </a>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="flex items-start gap-3">
                            <AlignLeft className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div
                                className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: event.description }}
                            />
                        </div>
                    )}

                    {/* Footer / Account Info */}
                    <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                            Calendar: <span className="font-medium text-slate-600 dark:text-slate-300">{event.account_email || 'Primary'}</span>
                        </div>
                        {event.htmlLink && (
                            <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                Open in Google Calendar
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
