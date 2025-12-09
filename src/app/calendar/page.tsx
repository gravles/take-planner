'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CalendarPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to home with view=month query param, or just home for now
        // Since our main page handles the calendar view, we can just redirect there
        // Or we could refactor the main page to actually use this route.
        // For now, let's redirect to home to prevent the 404/crash.
        router.replace('/?view=month');
    }, [router]);

    return null;
}
