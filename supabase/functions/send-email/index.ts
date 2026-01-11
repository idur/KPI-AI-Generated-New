import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string | string[];
  subject: string;
  type: 'transactional' | 'notification' | 'marketing' | 'custom';
  html?: string; // For custom
  data?: Record<string, any>; // For templates
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }

    const payload: EmailRequest = await req.json();
    const { to, subject, type, html, data } = payload;

    // 1. Prepare Content based on Type
    let finalHtml = html || "";

    if (type !== 'custom' && !html) {
        // Simple Template System
        finalHtml = getTemplate(type, data);
    }

    // 2. Send via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Library KPI <team@librarykpi.com>', // Verified domain
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: finalHtml
      })
    })

    const resData = await res.json();

    if (!res.ok) {
        throw new Error(resData.message || "Failed to send email via Resend");
    }

    // 3. Log to Database
    await supabaseAdmin.from('email_logs').insert({
        recipient: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        template_type: type,
        status: 'sent',
        metadata: resData
    });

    return new Response(
      JSON.stringify(resData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )

  } catch (error) {
    console.error("Email Error:", error);
    
    // Attempt to log failure
    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        // We might not have the payload if JSON parse failed, but let's try
        await supabaseAdmin.from('email_logs').insert({
            recipient: "unknown", 
            subject: "error",
            template_type: "error",
            status: 'failed',
            error_message: error.message
        });
    } catch (e) { /* ignore */ }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

function getTemplate(type: string, data: any = {}) {
    const header = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Library KPI</h1>`;
    const footer = `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">&copy; ${new Date().getFullYear()} Library KPI. All rights reserved.</p>
    </div>`;

    let content = "";

    switch (type) {
        case 'welcome':
            content = `<p>Hi ${data.name || 'there'},</p>
            <p>Welcome to Library KPI! We're excited to have you on board.</p>
            <p>Get started by generating your first KPI library using our AI tools.</p>
            <a href="${data.actionUrl || '#'}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>`;
            break;
        case 'notification':
            content = `<p>${data.message}</p>`;
            break;
        default:
            content = `<p>This is a notification from Library KPI.</p>`;
    }

    return `${header}${content}${footer}`;
}
