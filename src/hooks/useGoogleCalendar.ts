import { useState, useEffect } from 'react';
import { useIntegrationToken } from './useIntegrationToken';

export interface GoogleEvent {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
    location?: string;
    account_email?: string;
    displayColor?: string;
}

export function useGoogleCalendar() {
    const { tokens, loading: tokenLoading } = useIntegrationToken('google');
    const [events, setEvents] = useState<GoogleEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async (timeMin: Date, timeMax: Date) => {
        if (tokens.length === 0) {
            setEvents([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const allEvents: GoogleEvent[] = [];

            const colors = ['#4285F4', '#34A853', '#EA4335', '#FBBC05', '#8E24AA', '#F4511E', '#0B8043', '#039BE5'];

            // Fetch from all tokens in parallel
            const promises = tokens.map(async (token, index) => {
                const { access_token, account_email } = token;
                if (!access_token) return [];

                try {
                    const params = new URLSearchParams({
                        timeMin: timeMin.toISOString(),
                        timeMax: timeMax.toISOString(),
                        singleEvents: 'true',
                        orderBy: 'startTime'
                    });

                    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
                        headers: {
                            Authorization: `Bearer ${access_token}`
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            console.error(`[useGoogleCalendar] Token expired for ${account_email}`);
                        }
                        return [];
                    }

                    const data = await response.json();
                    const items = data.items || [];

                    // Tag items with metadata
                    const taggedItems = items.map((item: any) => ({
                        id: item.id,
                        summary: item.summary,
                        description: item.description,
                        start: item.start,
                        end: item.end,
                        htmlLink: item.htmlLink,
                        location: item.location,
                        account_email: account_email,
                        displayColor: colors[index % colors.length]
                    }));

                    return taggedItems;
                } catch (err) {
                    console.error(`Error fetching for ${account_email}:`, err);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            // Flatten results
            const flattened = results.flat();
            setEvents(flattened);

        } catch (err: any) {
            console.error('Error fetching Google Calendar events:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { events, loading: loading || tokenLoading, error, fetchEvents };
}
