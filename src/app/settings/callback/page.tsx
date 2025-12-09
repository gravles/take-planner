'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Verifying connection...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for Errors first
                const error = searchParams.get('error');
                const errorCode = searchParams.get('error_code');
                const errorDescription = searchParams.get('error_description');
                const provider = searchParams.get('provider') || 'azure';

                if (errorCode === 'identity_already_exists') {
                    console.warn('[AuthCallback] Identity already linked.');
                    setStatus('Resolving connection conflict...');

                    // HEALING LOGIC: Unlink and Retry
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.identities) {
                        const existingIdentity = session.user.identities.find(
                            id => id.provider === provider
                        );

                        if (existingIdentity) {
                            console.log('[AuthCallback] Found stale identity. Unlinking:', existingIdentity.id);
                            const { error: unlinkError } = await supabase.auth.unlinkIdentity(existingIdentity);

                            if (!unlinkError) {
                                setStatus('Conflict resolved. Retrying connection...');
                                setTimeout(() => {
                                    window.location.href = `/settings?retry_provider=${provider}`;
                                }, 1500);
                                return;
                            } else {
                                console.error('Unlink failed:', unlinkError);
                                setStatus(`Error: Unlink failed. ${unlinkError.message || JSON.stringify(unlinkError)}`);
                            }

                        } else {
                            // Identity exists but NOT on this user? Then it's on another user.
                            setStatus('Error: This account is already connected to a DIFFERENT user.');
                        }
                    }
                    return; // Stop processing
                }

                // 1. Check for PKCE Code (Server-side flow)
                const code = searchParams.get('code');

                let finalToken: string | null = null;
                let finalRefreshToken: string | null = null;

                console.log(`[AuthCallback] Provider: ${provider}`);
                console.log('[AuthCallback] Full URL:', window.location.href);

                if (code) {
                    console.log('[AuthCallback] Found PKCE code. Exchanging...');
                    setStatus('Exchanging code for token...');

                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                    if (error) {
                        console.error('[AuthCallback] Code exchange failed:', error);
                        setStatus('Error: Code exchange failed.');
                        return;
                    }

                    if (data?.session) {
                        console.log('[AuthCallback] Code exchange success.');
                        // The session should now contain the provider_token for the *just connected* account.
                        finalToken = data.session.provider_token || null;
                        finalRefreshToken = data.session.provider_refresh_token || null;
                    }
                } else {
                    // 2. Check for Implicit Hash (Client-side flow)
                    const hash = window.location.hash.substring(1);
                    const hashParams = new URLSearchParams(hash);
                    const hashToken = hashParams.get('provider_token');

                    if (hashToken) {
                        console.log('[AuthCallback] Found token in hash.');
                        finalToken = hashToken;
                        finalRefreshToken = hashParams.get('provider_refresh_token') || null;
                    }
                }

                // 3. Last Resort: Check active session (careful!)
                if (!finalToken) {
                    const { data: { session } } = await supabase.auth.getSession();
                    // Only use if we are SURE it's not stale.
                    if (session?.provider_token) {
                        console.warn('[AuthCallback] Falling back to existing session token. Warning: Might be stale or wrong provider.');
                        finalToken = session.provider_token;
                        finalRefreshToken = session.provider_refresh_token || null;
                    }
                }

                if (finalToken) {
                    // Refresh session to get user ID if needed
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        setStatus('Error: No active session.');
                        return;
                    }

                    setStatus(`Linking ${provider} account...`);
                    const success = await saveToken(session.user.id, provider, finalToken, finalRefreshToken);

                    if (success) {
                        setStatus('Success! Redirecting...');
                        setTimeout(() => router.push('/settings'), 1000);
                    } else {
                        setStatus(`Connection failed: Invalid ${provider} token or email verification failed.`);
                        setTimeout(() => router.push('/settings'), 3000);
                    }
                } else {
                    console.error('[AuthCallback] No token found via Code, Hash, or Session.');
                    setStatus('Error: Could not retrieve connection token.');
                    // setTimeout(() => router.push('/settings'), 3000);
                }

            } catch (error) {
                console.error('[AuthCallback] Error:', error);
                setStatus('Error connecting account.');
                setTimeout(() => router.push('/settings'), 3000);
            }
        };

        handleCallback();
    }, [searchParams]);

    const saveToken = async (userId: string, provider: string, accessToken: string, refreshToken?: string | null): Promise<boolean> => {
        try {
            let providerEmail = null;
            console.log(`[AuthCallback] Verifying ${provider} token...`);

            if (provider === 'google') {
                const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    providerEmail = user.email;
                    console.log('[AuthCallback] Verified Google Email:', providerEmail);
                } else {
                    console.warn('[AuthCallback] Google Verify Failed:', res.status, res.statusText);
                }
            } else if (provider === 'azure') {
                const res = await fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    providerEmail = user.mail || user.userPrincipalName;
                    console.log('[AuthCallback] Verified Azure Email:', providerEmail);
                } else {
                    console.warn('[AuthCallback] Azure Verify Failed:', res.status, res.statusText);
                }
            }

            if (providerEmail) {
                await supabase.from('profiles').upsert({ id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

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

                if (error) {
                    console.error('[AuthCallback] DB Upsert Error:', error);
                    return false;
                }

                console.log('[AuthCallback] Token saved successfully.');
                return true;
            } else {
                console.error('[AuthCallback] Could not verify email (Invalid Token?). Not saving.');
                return false;
            }

        } catch (e) {
            console.error('[AuthCallback] Save error:', e);
            return false;
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-lg font-medium text-gray-900">{status}</h2>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
