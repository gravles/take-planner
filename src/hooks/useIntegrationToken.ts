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
                setLoading(false);
                return;
            }

            // Determine the active provider for the current session
            // We use last_sign_in_at to determine which identity is currently "active" in the session
            // and therefore which provider the session.provider_token belongs to.
            // app_metadata.provider can be sticky (stays 'google' even if we just signed in with 'azure'),
            // so we cannot trust it for the *session token* identity.
            let activeProvider = session.user.app_metadata.provider;

            if (session.user.identities && session.user.identities.length > 0) {
                // Sort identities by last_sign_in_at descending
                const sortedIdentities = [...session.user.identities].sort((a, b) => {
                    return new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime();
                });
                if (sortedIdentities[0]) {
                    activeProvider = sortedIdentities[0].provider;
                }
            }

            // CHECK URL PARAM: This is the most reliable signal.
            // If we just came back from an OAuth flow, the URL will have ?connected_provider=...
            const urlParams = new URLSearchParams(window.location.search);
            const connectedProvider = urlParams.get('connected_provider');

            console.log(`[useIntegrationToken] Requested: ${provider}, Active (Calculated): ${activeProvider}, URL Param: ${connectedProvider}`);

            // If the URL param matches the requested provider, we TRUST it explicitly.
            // Or if the calculated active provider matches.
            const isMatch = (connectedProvider === provider) || (activeProvider === provider);

            // If we have a match and a token, SAVE it.
            if (isMatch && session.provider_token) {
                console.log(`[useIntegrationToken] Saving fresh session token for ${provider} (Match source: ${connectedProvider === provider ? 'URL' : 'Calculated'})`);
                await saveToken(session.user.id, provider, session.provider_token, session.provider_refresh_token);
            }

            // ALWAYS fetch from the database to return the token.
            // This ensures we get the token specifically associated with the requested provider,
            // avoiding any ambiguity about what session.provider_token currently holds.
            console.log(`[useIntegrationToken] Fetching from DB for ${provider}`);
            const { data, error } = await supabase
                .from('user_integrations')
                .select('access_token')
                .eq('user_id', session.user.id)
                .eq('provider', provider)
                .maybeSingle();

            if (data) {
                console.log(`[useIntegrationToken] Found DB token for ${provider}`);
                setToken(data.access_token);
            } else {
                console.log(`[useIntegrationToken] No DB token for ${provider}`);
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
            // Ensure profile exists first
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (profileError) {
                console.warn('Error ensuring profile exists:', profileError);
            }

            const { error } = await supabase
                .from('user_integrations')
                .upsert({
                    user_id: userId,
                    provider: provider,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    updated_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
                }, { onConflict: 'user_id,provider' });

            if (error) console.error('Error saving token:', error);
        } catch (err) {
            console.error('Error saving token:', err);
        }
    };

    return { token, loading, fetchToken };
}
