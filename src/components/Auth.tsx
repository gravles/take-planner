import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function Auth() {
    const [loading, setLoading] = useState(false);

    const handleLogin = async (provider: 'azure' | 'google') => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    scopes: provider === 'azure'
                        ? 'Tasks.ReadWrite User.Read offline_access'
                        : 'https://www.googleapis.com/auth/calendar.events.readonly',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error logging in:', error);
            alert('Error logging in. Please check console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-2">Welcome to Task Planner</h1>
                <p className="text-gray-500 mb-8">Sign in to sync with your Microsoft To Do or Google Calendar.</p>

                <div className="space-y-3">
                    <button
                        onClick={() => handleLogin('azure')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#2F2F2F] text-white p-3 rounded-lg hover:bg-black transition-colors font-medium disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="w-5 h-5" />
                        )}
                        Sign in with Microsoft
                    </button>

                    <button
                        onClick={() => handleLogin('google')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                        )}
                        Sign in with Google
                    </button>
                </div>

                <p className="mt-6 text-xs text-gray-400">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
