import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const mayarApiKey = Deno.env.get('MAYAR_API_KEY') ?? '';
        const mayarProductId = Deno.env.get('MAYAR_PRODUCT_ID') ?? 'ff8836aa-711c-4481-aa36-e2fccc210c3a';
        const mayarMembershipTierId = Deno.env.get('MAYAR_MEMBERSHIP_TIER_ID') ?? '';

        // 1. Fetch all users from auth.users (Source of Truth for Identity)
        const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000 
        })

        if (authError) throw authError

        // 2. Fetch all public token data
        const { data: tokenRecords, error: tokenError } = await supabaseAdmin
            .from('user_tokens')
            .select('*');

        if (tokenError) throw tokenError

        // 3. Merge Data
        // Map: Auth ID -> Token Record
        const tokenMap = new Map();
        tokenRecords.forEach(r => tokenMap.set(r.user_id, r));

        const fetchMayarBalance = async (customerId: string | null, email: string | null): Promise<number | null> => {
            if (!mayarApiKey || !mayarProductId) return null;

            const parseBalance = (json: any): number | null => {
                const raw = json?.customerBalance ?? json?.data?.customerBalance ?? json?.data?.balance ?? json?.balance ?? null;
                if (typeof raw === 'number') return raw;
                if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
                return null;
            };

            const call = async (params: URLSearchParams) => {
                const url = `https://api.mayar.id/credit/v1/credit/customer/balance?${params.toString()}`;
                const resp = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${mayarApiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                const json = await resp.json();
                return { ok: resp.ok, json };
            };

            const base = new URLSearchParams();
            base.append('productId', mayarProductId);
            if (mayarMembershipTierId) base.append('membershipTierId', mayarMembershipTierId);

            const candidates: URLSearchParams[] = [];
            if (customerId) {
                const p1 = new URLSearchParams(base);
                p1.append('customerId', customerId);
                candidates.push(p1);

                const p2 = new URLSearchParams(base);
                p2.append('memberId', customerId);
                candidates.push(p2);
            }

            if (email) {
                const p3 = new URLSearchParams(base);
                p3.append('memberId', email);
                candidates.push(p3);
            }

            for (const params of candidates) {
                try {
                    const { ok, json } = await call(params);
                    if (!ok) continue;
                    const bal = parseBalance(json);
                    if (bal !== null) return bal;
                } catch {
                    continue;
                }
            }

            return null;
        };

        const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> => {
            const results: R[] = new Array(items.length);
            let nextIndex = 0;

            const worker = async () => {
                while (true) {
                    const current = nextIndex;
                    nextIndex += 1;
                    if (current >= items.length) return;
                    results[current] = await fn(items[current], current);
                }
            };

            const workerCount = Math.min(limit, items.length);
            await Promise.all(Array.from({ length: workerCount }, () => worker()));
            return results;
        };

        const mergedUsers = await mapWithConcurrency(authUsers, 10, async (u) => {
            const tokenData = tokenMap.get(u.id) || {};

            let status = 'invited';
            if (u.last_sign_in_at || u.email_confirmed_at) {
                status = 'active';
            }

            const legacyPaid = tokenData.paid_tokens || 0;
            const mayarCustomerId = tokenData.mayar_customer_id || null;
            const spentMayar = tokenData.mayar_spent_tokens || 0;
            const snapshotBalance = tokenData.mayar_last_balance || 0;

            let mayarBalance = 0;
            let mayarAvailableTokens = 0;
            if (mayarCustomerId) {
                const balance = await fetchMayarBalance(mayarCustomerId, u.email ?? null);
                if (typeof balance === 'number') {
                    mayarBalance = Math.max(0, Math.floor(balance));
                    mayarAvailableTokens = Math.max(0, mayarBalance - spentMayar);
                } else {
                    mayarBalance = Math.max(0, Math.floor(snapshotBalance));
                    mayarAvailableTokens = Math.max(0, mayarBalance - spentMayar);
                }
            } else if (snapshotBalance) {
                mayarBalance = Math.max(0, Math.floor(snapshotBalance));
                mayarAvailableTokens = Math.max(0, mayarBalance - spentMayar);
            }

            return {
                id: tokenData.id || 'temp-' + u.id,
                user_id: u.id,
                email: u.email,
                role: tokenData.role || 'user',
                freeTokens: tokenData.free_tokens || 0,
                paidTokens: legacyPaid + mayarAvailableTokens,
                legacyPaidTokens: legacyPaid,
                mayarAvailableTokens,
                mayarCustomerId,
                mayarBalance,
                mayarSpentTokens: spentMayar,
                lastResetDate: tokenData.last_reset_date,
                resendCount: tokenData.resend_count || 0,
                lastResendAt: tokenData.last_resend_at,
                status,
                last_login: u.last_sign_in_at
            };
        });

        // Sort: Admin first, then by email
        mergedUsers.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (b.role === 'admin' && a.role !== 'admin') return 1;
            return (a.email || '').localeCompare(b.email || '');
        });

        return new Response(
            JSON.stringify(mergedUsers),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
