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

        // 1. Fetch all users from auth.users
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000 
        })

        if (authError) throw authError

        let updatedCount = 0;
        let rudyDebugInfo = "";

        // 2. Iterate users and build response list
        const enrichedUsers = [];

        for (const user of users) {
            let status = 'invited';
            if (user.last_sign_in_at || user.email_confirmed_at) {
                status = 'active';
            }

            // ... (keep typo handling logic if needed, or simplify if resolved)
            
            // --- SPECIAL TYPO HANDLING FOR RUDY ---
            let potentialTypoEmail = null;
            if (user.email === 'rudyrahadian@gmail.com') {
                status = 'active'; 
                potentialTypoEmail = 'rudyrhadian@gmail.com'; 
            }

            // 3. Fetch records
            let query = `user_id.eq.${user.id},email.eq.${user.email}`;
            if (potentialTypoEmail) {
                query += `,email.eq.${potentialTypoEmail}`;
            }

            // --- FIX: Remove 'or' if only one condition to avoid syntax error ---
            let records = [];
            let fetchError = null;

            if (potentialTypoEmail) {
                 const { data, error } = await supabaseAdmin
                    .from('user_tokens')
                    .select('*')
                    .or(query);
                 records = data;
                 fetchError = error;
            } else {
                 // Standard query: Check user_id OR email
                 const { data, error } = await supabaseAdmin
                    .from('user_tokens')
                    .select('*')
                    .or(`user_id.eq.${user.id},email.eq.${user.email}`);
                 records = data;
                 fetchError = error;
            }

            if (fetchError) {
                console.error(`Error fetching records for ${user.email}:`, fetchError);
                continue;
            }

            let finalRecord = null;

            if (!records || records.length === 0) {
                // Create new
                const { data: newRecord } = await supabaseAdmin.from('user_tokens').insert({
                    user_id: user.id,
                    email: user.email,
                    status: status,
                    role: 'user',
                    free_tokens: 10,
                    paid_tokens: 0,
                    last_reset_date: new Date().toISOString().split('T')[0],
                    // We attempt to save last_login, but if it fails (no column), we ignore
                    // last_login: user.last_sign_in_at 
                }).select().single();
                
                finalRecord = newRecord;
                updatedCount++;
            } else {
                // Merge logic ...
                records.sort((a, b) => {
                    if (a.email === potentialTypoEmail && b.email !== potentialTypoEmail) return -1;
                    if (b.email === potentialTypoEmail && a.email !== potentialTypoEmail) return 1;
                    if (a.user_id === user.id && b.user_id !== user.id) return -1;
                    if (b.user_id === user.id && a.user_id !== user.id) return 1;
                    return b.paid_tokens - a.paid_tokens;
                });

                const master = records[0];
                const duplicates = records.slice(1);
                
                let totalPaid = master.paid_tokens;
                let maxFree = master.free_tokens;
                for (const dup of duplicates) {
                    totalPaid += dup.paid_tokens;
                    maxFree = Math.max(maxFree, dup.free_tokens);
                }

                // Update Master
                // We do NOT attempt to write last_login to DB to avoid error if column missing
                const { data: updatedRecord } = await supabaseAdmin.from('user_tokens').update({
                    status: status,
                    user_id: user.id,
                    email: user.email,
                    paid_tokens: totalPaid,
                    free_tokens: maxFree
                }).eq('id', master.id).select().single();

                finalRecord = updatedRecord;

                // Delete Duplicates
                const duplicateIds = duplicates.map(d => d.id);
                if (duplicateIds.length > 0) {
                    await supabaseAdmin.from('user_tokens').delete().in('id', duplicateIds);
                }

                updatedCount++;
            }

            if (finalRecord) {
                // Enrich with Auth Data before returning to frontend
                const enriched = {
                    ...finalRecord,
                    email: user.email // Ensure email is from Auth
                };
                
                enrichedUsers.push(enriched);
            }
        }

        return new Response(
            JSON.stringify({ 
                message: `Sync OK. Updated ${updatedCount} users.`, 
                updatedCount,
                users: enrichedUsers // Return the list!
            }),
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
