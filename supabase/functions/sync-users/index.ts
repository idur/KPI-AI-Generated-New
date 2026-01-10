// Follow this guide to deploy: https://supabase.com/docs/guides/functions/deploy
// 1. supabase login
// 2. supabase functions new sync-users
// 3. (Paste this code into supabase/functions/sync-users/index.ts)
// 4. supabase functions deploy sync-users --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create a Supabase client with the SERVICE_ROLE_KEY
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log("Starting sync-users...");

        // 1. Fetch all users from auth.users
        // Note: listUsers defaults to 50 users per page. For large apps, pagination is needed.
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000 
        })

        if (authError) throw authError

        console.log(`Found ${users.length} users in auth.users`);

        // 2. Iterate and update public.user_tokens
        let updatedCount = 0;

        for (const user of users) {
            // Determine status based on confirmation
            // If email_confirmed_at is present, they have clicked the link (or were auto-confirmed)
            // If last_sign_in_at is present, they have definitely logged in.
            
            // Logic requested:
            // "jika sudah login, status 'Active'. Jika belum login (waiting confirmation) berarti status 'Invited'"
            
            let status = 'invited';
            if (user.last_sign_in_at) {
                status = 'active';
            } else if (user.email_confirmed_at) {
                // If confirmed but never signed in, arguably 'active' or 'verified'
                // But user requested "login" as the trigger.
                // However, standard flow is: Confirm Email -> Auto Login. 
                // So confirmed usually implies signed in at least once.
                status = 'active';
            }

            // Upsert into user_tokens
            // We only want to update status if it's different, or ensure the record exists.
            // But to keep it simple and robust, we'll upsert key fields.
            
            // Note: We don't want to overwrite token balances if they exist.
            // So we first check if the record exists.
            
            const { data: existingRecord } = await supabaseAdmin
                .from('user_tokens')
                .select('status')
                .eq('user_id', user.id)
                .single();

            if (existingRecord) {
                // Only update if status is different
                if (existingRecord.status !== status) {
                    await supabaseAdmin
                        .from('user_tokens')
                        .update({ status: status, email: user.email }) // Sync email too just in case
                        .eq('user_id', user.id);
                    updatedCount++;
                }
            } else {
                // Create missing record (Edge case handling)
                await supabaseAdmin
                    .from('user_tokens')
                    .insert({
                        user_id: user.id,
                        email: user.email,
                        status: status,
                        role: 'user', // Default
                        free_tokens: 5, // Default
                        paid_tokens: 0,
                        last_reset_date: new Date().toISOString().split('T')[0]
                    });
                updatedCount++;
            }
        }

        return new Response(
            JSON.stringify({ message: `Sync complete. Updated ${updatedCount} users.`, total: users.length }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            },
        )
    } catch (error) {
        console.error("Sync Error:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
