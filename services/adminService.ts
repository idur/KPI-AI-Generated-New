import { supabase } from './supabaseClient';
// Note: Emails are synced on user login via tokenServiceCloud. 
// Ideally, a database trigger or batch job handles full sync.
import { TokenState } from './tokenServiceCloud';

export interface UserData extends TokenState {
    id: string; // The primary key of user_tokens table
    user_id: string; // The auth.users id
    resendCount?: number;
    lastResendAt?: string;
}

export const getAllUsers = async (): Promise<UserData[]> => {
    try {
        // Use the new secure Admin API to fetch users
        const { data, error } = await supabase.functions.invoke('get-users');
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Failed to fetch users via Admin API:", e);
        throw e;
    }
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

export const resendInvite = async (email: string) => {
    const { data, error } = await supabase.functions.invoke('resend-invite', {
        body: { email }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    
    return data;
};

export const deleteUser = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    
    return data;
};
