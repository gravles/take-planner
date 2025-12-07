import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { useIntegrationToken } from './useIntegrationToken';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const { token: msToken } = useIntegrationToken('azure');

    useEffect(() => {
        fetchCategories();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('categories-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'categories' },
                (payload) => {
                    fetchCategories();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchCategories() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('user_id', session.user.id)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }

    async function addCategory(name: string, color: string, source: 'supabase' | 'microsoft_todo' = 'supabase') {
        try {
            let externalId = null;

            // Handle Microsoft To Do creation
            if (source === 'microsoft_todo' && msToken) {
                const response = await fetch(
                    'https://graph.microsoft.com/v1.0/me/todo/lists',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${msToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            displayName: name
                        })
                    }
                );

                if (response.ok) {
                    const msList = await response.json();
                    externalId = msList.id;
                }
            }

            const { data, error } = await supabase
                .from('categories')
                .insert([{ name, color, source, external_id: externalId }])
                .select()
                .single();

            if (error) throw error;
            setCategories(prev => [...prev, data]);
            return data;
        } catch (error) {
            console.error('Error adding category:', error);
            return null;
        }
    }

    async function updateCategory(id: string, updates: Partial<Category>) {
        try {
            // Handle Microsoft To Do updates
            const category = categories.find(c => c.id === id);
            if (category?.source === 'microsoft_todo' && category.external_id && msToken) {
                if (updates.name) {
                    await fetch(
                        `https://graph.microsoft.com/v1.0/me/todo/lists/${category.external_id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                Authorization: `Bearer ${msToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                displayName: updates.name
                            })
                        }
                    );
                }
            }

            const { data, error } = await supabase
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setCategories(prev => prev.map(c => c.id === id ? data : c));
            return data;
        } catch (error) {
            console.error('Error updating category:', error);
            return null;
        }
    }

    async function deleteCategory(id: string) {
        try {
            // Handle Microsoft To Do deletion
            const category = categories.find(c => c.id === id);
            // Note: Deleting a list in MS To Do deletes all tasks in it. Be careful.
            // But user asked for sync.
            if (category?.source === 'microsoft_todo' && category.external_id && msToken) {
                // MS Graph doesn't always allow deleting the default list, but we can try.
                await fetch(
                    `https://graph.microsoft.com/v1.0/me/todo/lists/${category.external_id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${msToken}`,
                        }
                    }
                );
            }

            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCategories(prev => prev.filter(c => c.id !== id));
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            return false;
        }
    }

    async function updateCategoryOrder(orderedCategories: Category[]) {
        try {
            const updates = orderedCategories.map((cat, index) => ({
                id: cat.id,
                sort_order: index * 1000, // Spaced out for easier insertions
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('categories')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;

            // Optimistic update
            setCategories(orderedCategories);
        } catch (error) {
            console.error('Error updating category order:', error);
        }
    }

    return {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        updateCategoryOrder,
        refreshCategories: fetchCategories
    };
}
