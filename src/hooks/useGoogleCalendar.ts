import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface GoogleEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

export function useGoogleCalendar() {
    const [events, setEvents] = useState<GoogleEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async (timeMin: Date, timeMax: Date) => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.provider_token) {
                // If no provider token, we might not be logged in with Google or the token is missing
                // For now, just return empty if no token
                return;
            }

            // Check if the provider is google
            if (session.user.app_metadata.provider !== 'google') {
                return;
            }

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
                        Authorization: `Bearer ${session.provider_token}`,
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

    return { events, loading, error, fetchEvents };
}
