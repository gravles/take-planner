'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';



import { useIntegrationToken } from '@/hooks/useIntegrationToken';
import { ProfileSettings } from '@/components/ProfileSettings';

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

    // Initialize hooks to capture and save tokens after redirect
    // This is CRITICAL: The hooks check the URL for ?connected_provider=... and save the session token to the DB.
    // Without this, the token is lost after the OAuth redirect.
    // Initialize hooks to capture and save tokens after redirect
    const { tokens: googleTokens } = useIntegrationToken('google');
    const { tokens: azureTokens } = useIntegrationToken('azure');

    useEffect(() => {
        // Handle session check with onAuthStateChange to catch redirect updates
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                // Fetch integrations
                fetchIntegrations(session.user.id);
            } else {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function fetchIntegrations(userId: string) {
        try {
            setLoading(true);
            const { data: integrationsData, error: integrationsError } = await supabase
                .from('user_integrations')
                .select('provider')
                .eq('user_id', userId);

            if (integrationsData) {
                const dbProviders = integrationsData.map(i => i.provider);
                setConnectedProviders(dbProviders);
            }
        } catch (error) {
    );
        }
