
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-Mayar-Signature",
      },
    });
  }

  try {
    const rawBody = await req.text(); // Read raw body for signature verification
    const payload = JSON.parse(rawBody);
    console.log("[Mayar Webhook] Received payload:", JSON.stringify(payload));

    // 2. Verify Secret
    const webhookSecret = Deno.env.get("MAYAR_WEBHOOK_SECRET");
    const signature = req.headers.get("X-Mayar-Signature");

    if (webhookSecret && signature) {
        // Mayar signature is HMAC-SHA256 of the raw body
        const encoder = new TextEncoder();
        const keyData = encoder.encode(webhookSecret);
        const bodyData = encoder.encode(rawBody);

        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBuffer = await crypto.subtle.sign("HMAC", key, bodyData);
        
        // Convert buffer to hex string
        const computedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        if (computedSignature !== signature) {
            console.error(`[Mayar Webhook] Invalid Signature. Computed: ${computedSignature}, Received: ${signature}`);
            return new Response(JSON.stringify({ message: "Invalid Signature" }), { status: 401 });
        }
        console.log("[Mayar Webhook] Signature verified successfully.");
    } else if (webhookSecret) {
        console.warn("[Mayar Webhook] Secret is set but X-Mayar-Signature is missing.");
    }

    // 2. Handle 'testing' event
    // Mayar testing payload structure is { event: "testing", data: { ... } }
    if (payload.event === "testing") {
        console.log("[Mayar Webhook] Testing event received and acknowledged.");
        // Return immediately without processing further logic
        return new Response(JSON.stringify({ message: "Test event received" }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 3. Parse Event
    const data = payload.data || payload; 
    const { id, status, amount, customer, custom_field_1, email, customerEmail } = data;

    // Normalize Status
    // Mayar sends "PAID", "SETTLED", or sometimes "SUCCESS" for tests
    const validStatuses = ["PAID", "SETTLED", "SUCCESS"];
    if (!validStatuses.includes(status)) {
      console.log(`[Mayar Webhook] Ignoring status: ${status}`);
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    // 4. Identify User
    // We sent user_id in 'custom_field_1' or we can match by email
    const targetEmail = customer?.email || email || customerEmail;
    
    // Check custom fields array if present (Mayar structure)
    let targetUserId = custom_field_1; 
    if (!targetUserId && data.custom_field && Array.isArray(data.custom_field)) {
        // Try to find a field that might contain the User ID if we mapped it differently
        // But for now, let's rely on email primarily if custom_field_1 is empty
    }

    if (!targetEmail && !targetUserId) {
      console.error("[Mayar Webhook] Missing identifier (email or user_id)");
      // Don't throw error to Mayar, just return 400 so they know something is wrong but don't retry infinitely if it's bad data
      return new Response(JSON.stringify({ message: "Could not identify user from payload" }), { status: 400 });
    }

    // 5. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let userId = targetUserId;

    // If we only have email, find the user
    if (!userId && targetEmail) {
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      // Note: listUsers is paginated, for production use generic search or ensure exact match strategy
      // For now, simpler: check user_tokens table if we have email there?
      // Or just rely on email matching in auth.
      
      // Optimization: Let's assume custom_field_1 is populated correctly as we set it in frontend.
      // If not, we might need to search.
      console.log(`[Mayar Webhook] Searching user by email: ${targetEmail}`);
      // This is expensive/limited in Edge Functions without direct DB access to auth schema.
      // Better to rely on public.user_tokens if email is synced.
      
      const { data: tokenUser } = await supabaseAdmin
        .from('user_tokens')
        .select('user_id')
        .eq('email', targetEmail)
        .single();
        
      if (tokenUser) {
        userId = tokenUser.user_id;
      }
    }

    if (!userId) {
      console.error("[Mayar Webhook] User not found for email:", targetEmail);
      return new Response(JSON.stringify({ message: "User not found" }), { status: 400 });
    }

    console.log(`[Mayar Webhook] Processing payment for UserID: ${userId}`);

    // 6. Log Transaction
    const { error: logError } = await supabaseAdmin
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: amount, // Log the IDR amount or convert to tokens? 
        // Usually we log the monetary value or the credit value. 
        // Since we use Mayar Balance, this is just an audit log of the top-up event.
        type: 'PURCHASE',
        description: `Mayar TopUp: ${id} - Rp ${amount}`,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error("[Mayar Webhook] Failed to log transaction:", logError);
    }

    // 7. (Optional) Force Refresh Token State
    // We can't push to client, but we can update a 'last_updated' timestamp in DB to force SWR revalidation if we had one.
    
    return new Response(JSON.stringify({ message: "Webhook processed successfully" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Mayar Webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
