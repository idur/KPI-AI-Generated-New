import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kpi_app_tokens';

interface TokenState {
    freeTokens: number;
    paidTokens: number;
    lastResetDate: string; // YYYY-MM-DD
}

const DEFAULT_STATE: TokenState = {
    freeTokens: 5,
    paidTokens: 0,
    lastResetDate: new Date().toISOString().split('T')[0]
};

export const getTokenState = (): TokenState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;

    try {
        const state = JSON.parse(stored);
        return state;
    } catch {
        return DEFAULT_STATE;
    }
};

export const saveTokenState = (state: TokenState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Dispatch custom event for same-window sync
    window.dispatchEvent(new Event('tokens-updated'));
};

export const checkDailyReset = (): TokenState => {
    const state = getTokenState();
    const today = new Date().toISOString().split('T')[0];

    if (state.lastResetDate !== today) {
        // It's a new day! Reset free tokens to 5.
        // We do NOT touch paid tokens.
        const newState = {
            ...state,
            freeTokens: 5,
            lastResetDate: today
        };
        saveTokenState(newState);
        return newState;
    }

    return state;
};

export const getTotalTokens = (): number => {
    const state = checkDailyReset();
    return state.freeTokens + state.paidTokens;
};

export const deductTokens = (amount: number): boolean => {
    const state = checkDailyReset();
    const total = state.freeTokens + state.paidTokens;

    if (total < amount) return false;

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

    saveTokenState({
        ...state,
        freeTokens: newFree,
        paidTokens: newPaid
    });

    return true;
};

export const addPaidTokens = (amount: number) => {
    const state = getTokenState(); // Don't force reset here, just get current
    const newState = {
        ...state,
        paidTokens: state.paidTokens + amount
    };
    saveTokenState(newState);
    return newState;
};

// React Hook for easy usage
export const useTokens = () => {
    const [tokens, setTokens] = useState<number>(0);
    const [free, setFree] = useState<number>(0);
    const [paid, setPaid] = useState<number>(0);

    const refresh = () => {
        const state = checkDailyReset();
        setTokens(state.freeTokens + state.paidTokens);
        setFree(state.freeTokens);
        setPaid(state.paidTokens);
    };

    useEffect(() => {
        refresh();
        // Listen to storage events (other tabs) AND custom event (same tab)
        window.addEventListener('storage', refresh);
        window.addEventListener('tokens-updated', refresh);
        return () => {
            window.removeEventListener('storage', refresh);
            window.removeEventListener('tokens-updated', refresh);
        };
    }, []);

    return {
        total: tokens,
        free,
        paid,
        refresh,
        buyTokens: (amount: number) => {
            addPaidTokens(amount);
            // refresh is handled by event listener now
        },
        spendTokens: (amount: number) => {
            const success = deductTokens(amount);
            // refresh is handled by event listener now
            return success;
        }
    };
};
