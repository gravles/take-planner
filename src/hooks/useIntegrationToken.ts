import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useIntegrationToken(provider: 'google' | 'azure') {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchToken();
    }, [provider]);

    const fetchToken = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setToken(null);
                return;
            }

            // First, check if the current session IS the provider we want
            // This is the most fresh token
            if (session.user.app_metadata.provider === provider && session.provider_token) {
                setToken(session.provider_token);
                // We should also save this to the DB for later
                await saveToken(session.user.id, provider, session.provider_token, session.provider_refresh_token);
                return;
            }

            // If not, fetch from the database
            const { data, error } = await supabase
                .from('user_integrations')
                .select('access_token')
                .eq('user_id', session.user.id)
                .eq('provider', provider)
                .single();

            if (data) {
                setToken(data.access_token);
            } else {
                setToken(null);
            }
        } catch (error) {
            console.error(`Error fetching ${provider} token:`, error);
            setToken(null);
        } finally {
            setLoading(false);
        }
    };

    const saveToken = async (userId: string, provider: string, accessToken: string, refreshToken?: string | null) => {
        try {
            const { error } = await supabase
                .from('user_integrations')
                .upsert({
                    user_id: userId,
                    provider: provider,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    updated_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString() // Assume 1 hour if unknown
                }, { onConflict: 'user_id, provider' });

            if (error) console.error('Error saving token:', error);
        } catch (err) {
            console.error('Error saving token:', err);
        }
    };

    return { token, loading, fetchToken };
}
