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
                // Debug logging
                console.log('[AuthCallback] Full URL:', window.location.href);
                console.log('[AuthCallback] Hash:', window.location.hash);

                // Get the hash params manually
                const hash = window.location.hash.substring(1);
                const hashParams = new URLSearchParams(hash);

                const providerToken = hashParams.get('provider_token');
                const providerRefreshToken = hashParams.get('provider_refresh_token');

                const provider = searchParams.get('provider') || 'azure';

                console.log('[AuthCallback] Target Provider:', provider);

                // Initialize session
                const { data: { session } } = await supabase.auth.getSession();

                // Effective Token Strategy
                let finalToken = providerToken;
                let finalRefreshToken = providerRefreshToken;

                if (finalToken) {
                    console.log('[AuthCallback] Using token from HASH.');
                } else if (session?.provider_token) {
                    // Fallback to session token?
                    // WE MUST VERIFY IT IS FOR THE CORRECT PROVIDER.
                    console.warn('[AuthCallback] No hash token. Attempting session token fallback.');
                    console.log('[AuthCallback] Session User:', session.user.email);
                    console.log('[AuthCallback] Session Provider Token (first 10):', session.provider_token.substring(0, 10));

                    finalToken = session.provider_token;
                    finalRefreshToken = session.provider_refresh_token || null;
                } else {
                    console.error('[AuthCallback] No token found in Hash OR Session.');
                    setStatus('Error: Could not retrieve connection token.');
                    setTimeout(() => router.push('/settings'), 3000);
                    return;
                }

                if (session && finalToken) {
                    setStatus(`Linking ${provider} account...`);

                    // Verify and Save
                    const success = await saveToken(session.user.id, provider, finalToken, finalRefreshToken);

                    if (success) {
                        setStatus('Success! Redirecting...');
                        setTimeout(() => router.push('/settings'), 1000);
                    } else {
                        setStatus(`Connection failed: Invalid ${provider} token or email verification failed.`);
                        setTimeout(() => router.push('/settings'), 3000);
                    }
                } else if (!session) {
                    setStatus('Error: No active session. Please log in first.');
                    setTimeout(() => router.push('/login'), 3000);
                }

            } catch (error) {
                console.error('[AuthCallback] Error:', error);
                setStatus('Error connecting account.');
                setTimeout(() => router.push('/settings'), 3000);
            }
        };

        handleCallback();
    }, []);

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
