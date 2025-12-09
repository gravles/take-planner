import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface IntegrationToken {
    access_token: string;
    account_email: string;
    is_primary: boolean;
}

export function useIntegrationToken(provider: 'google' | 'azure') {
    const [tokens, setTokens] = useState<IntegrationToken[]>([]);
    const [loading, setLoading] = useState(true);

    // Backward compatibility for single-token consumers (optional, or we update them)
    const token = tokens.length > 0 ? tokens[0].access_token : null;

    useEffect(() => {
        fetchTokens();
        handleNewConnection();
    }, [provider]);

    const handleNewConnection = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.provider_token) return;

        // Check if this fresh token matches our requested provider 'type'
        // We can check URL or try to infer. 
        const urlParams = new URLSearchParams(window.location.search);
        const connectedProvider = urlParams.get('connected_provider');

        // Only proceed if we explicitly asked for this provider OR it blindly matches
        if (connectedProvider === provider) {
            console.log(`[useIntegrationToken] Found fresh token for ${provider}. Verifying identity...`);
            await saveToken(session.user.id, provider, session.provider_token, session.provider_refresh_token);
            // Clear the param to avoid re-saving loop (optional, but good UX)
            // window.history.replaceState({}, '', window.location.pathname); 
            // ^ commenting out to avoid Next.js hydration mismatches or aggressive URL changes

            // Refresh list
            fetchTokens();
        }
    };

    const fetchTokens = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setTokens([]);
                return;
            }

            const { data, error } = await supabase
                .from('user_integrations')
                .select('access_token, account_email, is_primary')
                .eq('user_id', session.user.id)
                .eq('provider', provider);

            if (data) {
                console.log(`[useIntegrationToken] Loaded ${data.length} tokens for ${provider}`, data);
                setTokens(data);
            } else {
                console.log(`[useIntegrationToken] No data found for ${provider}`);
            }

            if (error) {
                console.error(`[useIntegrationToken] Error fetching ${provider}:`, error);
            }
        } catch (error) {
            console.error(`Error fetching ${provider} tokens:`, error);
        } finally {
            setLoading(false);
            // 3. Upsert Integration
            // Check if this is the first one?
            // For now, we just upsert.
            const { error } = await supabase
                .from('user_integrations')
                .upsert({
                    user_id: userId,
                    provider: provider,
                    account_email: email,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    updated_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
                }, { onConflict: 'user_id,provider,account_email' });

            if (error) console.error('Error saving token:', error);

        } catch (err) {
            console.error('Error saving token:', err);
        }
    };

    return { tokens, token, loading, fetchTokens }; // Expose both for compatibility
}
