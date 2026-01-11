// Follow this guide to deploy: https://supabase.com/docs/guides/functions/deploy
// 1. supabase login
// 2. supabase functions new create-user
// 3. (Paste this code into supabase/functions/create-user/index.ts)
// 4. supabase functions deploy create-user --no-verify-jwt

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
        // This allows us to bypass RLS and create users directly
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, fullName, tokens } = await req.json()

        if (!email) {
            throw new Error("Email is required")
        }

        const origin = req.headers.get('origin') || 'http://localhost:3000'

        // 1. Invite the user (Sends standard Invite Email automatically)
        // User MUST click the link in email which will bring them to the app.
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                invited_at: new Date().toISOString()
            },
            // Redirect to the origin (root) - App.tsx handles the routing based on 'invited' status
            redirectTo: `${origin}/`
        })

        if (createError) throw createError

        if (!user.user) throw new Error("Failed to create user object")

        // 2. Initialize their token record with custom amount
        // The trigger might have run, so we upsert
        const initialTokens = typeof tokens === 'number' ? tokens : 10;

        console.log(`[DEBUG] Upserting tokens for ${user.user.id} / ${email} with amount: ${initialTokens}`);

        const { error: tokenError } = await supabaseAdmin
            .from('user_tokens')
            .upsert({
                user_id: user.user.id,
                email: email,
                free_tokens: initialTokens,
                role: 'user',
                status: 'invited',
                last_reset_date: new Date().toISOString().split('T')[0]
            }, { onConflict: 'user_id' });

        if (tokenError) {
            console.error("Error setting initial tokens:", tokenError)
            // Non-blocking error, user is created
        }

        // Robust verification and override to prevent race conditions
        const { data: verifyRecord, error: verifyError } = await supabaseAdmin
            .from('user_tokens')
            .select('id, free_tokens')
            .eq('user_id', user.user.id)
            .single();

        if (!verifyError && verifyRecord) {
            if (verifyRecord.free_tokens !== initialTokens) {
                console.log(`[DEBUG] Overriding free_tokens from ${verifyRecord.free_tokens} -> ${initialTokens} for ${email}`);
                const { error: forceUpdateError } = await supabaseAdmin
                    .from('user_tokens')
                    .update({ free_tokens: initialTokens })
                    .eq('id', verifyRecord.id);
                if (forceUpdateError) {
                    console.error("[DEBUG] Force update free_tokens failed:", forceUpdateError);
                } else {
                    console.log("[DEBUG] Force update free_tokens succeeded");
                }
            } else {
                console.log("[DEBUG] free_tokens verified as correct:", verifyRecord.free_tokens);
            }
        } else {
            console.warn("[DEBUG] Verification select failed or record missing; attempting insert fallback");
            const { error: insertFallbackError } = await supabaseAdmin
                .from('user_tokens')
                .insert({
                    user_id: user.user.id,
                    email: email,
                    free_tokens: initialTokens,
                    role: 'user',
                    status: 'invited',
                    last_reset_date: new Date().toISOString().split('T')[0]
                });
            if (insertFallbackError) {
                console.error("[DEBUG] Insert fallback failed:", insertFallbackError);
            } else {
                console.log("[DEBUG] Insert fallback succeeded");
            }
        }

        return new Response(
            JSON.stringify(user),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            },
        )
    } catch (error) {
        console.error("Function Error:", error)
        // Return 200 even on error so the client can read the error message in the body
        // instead of getting a generic "non-2xx status code" exception.
        return new Response(
            JSON.stringify({ error: error.message || "Unknown error occurred" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
