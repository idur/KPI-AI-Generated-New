import { supabase } from './supabaseClient';
// Note: Emails are synced on user login via tokenServiceCloud. 
// Ideally, a database trigger or batch job handles full sync.
import { TokenState } from './tokenServiceCloud';

export interface UserData extends TokenState {
    id: string; // The primary key of user_tokens table
    user_id: string; // The auth.users id
}

export const getAllUsers = async (): Promise<UserData[]> => {
    const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        throw error;
    }

    return data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        email: item.email || 'No Email',
        freeTokens: item.free_tokens,
        paidTokens: item.paid_tokens,
        lastResetDate: item.last_reset_date,
        role: item.role || 'user'
    }));
};

export const updateUserTokens = async (userId: string, freeTokens: number, paidTokens: number) => {
    const { error } = await supabase
        .from('user_tokens')
        .update({ free_tokens: freeTokens, paid_tokens: paidTokens })
        .eq('user_id', userId);

    if (error) throw error;
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    const { error } = await supabase
        .from('user_tokens')
        .update({ role: role })
        .eq('user_id', userId);

    if (error) throw error;
};
