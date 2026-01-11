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

        const { email, fullName, tokens, password } = await req.json()

        if (!email) {
            throw new Error("Email is required")
        }

        const origin = req.headers.get('origin') || 'http://localhost:3000'
        let user: any;
        let isManualCreation = false;

        // 1. Create User
        if (password) {
            // A. Manual Creation with Password (Admin sets password)
            isManualCreation = true;
            console.log(`[DEBUG] Creating user ${email} with provided password...`);
            
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // Auto-confirm email since admin created it
                user_metadata: {
                    full_name: fullName
                }
            });

            if (error) throw error;
            user = data;

            // Send Credentials Email
            // We'll call the send-email function or Resend API here.
            // For reliability, we'll try to invoke the send-email function if available, 
            // or just log that we need to send it.
            // Since we can't easily invoke another function from here without the anon key handy (though we have service key),
            // We will assume the frontend handles the "Success" UI which shows the password to the admin,
            // OR we rely on the Admin to copy it.
            // Requirement says: "Send email notifications for ... temporary password assignment"
            
            // Let's try to send email via Resend API directly if Key exists
            const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_KEY) {
                try {
                     await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${RESEND_KEY}`
                        },
                        body: JSON.stringify({
                            from: 'Library KPI <noreply@librarykpi.com>', // Ensure this matches verified domain
                            to: [email],
                            subject: 'Akun Library KPI Anda Telah Dibuat',
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h1 style="color: #2563eb;">Selamat Datang di Library KPI</h1>
                                    <p>Halo ${fullName || 'User'},</p>
                                    <p>Admin kami telah membuatkan akun untuk Anda.</p>
                                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0; font-weight: bold;">Email: ${email}</p>
                                        <p style="margin: 5px 0 0 0; font-weight: bold;">Password: ${password}</p>
                                    </div>
                                    <p>Silakan login dan segera ganti password Anda di menu Profile.</p>
                                    <a href="${origin}/#/login" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Sekarang</a>
                                </div>
                            `
                        })
                    });
                    console.log("[DEBUG] Credentials email sent via Resend");
                } catch (emailErr) {
                    console.error("[DEBUG] Failed to send credentials email:", emailErr);
                }
            }

        } else {
            // B. Invite Flow (Standard)
            // User MUST click the link in email which will bring them to the app.
            const { data, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                data: {
                    full_name: fullName,
                    invited_at: new Date().toISOString()
                },
                // Redirect to the origin (root) - App.tsx handles the routing based on 'invited' status
                redirectTo: `${origin}/`
            })
            if (createError) throw createError;
            user = data;
        }

        if (!user.user) throw new Error("Failed to create user object")

        // 2. Initialize their token record with custom amount
        // The trigger might have run, so we upsert
        const initialTokens = typeof tokens === 'number' ? tokens : 10;
        const status = isManualCreation ? 'active' : 'invited'; // Active if password set manually

        console.log(`[DEBUG] Upserting tokens for ${user.user.id} / ${email} with amount: ${initialTokens}, status: ${status}`);

        const { error: tokenError } = await supabaseAdmin
            .from('user_tokens')
            .upsert({
                user_id: user.user.id,
                email: email,
                free_tokens: initialTokens,
                role: 'user',
                status: status,
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
