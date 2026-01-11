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

        const { userId } = await req.json()

        if (!userId) {
            throw new Error("UserID is required")
        }

        // 1. Delete from auth.users (This is the most critical step)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        
        if (deleteAuthError) {
            throw deleteAuthError
        }

        // 2. Delete from user_tokens (Manual cleanup in case cascade is missing)
        const { error: deleteTokenError } = await supabaseAdmin
            .from('user_tokens')
            .delete()
            .eq('user_id', userId)

        if (deleteTokenError) {
            console.error("Failed to clean up user_tokens:", deleteTokenError)
            // We don't throw here because the main Auth deletion succeeded
        }

        return new Response(
            JSON.stringify({ success: true, message: "User deleted successfully" }),
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
