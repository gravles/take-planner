import { useState, useEffect } from 'react';
import { useIntegrationToken } from './useIntegrationToken';

export interface GoogleEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
    location?: string;
}

export function useGoogleCalendar() {
    const [events, setEvents] = useState<GoogleEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token, loading: tokenLoading } = useIntegrationToken('google');

    const fetchEvents = async (timeMin: Date, timeMax: Date) => {
        if (!token) return;

        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: 'true',
                orderBy: 'startTime',
            });

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Google Calendar API error: ${response.statusText}`);
            }

            const data = await response.json();
            setEvents(data.items || []);
        } catch (err: any) {
            console.error('Error fetching Google Calendar events:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when token is available
    useEffect(() => {
        if (token) {
            const now = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 7); // Fetch next 7 days by default
            fetchEvents(now, end);
        }
    }, [token]);

    return { events, loading: loading || tokenLoading, error, fetchEvents };
}
