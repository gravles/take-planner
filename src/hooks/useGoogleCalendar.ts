import { useState, useEffect } from 'react';
import { useIntegrationToken } from './useIntegrationToken';

export interface GoogleEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
    location?: string;
    account_email?: string;
    displayColor?: string;
}

export function useGoogleCalendar() {
    const [events, setEvents] = useState<GoogleEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { tokens, loading: tokenLoading } = useIntegrationToken('google');

    const fetchEvents = async (timeMin: Date, timeMax: Date) => {
        if (!tokens || tokens.length === 0) {
            setEvents([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const allEvents: GoogleEvent[] = [];
            const colors = ['#4285F4', '#34A853', '#EA4335', '#FBBC05']; // Blue, Green, Red, Yellow

            for (let i = 0; i < tokens.length; i++) {
                const { access_token, account_email } = tokens[i];
                const color = colors[i % colors.length];
                const label = account_email || 'Primary';

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
                                Authorization: `Bearer ${access_token}`,
                            },
                        }
                    );

                    if (!response.ok) {
                        console.warn(`Failed to fetch events for ${label}: ${response.statusText}`);
                        continue; // Skip failing accounts
                    }

                    const data = await response.json();
                    const items = data.items || [];

                    // Tag items with metadata
                    const taggedItems = items.map((item: any) => ({
                        ...item,
                        account_email: label,
                        displayColor: color
                    }));

                    allEvents.push(...taggedItems);

                } catch (innerErr) {
                    console.error(`Error fetching for ${label}`, innerErr);
                }
            }

            setEvents(allEvents);
        } catch (err: any) {
            console.error('Error fetching Google Calendar events:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when tokens are available
    useEffect(() => {
        if (tokens.length > 0) {
            const now = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 7); // Fetch next 7 days by default
            fetchEvents(now, end);
        }
    }, [tokens]);

    return { events, loading: loading || tokenLoading, error, fetchEvents };
}
