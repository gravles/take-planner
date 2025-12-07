'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Profile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

export default function SettingsPage() {
    const router = useRouter();
}
