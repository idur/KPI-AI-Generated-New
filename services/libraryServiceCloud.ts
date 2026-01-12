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
        originalJobTitle: item.original_job_title,
        kpis: item.kpi_data,
        createdAt: new Date(item.created_at).getTime(),
        updatedAt: new Date(item.created_at).getTime() // Using created_at as we don't have updated_at in DB
    }));
};

const logLibraryChange = async (libraryId: string, action: string, oldValue: any, newValue: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('library_logs').insert({
        library_id: libraryId,
        user_id: user.id,
        action,
        old_value: oldValue,
        new_value: newValue
    });
};

export const updateLibraryTitle = async (id: string, newTitle: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // No local fallback for title editing yet

    // 1. Get current item to check if original_job_title is set and get kpi_data
    const { data: current, error: fetchError } = await supabase
        .from('user_library')
        .select('job_title, original_job_title, kpi_data')
        .eq('id', id)
        .single();

    if (fetchError || !current) throw new Error('Item not found');

    const updateData: any = { job_title: newTitle };
    
    // If this is the first edit, save the original title
    if (!current.original_job_title) {
        updateData.original_job_title = current.job_title;
    }

    // Update jobDescription in all KPIs
    if (current.kpi_data && Array.isArray(current.kpi_data)) {
        updateData.kpi_data = current.kpi_data.map((kpi: any) => ({
            ...kpi,
            jobDescription: newTitle
        }));
    }

    const { error } = await supabase
        .from('user_library')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating title:', error);
        throw error;
    }

    // Log it
    await logLibraryChange(id, 'update_title', { title: current.job_title }, { title: newTitle });
};

export const revertLibraryTitle = async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: current, error: fetchError } = await supabase
        .from('user_library')
        .select('job_title, original_job_title, kpi_data')
        .eq('id', id)
        .single();

    if (fetchError || !current || !current.original_job_title) return; // Nothing to revert

    const revertData: any = { job_title: current.original_job_title };

    // Revert jobDescription in all KPIs
    if (current.kpi_data && Array.isArray(current.kpi_data)) {
        revertData.kpi_data = current.kpi_data.map((kpi: any) => ({
            ...kpi,
            jobDescription: current.original_job_title
        }));
    }

    const { error } = await supabase
        .from('user_library')
        .update(revertData)
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;

    await logLibraryChange(id, 'revert_title', { title: current.job_title }, { title: current.original_job_title });
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
            original_job_title: entry.originalJobTitle, // Support explicit original title if provided
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
