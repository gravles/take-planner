import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }

    async function addCategory(name: string, color: string) {
        try {
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name, color }])
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

    return {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        refreshCategories: fetchCategories
    };
}
