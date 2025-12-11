import { supabase } from './supabaseClient';
import { LibraryEntry } from '../types';

const STORAGE_KEY = 'kpi_library';

// Fallback to localStorage
const getLocalLibrary = (): LibraryEntry[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
};

const saveLocalLibrary = (library: LibraryEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
};

// Cloud-based library management
export const getLibrary = async (): Promise<LibraryEntry[]> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return getLocalLibrary();
    }

    const { data, error } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching library:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        jobTitle: item.job_title,
        kpis: item.kpi_data,
        createdAt: new Date(item.created_at).getTime(),
        updatedAt: new Date(item.created_at).getTime() // Using created_at as we don't have updated_at in DB
    }));
};

export const saveToLibrary = async (entry: LibraryEntry): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Fallback to localStorage
        const library = getLocalLibrary();
        library.push(entry);
        saveLocalLibrary(library);
        return;
    }

    const { error } = await supabase
        .from('user_library')
        .insert({
            user_id: user.id,
            job_title: entry.jobTitle,
            kpi_data: entry.kpis
        });

    if (error) {
        console.error('Error saving to library:', error);
        throw new Error('Failed to save to library');
    }
};

export const deleteFromLibrary = async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Fallback to localStorage
        const library = getLocalLibrary();
        const filtered = library.filter(item => item.id !== id);
        saveLocalLibrary(filtered);
        return;
    }

    const { error } = await supabase
        .from('user_library')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting from library:', error);
        throw new Error('Failed to delete from library');
    }
};

export const updateLibraryItem = async (id: string, kpis: any[]): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Fallback to localStorage
        const library = getLocalLibrary();
        const index = library.findIndex(item => item.id === id);
        if (index !== -1) {
            library[index].kpis = kpis;
            // library[index].updatedAt = Date.now(); // If we tracked this
            saveLocalLibrary(library);
        }
        return;
    }

    const { error } = await supabase
        .from('user_library')
        .update({ kpi_data: kpis })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating library item:', error);
        throw new Error('Failed to update library item');
    }
};
