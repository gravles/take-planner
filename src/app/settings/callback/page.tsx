'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Verifying connection...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the hash params manually
                const hash = window.location.hash.substring(1);
                const hashParams = new URLSearchParams(hash);

                const providerToken = hashParams.get('provider_token');
                const providerRefreshToken = hashParams.get('provider_refresh_token');
                const accessToken = hashParams.get('access_token'); // Supabase session token (optional usage)

                const provider = searchParams.get('provider') || 'azure'; // Default or passed param

                console.log('[AuthCallback] Processing hash for:', provider);

                if (!providerToken) {
                    console.warn('[AuthCallback] No provider_token found in hash. Session might be used directly if available.');
                    // If no hash, maybe we are already handled by supabase?
                    // We check session just in case, but usually this means failure if we expected a new link.
                }

                const { data: { session } } = await supabase.auth.getSession();

                if (session && providerToken) {
                    setStatus(`Linking ${provider} account...`);

                    // Verify and Save
                    await saveToken(session.user.id, provider, providerToken, providerRefreshToken);

                    setStatus('Success! Redirecting...');
                    setTimeout(() => router.push('/settings'), 1000);
                } else if (!session) {
                    setStatus('Error: No active session. Please log in first.');
                    setTimeout(() => router.push('/login'), 3000);
                } else {
                    // Check if session.provider_token is valid?
                    // If we missed the hash, we might be stuck.
                    setStatus('Finishing setup...');
                    setTimeout(() => router.push('/settings'), 1500);
                }

            } catch (error) {
                console.error('[AuthCallback] Error:', error);
                setStatus('Error connecting account.');
            }
        };

        handleCallback();
    }, []);

    const saveToken = async (userId: string, provider: string, accessToken: string, refreshToken?: string | null) => {
        try {
            let providerEmail = null;

            if (provider === 'google') {
                const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    providerEmail = user.email;
                }
            } else if (provider === 'azure') {
                const res = await fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    providerEmail = user.mail || user.userPrincipalName;
                }
            }

            if (providerEmail) {
                await supabase.from('profiles').upsert({ id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' });

                await supabase
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

                console.log('[AuthCallback] Token saved for:', providerEmail);
            } else {
                console.error('[AuthCallback] Could not verify email. Not saving.');
            }

        } catch (e) {
            console.error('[AuthCallback] Save error:', e);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-lg font-medium text-gray-900">{status}</h2>
        </div>
    );
}
