import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export interface TokenState {
    freeTokens: number;
    paidTokens: number;
    lastResetDate: string; // YYYY-MM-DD
    role?: 'admin' | 'user';
    email?: string;
    status?: 'invited' | 'active';
    mayarBalance?: number;
    mayarSpentTokens?: number;
    mayarCustomerId?: string;
    mayarAvailableTokens?: number;
    legacyPaidTokens?: number;
}

const STORAGE_KEY = 'kpi_app_tokens';

// Mayar Configuration (Replace with actual IDs)
export const MAYAR_CONFIG = {
    productId: "ff8836aa-711c-4481-aa36-e2fccc210c3a",
    paymentUrl: "https://betterandco.myr.id/pl/librarykpi",
    membershipTierId: "" 
};

// Fallback to localStorage for offline/unauthenticated state
const getLocalTokenState = (): TokenState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { freeTokens: 10, paidTokens: 0, lastResetDate: new Date().toISOString().split('T')[0], role: 'user', mayarBalance: 0, mayarSpentTokens: 0 };
    try {
        return JSON.parse(stored);
    } catch {
        return { freeTokens: 10, paidTokens: 0, lastResetDate: new Date().toISOString().split('T')[0], role: 'user', mayarBalance: 0, mayarSpentTokens: 0 };
    }
};

const saveLocalTokenState = (state: TokenState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('tokens-updated'));
};

// Sync Balance with Mayar
export const syncMayarBalance = async (userId: string): Promise<number | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('mayar-balance', {
            body: {
                productId: MAYAR_CONFIG.productId,
                membershipTierId: MAYAR_CONFIG.membershipTierId || undefined
            }
        });

        if (error) {
            console.warn('[Mayar] Failed to sync balance:', error, data);
            return null;
        }

        if (data && data.error) {
            const stage = (data.error as any)?.stage;
            const status = (data.error as any)?.status;
            const message = (data.error as any)?.message;
            console.warn('[Mayar] Balance endpoint returned error:', { stage, status, message, raw: (data.error as any)?.raw });
            return null;
        }

        if (data && typeof data.customerBalance === 'number') {
            console.log('[Mayar] Balance synced (credit):', data.customerBalance);
            return data.customerBalance;
        }

        console.warn('[Mayar] Unexpected balance response shape:', data);
        
        return null;
    } catch (err) {
        console.error('[Mayar] Sync error:', err);
        return null;
    }
};

// Cloud-based token state management
export const getTokenState = async (): Promise<TokenState> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Fallback to localStorage if not authenticated
        return getLocalTokenState();
    }

    const dbResult = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const { data, error } = dbResult;

    const shouldSyncMayar = Boolean(data?.mayar_customer_id);
    const mayarBalance = shouldSyncMayar ? await syncMayarBalance(user.id) : null;

    console.log('[DEBUG] TokenState Fetch:', { userId: user.id, data, error, mayarBalance, shouldSyncMayar });

    // Calculate effective paid tokens
    // Mayar `customerBalance` is treated as CREDIT count (same unit as our Paid Tokens)
    const mayarBalanceCredits = mayarBalance !== null
        ? mayarBalance
        : (typeof (data as any)?.mayar_last_balance === 'number' ? (data as any).mayar_last_balance : 0);
    const totalMayarTokens = Math.max(0, Math.floor(mayarBalanceCredits));
    const spentMayarTokens = data?.mayar_spent_tokens || 0;
    
    // Effective available tokens from Mayar
    const effectiveMayarTokens = Math.max(0, totalMayarTokens - spentMayarTokens);

    if (error || !data) {
        // If no record exists, create one
        const newState: TokenState = {
            freeTokens: 10,
            paidTokens: effectiveMayarTokens, 
            lastResetDate: new Date().toISOString().split('T')[0],
            role: 'user' as const,
            email: user.email,
            mayarBalance: mayarBalanceCredits,
            mayarSpentTokens: 0
        };

        await supabase.from('user_tokens').insert({
            user_id: user.id,
            free_tokens: newState.freeTokens,
            paid_tokens: 0, 
            last_reset_date: newState.lastResetDate,
            role: 'user', 
            email: user.email,
            mayar_spent_tokens: 0,
            mayar_last_balance: 0
        });

        if (totalMayarTokens > 0) {
            try {
                await logTransactionOnce(
                    totalMayarTokens,
                    'PURCHASE',
                    `Mayar TopUp (sync): +${totalMayarTokens} Credit (balance 0→${totalMayarTokens})`
                );

                await supabase
                    .from('user_tokens')
                    .update({ mayar_last_balance: totalMayarTokens })
                    .eq('user_id', user.id);
            } catch (e) {
                console.warn('[TokenService] Failed to sync initial Mayar purchase history:', e);
            }
        }
        return newState;
    }

    // Self-healing: Update email
    if (user.email && (!data.email || data.email !== user.email)) {
        await supabase.from('user_tokens').update({ email: user.email }).eq('user_id', user.id);
        data.email = user.email; 
    }

    const lastMayarBalance = typeof data.mayar_last_balance === 'number' ? data.mayar_last_balance : 0;

    if (totalMayarTokens !== lastMayarBalance) {
        try {
            if (totalMayarTokens > lastMayarBalance) {
                const delta = totalMayarTokens - lastMayarBalance;

                await logTransactionOnce(
                    delta,
                    'PURCHASE',
                    `Mayar TopUp (sync): +${delta} Credit (balance ${lastMayarBalance}→${totalMayarTokens})`
                );
            }

            await supabase
                .from('user_tokens')
                .update({ mayar_last_balance: totalMayarTokens })
                .eq('user_id', user.id);

            data.mayar_last_balance = totalMayarTokens;
        } catch (e) {
            console.warn('[TokenService] Failed to sync Mayar purchase history:', e);
        }
    }
    
    return {
        freeTokens: data.free_tokens,
        paidTokens: data.paid_tokens + effectiveMayarTokens, // Sum DB paid (legacy) + Mayar available
        lastResetDate: data.last_reset_date,
        role: data.role || 'user',
        email: data.email,
        status: data.status || 'active',
            mayarBalance: mayarBalanceCredits,
        mayarSpentTokens: spentMayarTokens
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

    // We only save:
    // 1. free_tokens
    // 2. paid_tokens (ONLY the legacy/manual portion, NOT the calculated total!)
    // 3. mayar_spent_tokens
    
    // To get the "legacy" paid tokens, we need to subtract the Mayar portion from state.paidTokens?
    // This is tricky because state.paidTokens is the SUM.
    // However, when we modify state in deductTokens, we should know where we deducted from.
    // To simplify, let's re-fetch the current state to know the components? No, that's race-condition prone.
    
    // BETTER: The logic in deductTokens should calculate new values for each component and pass them.
    // But `saveTokenState` interface takes `TokenState`.
    // Let's assume `state.paidTokens` passed here MIGHT include Mayar tokens if we are not careful.
    // BUT, we should change `saveTokenState` to NOT trust `state.paidTokens` blindly if it's a mix.
    
    // Actually, `deductTokens` is the main mutator.
    // If we update `deductTokens` to call `update` directly instead of `saveTokenState`, it's safer.
    // But let's stick to the pattern.
    
    // We will update `deductTokens` to properly manage `mayarSpentTokens` in the state object it passes.
    // And here we need to reverse-engineer or just accept that `paidTokens` in DB should be updated?
    
    // WAIT! If `state.paidTokens` (Total) = DB_Paid + (TotalMayar - SpentMayar)
    // Then DB_Paid = Total - (TotalMayar - SpentMayar).
    // We can calculate DB_Paid if we know TotalMayar.
    // But `state` doesn't have TotalMayar directly (it has balance).
    
    const totalMayarTokens = Math.max(0, Math.floor(state.mayarBalance || 0));
    const effectiveMayarTokens = Math.max(0, totalMayarTokens - (state.mayarSpentTokens || 0));
    
    // The "Legacy Paid" part is the remainder
    const legacyPaidTokens = Math.max(0, state.paidTokens - effectiveMayarTokens);

    const { error, count } = await supabase
        .from('user_tokens')
        .update({
            free_tokens: state.freeTokens,
            paid_tokens: legacyPaidTokens, // Save only the legacy part
            last_reset_date: state.lastResetDate,
            mayar_spent_tokens: state.mayarSpentTokens // Save the spent counter
        })
        .eq('user_id', user.id)
        .select(); 

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

const logTransactionOnce = async (amount: number, type: 'DAILY_RESET' | 'PURCHASE' | 'SPEND', description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data: existing, error: existingError } = await supabase
            .from('token_transactions')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', type)
            .eq('description', description)
            .limit(1);

        if (!existingError && existing && existing.length > 0) return;

        await supabase.from('token_transactions').insert({
            user_id: user.id,
            amount,
            type,
            description,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn('[TokenService] Failed to log transaction once:', error);
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

// This function is deprecated for RECURRING resets, but kept for fetching state consistent naming in App.tsx
// It now only ensures the token state exists.
export const checkDailyReset = async (): Promise<TokenState> => {
    return await getTokenState();
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

    let newMayarSpent = state.mayarSpentTokens || 0;

    // Deduct remaining from Paid
    if (remainingCost > 0) {
        // We are reducing the Total Paid count (newPaid)
        // But we also need to track if we are consuming Mayar tokens
        // to update mayarSpentTokens counter for persistence.
        
        const totalMayarTokens = Math.max(0, Math.floor(state.mayarBalance || 0));
        const effectiveMayarTokens = Math.max(0, totalMayarTokens - newMayarSpent);
        
        // Prioritize consuming Mayar tokens (as they are 'credit')
        const consumeFromMayar = Math.min(remainingCost, effectiveMayarTokens);
        
        if (consumeFromMayar > 0) {
            newMayarSpent += consumeFromMayar;
            // remainingCost for Legacy is remainingCost - consumeFromMayar
            // But newPaid (Total) simply decreases by total remainingCost
        }
        
        newPaid -= remainingCost;
    }

    console.log('[TokenService] New state calculated - Free:', newFree, 'Paid:', newPaid, 'MayarSpent:', newMayarSpent);

    await saveTokenState({
        ...state,
        freeTokens: newFree,
        paidTokens: newPaid,
        mayarSpentTokens: newMayarSpent
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

        const onVisibility = () => {
            if (document.visibilityState === 'visible') refresh();
        };

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', onVisibility);

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            refresh();
        });

        return () => {
            window.removeEventListener('storage', refresh);
            window.removeEventListener('tokens-updated', refresh);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', onVisibility);
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
