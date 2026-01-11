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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email } = await req.json()

        if (!email) {
            throw new Error("Email is required")
        }

        const origin = req.headers.get('origin') || 'http://localhost:3000'

        // 1. Check Rate Limit in user_tokens
        const { data: userToken, error: fetchError } = await supabaseAdmin
            .from('user_tokens')
            .select('resend_count, last_resend_at, user_id')
            .eq('email', email)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        let currentCount = userToken?.resend_count || 0;
        const lastResend = userToken?.last_resend_at ? new Date(userToken.last_resend_at) : null;
        const now = new Date();

        // Reset count if it's a new day
        if (lastResend && lastResend.getDate() !== now.getDate()) {
            currentCount = 0;
        }

        if (currentCount >= 3) {
            return new Response(
                JSON.stringify({ error: "Limit pengiriman ulang harian (3x) telah tercapai." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // 2. Resend Invitation
        // We use inviteUserByEmail again. If user exists and is invited, it resends the link.
        // Redirect to origin/root to avoid hash conflicts. App.tsx handles routing.
        const { data: user, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${origin}/`
        })

        if (inviteError) throw inviteError

        // 3. Update Rate Limit Tracking
        const { error: updateError } = await supabaseAdmin
            .from('user_tokens')
            .update({
                resend_count: currentCount + 1,
                last_resend_at: now.toISOString()
            })
            .eq('email', email)

        if (updateError) {
            console.error("Failed to update resend tracking:", updateError)
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: "Undangan berhasil dikirim ulang.",
                remaining: 3 - (currentCount + 1)
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            },
        )
    } catch (error) {
        console.error("Function Error:", error)
        return new Response(
            JSON.stringify({ error: error.message || "Unknown error occurred" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
