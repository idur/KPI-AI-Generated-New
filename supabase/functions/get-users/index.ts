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

        const mergedUsers = authUsers.map(u => {
            const tokenData = tokenMap.get(u.id) || {};
            
            // Determine status
            let status = 'invited';
            if (u.last_sign_in_at || u.email_confirmed_at) {
                status = 'active';
            }

            return {
                id: tokenData.id || 'temp-' + u.id, // Fallback ID if missing in public table
                user_id: u.id,
                email: u.email, // Always use Auth email
                role: tokenData.role || 'user',
                freeTokens: tokenData.free_tokens || 0, // Default to 0 if missing
                paidTokens: tokenData.paid_tokens || 0,
                lastResetDate: tokenData.last_reset_date,
                resendCount: tokenData.resend_count || 0,
                lastResendAt: tokenData.last_resend_at,
                status: status, // Calculated status
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
