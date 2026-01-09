import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface TokenState {
    freeTokens: number;
    paidTokens: number;
    lastResetDate: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'kpi_app_tokens';

// Fallback to localStorage for offline/unauthenticated state
const getLocalTokenState = (): TokenState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { freeTokens: 10, paidTokens: 0, lastResetDate: new Date().toISOString().split('T')[0] };
    try {
        return JSON.parse(stored);
    } catch {
        return { freeTokens: 10, paidTokens: 0, lastResetDate: new Date().toISOString().split('T')[0] };
    }
};

const saveLocalTokenState = (state: TokenState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('tokens-updated'));
};

// Cloud-based token state management
export const getTokenState = async (): Promise<TokenState> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Fallback to localStorage if not authenticated
        return getLocalTokenState();
    }

    const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error || !data) {
        // If no record exists, create one
        const newState = { freeTokens: 10, paidTokens: 0, lastResetDate: new Date().toISOString().split('T')[0] };
        await supabase.from('user_tokens').insert({
            user_id: user.id,
            free_tokens: newState.freeTokens,
            paid_tokens: newState.paidTokens,
            last_reset_date: newState.lastResetDate
        });
        return newState;
    }

    return {
        freeTokens: data.free_tokens,
        paidTokens: data.paid_tokens,
        lastResetDate: data.last_reset_date
    };
};

export const saveTokenState = async (state: TokenState) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Fallback to localStorage
        saveLocalTokenState(state);
        return;
    }

    console.log('[TokenService] Saving state for user:', user.id, state);

    const { error, count } = await supabase
        .from('user_tokens')
        .update({
            free_tokens: state.freeTokens,
            paid_tokens: state.paidTokens,
            last_reset_date: state.lastResetDate
        })
        .eq('user_id', user.id)
        .select('*', { count: 'exact' }); // Request count and return data

    if (error) {
        console.error('[TokenService] Error saving token state:', error);
        throw error;
    }

    console.log('[TokenService] Update result - Rows affected:', count);

    if (count === 0) {
        console.warn('[TokenService] WARNING: No rows were updated! Check RLS policies or if the user_token record exists.');
    }

    // Dispatch event for UI updates
    window.dispatchEvent(new Event('tokens-updated'));
};

export interface TokenTransaction {
    id: string;
    user_id: string;
    amount: number;
    type: 'DAILY_RESET' | 'PURCHASE' | 'SPEND';
    description: string;
    created_at: string;
}

const logTransaction = async (amount: number, type: 'DAILY_RESET' | 'PURCHASE' | 'SPEND', description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        await supabase.from('token_transactions').insert({
            user_id: user.id,
            amount,
            type,
            description,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn('[TokenService] Failed to log transaction (table might be missing):', error);
    }
};

export const getTokenHistory = async (): Promise<TokenTransaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[TokenService] Error fetching history:', error);
        return [];
    }

    return data || [];
};

export const checkDailyReset = async (): Promise<TokenState> => {
    const state = await getTokenState();
    const today = new Date().toISOString().split('T')[0];

    if (state.lastResetDate !== today) {
        console.log('[TokenService] Daily reset triggered');
        const newState = {
            ...state,
            freeTokens: 10,
            lastResetDate: today
        };
        await saveTokenState(newState);

        // Check if we already logged it to avoid duplicates from race conditions
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { count } = await supabase
                .from('token_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('type', 'DAILY_RESET')
                .gte('created_at', `${today}T00:00:00Z`); // Check for transactions created today (UTC)

            if (count === 0) {
                await logTransaction(10, 'DAILY_RESET', 'Daily free token reset');
            } else {
                console.log('[TokenService] Daily reset log already exists, skipping duplicate.');
            }
        }

        return newState;
    }

    return state;
};

export const getTotalTokens = async (): Promise<number> => {
    const state = await checkDailyReset();
    return state.freeTokens + state.paidTokens;
};

export const deductTokens = async (amount: number, description: string = 'Generated KPIs'): Promise<boolean> => {
    console.log('[TokenService] Attempting to deduct tokens:', amount);
    const state = await checkDailyReset();
    const total = state.freeTokens + state.paidTokens;
    console.log('[TokenService] Current total:', total, 'Free:', state.freeTokens, 'Paid:', state.paidTokens);

    if (total < amount) {
        console.warn('[TokenService] Insufficient tokens');
        return false;
    }

    let remainingCost = amount;
    let newFree = state.freeTokens;
    let newPaid = state.paidTokens;

    // Deduct from Free first
    if (newFree >= remainingCost) {
        newFree -= remainingCost;
        remainingCost = 0;
    } else {
        remainingCost -= newFree;
        newFree = 0;
    }

    // Deduct remaining from Paid
    if (remainingCost > 0) {
        newPaid -= remainingCost;
    }

    console.log('[TokenService] New state calculated - Free:', newFree, 'Paid:', newPaid);

    await saveTokenState({
        ...state,
        freeTokens: newFree,
        paidTokens: newPaid
    });

    await logTransaction(-amount, 'SPEND', description);

    return true;
};

export const addPaidTokens = async (amount: number, description: string = 'Token Purchase') => {
    const state = await getTokenState();
    const newState = {
        ...state,
        paidTokens: state.paidTokens + amount
    };
    await saveTokenState(newState);
    await logTransaction(amount, 'PURCHASE', description);
    return newState;
};

// React Hook for easy usage
export const useTokens = () => {
    const [tokens, setTokens] = useState<number>(0);
    const [free, setFree] = useState<number>(0);
    const [paid, setPaid] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const state = await checkDailyReset();
            setTokens(state.freeTokens + state.paidTokens);
            setFree(state.freeTokens);
            setPaid(state.paidTokens);
        } catch (error) {
            console.error('Error refreshing tokens:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();

        // Listen to storage events (other tabs) AND custom event (same tab)
        window.addEventListener('storage', refresh);
        window.addEventListener('tokens-updated', refresh);

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            refresh();
        });

        return () => {
            window.removeEventListener('storage', refresh);
            window.removeEventListener('tokens-updated', refresh);
            subscription.unsubscribe();
        };
    }, []);

    return {
        total: tokens,
        free,
        paid,
        loading,
        refresh,
        buyTokens: async (amount: number) => {
            await addPaidTokens(amount);
        },
        spendTokens: async (amount: number) => {
            const success = await deductTokens(amount);
            return success;
        }
    };
};
