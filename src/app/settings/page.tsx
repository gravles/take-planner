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
            console.error('Error loading integrations:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDisconnect(provider: 'google' | 'azure') {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Delete from user_integrations
            const { error } = await supabase
                .from('user_integrations')
                .delete()
                .eq('user_id', session.user.id)
                .eq('provider', provider);

            if (error) throw error;

            // Update local state
            setConnectedProviders(prev => prev.filter(p => p !== provider));
            setMessage({ type: 'success', text: `Disconnected ${provider === 'google' ? 'Google' : 'Microsoft'} account.` });

            // Refresh profile to ensure everything is synced
            fetchIntegrations(session.user.id);
        } catch (error: any) {
            console.error('Error disconnecting:', error);
            setMessage({ type: 'error', text: 'Error disconnecting: ' + error.message });
        } finally {
            setLoading(false);
        }
    }

    async function handleConnect(provider: 'google' | 'azure') {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            // If we are logged in, we use linkIdentity to attach the new account to the CURRENT user.
            // If we use signInWithOAuth, it replaces the session (logs out current user).
            if (session) {
                const { data, error } = await supabase.auth.linkIdentity({
                    provider: provider,
                    options: {
                        redirectTo: `${window.location.origin}/settings?connected_provider=${provider}`,
                        scopes: provider === 'azure' ? 'openid profile email User.Read Tasks.ReadWrite offline_access' : 'https://www.googleapis.com/auth/calendar.events.readonly'
                    }
                });
                if (error) throw error;
            } else {
                // Not logged in, standard sign in
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: provider,
                    options: {
                        redirectTo: `${window.location.origin}/settings?connected_provider=${provider}`,
                        scopes: provider === 'azure' ? 'openid profile email User.Read Tasks.ReadWrite offline_access' : 'https://www.googleapis.com/auth/calendar.events.readonly'
                    }
                });
                if (error) throw error;
            }
        } catch (error: any) {
            console.error('Error connecting account:', error);
            setMessage({ type: 'error', text: 'Error connecting account: ' + error.message });
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const isGoogleConnected = connectedProviders.includes('google');
    const isAzureConnected = connectedProviders.includes('azure');

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                </div>

                {/* Profile Section */}
                <ProfileSettings />

                {/* Integrations Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage your connected accounts</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Google Calendar */}
                        <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                                        <span className="text-xl">📅</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Google Calendar</h3>
                                        <p className="text-xs text-gray-500">Sync your events</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleConnect('google')}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    {googleTokens.length > 0 ? 'Connect Another Account' : 'Connect'}
                                </button>
                            </div>

                            {/* Connected Accounts List */}
                            {googleTokens.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    {googleTokens.map((t, idx) => (
                                        <div key={idx} className="flex items-center justify-between pl-14 pr-2">
                                            <span className="text-sm text-gray-600 font-mono bg-gray-200/50 px-2 py-0.5 rounded">
                                                {t.account_email}
                                            </span>
                                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                Connected
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Microsoft To Do */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                                    <span className="text-xl">✅</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Microsoft To Do</h3>
                                    <p className="text-xs text-gray-500">Sync your tasks</p>
                                </div>
                            </div>
                            {azureTokens.length > 0 ? (
                                <div className="flex flex-col items-end gap-1">
                                    {azureTokens.map((t, idx) => (
                                        <span key={idx} className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
                                            {t.account_email || 'Connected'}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect('azure')}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    Connect
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
