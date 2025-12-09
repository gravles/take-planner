import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Profile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    updated_at: string | null;
}

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                throw error;
            }

            setProfile(data);
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            // Refresh profile data
            await fetchProfile();
            return true;
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setError(error.message);
            return false;
        }
    };

    return {
        profile,
        loading,
        error,
        updateProfile,
        refreshProfile: fetchProfile
    };
}
