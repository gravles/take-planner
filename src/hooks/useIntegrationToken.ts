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

    // Backward compatibility for single-token consumers
    const token = tokens.length > 0 ? tokens[0].access_token : null;

    useEffect(() => {
        handleNewConnection();
        fetchTokens();
    }, [provider]);

    const handleNewConnection = async () => {
        // Parse the hash for tokens directly, as session.provider_token might be stale (pointing to primary user)
        // when linking a secondary account.
        const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove leading '#'
        const hashProviderToken = hashParams.get('provider_token');
        const hashProviderRefreshToken = hashParams.get('provider_refresh_token');

        // Allow falling back to session if hash is empty (e.g. prompt re-check), but hash is preferred for fresh links.
        const { data: { session } } = await supabase.auth.getSession();

        // Determine the effective token to use
        const effectiveToken = hashProviderToken || session?.provider_token;
        const effectiveRefreshToken = hashProviderRefreshToken || session?.provider_refresh_token;

        if (!effectiveToken && !session) return;

        // Check our requested provider context from URL param
        const urlParams = new URLSearchParams(window.location.search);
        const connectedProvider = urlParams.get('connected_provider');

        if (connectedProvider === provider) {

            // If we found it in the HASH, it's definitely the one we just asked for.
            if (hashProviderToken) {
                console.log(`[useIntegrationToken] Found fresh HASH token for ${provider}. Verifying...`);
                await saveToken(session?.user?.id || 'unknown', provider, hashProviderToken, hashProviderRefreshToken);
                fetchTokens();
                return;
            } else {
                console.log(`[useIntegrationToken] No provider_token in hash.`);
            }

            // Fallback to session, BUT we must be careful.
            // If the session.provider_token is for a DIFFERENT provider, we must not use it.

            if (session && session.provider_token) {
                // Warn and skip to prevent 401 loop if hash is missing
                console.warn(`[useIntegrationToken] Session token found, but hash token missing. Skipping auto-save to prevent stale token usage.`);
            }
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
                console.log(`[useIntegrationToken] Loaded ${data.length} tokens for ${provider}`);
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
        }
    };

    const saveToken = async (userId: string, provider: string, accessToken: string, refreshToken?: string | null) => {
        try {
            let providerEmail = null;

            console.log(`[useIntegrationToken] Verifying email for ${provider} with token: ${accessToken?.substring(0, 10)}...`);

            try {
                if (provider === 'google') {
                    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        providerEmail = user.email;
                    } else {
                        console.warn(`[useIntegrationToken] Google UserInfo failed: ${res.status} ${res.statusText}`);
                    }
                } else if (provider === 'azure') {
                    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        providerEmail = user.mail || user.userPrincipalName;
                    } else {
                        console.warn(`[useIntegrationToken] MS Graph /me failed: ${res.status} ${res.statusText}`);
                    }
                }
            } catch (err) {
                console.error(`[useIntegrationToken] Email fetch error:`, err);
            }

            if (!providerEmail) {
                console.error(`[useIntegrationToken] Could not verify email from token. Aborting save.`);
                return;
            }

            console.log(`[useIntegrationToken] Saving token for ${providerEmail}`);

            // Ensure profile exists
            await supabase.from('profiles').upsert({ id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

            // Upsert Integration
            const { error } = await supabase
                .from('user_integrations')
                .upsert({
                    user_id: userId,
                    provider: provider,
                    account_email: providerEmail,
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

    return { tokens, token, loading, fetchTokens };
}
