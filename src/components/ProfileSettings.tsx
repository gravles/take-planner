import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { User, Mail, Save, Loader2 } from 'lucide-react';

export function ProfileSettings() {
    const { profile, loading, updateProfile } = useProfile();
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setUsername(profile.username || '');
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const success = await updateProfile({
                full_name: fullName,
                username: username,
            });

            if (success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Profile Settings
            </h2>

            <div className="flex items-start gap-6 mb-8">
                <div className="shrink-0">
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700">
                            <User className="w-8 h-8 text-slate-400" />
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <form onSubmit={handleSave} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                placeholder="Your Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    placeholder="username"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
