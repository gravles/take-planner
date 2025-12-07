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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

    useEffect(() => {
        // Handle session check with onAuthStateChange to catch redirect updates
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                // Check connected providers
                if (session.user.identities) {
                    const providers = session.user.identities.map((id: any) => id.provider);
                    setConnectedProviders(providers);
                }

                // Fetch profile
                fetchProfile(session.user.id);
            } else {
                // Only redirect if we are sure there is no session and no hash processing happening
                // But for now, let's just show loading or redirect after a timeout
                // router.push('/'); 
                // Better: let the user manually go back if needed, or redirect after delay
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function fetchProfile(userId: string) {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setUsername(data.username || '');
            } else {
                // Fallback to auth metadata
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setFullName(session.user.user_metadata.full_name || '');
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function updateProfile() {
        try {
            setSaving(true);
            setMessage(null);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            const updates = {
                id: session.user.id,
                full_name: fullName,
                username: username,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error updating profile: ' + error.message });
        } finally {
            setSaving(false);
        }
    }

    async function handleConnect(provider: 'google' | 'azure') {
        try {
            const { data, error } = await supabase.auth.linkIdentity({
                provider: provider,
                options: {
                    // Use origin (home) to ensure it matches the allowed redirect URLs in Supabase
                    // Redirecting to /settings might fail if not explicitly allowed
                    redirectTo: window.location.origin,
                    // User.Read is required for Supabase to fetch the user's email/profile
                    scopes: provider === 'azure' ? 'User.Read Tasks.ReadWrite offline_access' : 'https://www.googleapis.com/auth/calendar.events.readonly'
                }
            });

            if (error) throw error;
            // The user will be redirected
        } catch (error: any) {
            console.error('Error linking identity:', error);
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-500" />
                            Profile Information
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                placeholder="Your Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                placeholder="username"
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                onClick={updateProfile}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                {/* Integrations Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage your connected accounts</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Google Calendar */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                                    <span className="text-xl">📅</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Google Calendar</h3>
                                    <p className="text-xs text-gray-500">Sync your events</p>
                                </div>
                            </div>
                            {isGoogleConnected ? (
                                <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
                                    Connected
                                </span>
                            ) : (
                                <button
                                    onClick={() => handleConnect('google')}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    Connect
                                </button>
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
                            {isAzureConnected ? (
                                <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
                                    Connected
                                </span>
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
