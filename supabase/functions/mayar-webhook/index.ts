
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-Mayar-Signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  let webhookEventId: string | null = null;
  let supabaseAdmin: any = null;

  try {
    const rawBody = await req.text(); // Read raw body for signature verification
    const payload = JSON.parse(rawBody);
    console.log("[Mayar Webhook] Received payload:", JSON.stringify(payload));

    const eventType = (payload?.event && typeof payload.event === 'object')
        ? payload.event.received
        : (payload['event.received'] || payload.event);

    // 2. Verify Secret
    const webhookSecret = Deno.env.get("MAYAR_WEBHOOK_SECRET");
    const signature = req.headers.get("X-Mayar-Signature");

    const signaturePresent = Boolean(signature);
    let signatureValid: boolean | null = null;

    const externalId = String((payload?.data?.id ?? payload?.data?.transactionId ?? payload?.data?.invoiceId ?? payload?.id ?? '')) || null;
    const initialCustomerId = payload?.data?.customerId || payload?.data?.customer?.id || null;
    const initialCustomerEmail = payload?.data?.customerEmail || payload?.data?.customer?.email || payload?.data?.email || null;

    supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: webhookRow, error: webhookInsertError } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        provider: 'mayar',
        event_type: String(eventType || ''),
        external_id: externalId,
        customer_id: initialCustomerId,
        customer_email: initialCustomerEmail,
        signature_present: signaturePresent,
        signature_valid: null,
        http_status: null,
        error_message: null,
        processed: null,
        result: 'received',
        payload,
        headers: Object.fromEntries(req.headers.entries()),
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (webhookInsertError) {
      console.error('[Mayar Webhook] Failed to insert webhook_events:', webhookInsertError);
    }

    webhookEventId = webhookRow?.id ?? null;

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
            if (webhookEventId) {
              await supabaseAdmin
                .from('webhook_events')
                .update({
                  signature_valid: false,
                  http_status: 401,
                  processed: false,
                  result: 'invalid_signature',
                  error_message: 'Invalid Signature'
                })
                .eq('id', webhookEventId);
            }
            return new Response(JSON.stringify({ message: "Invalid Signature" }), { 
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        signatureValid = true;
        console.log("[Mayar Webhook] Signature verified successfully.");
    } else if (webhookSecret) {
        console.warn("[Mayar Webhook] Secret is set but X-Mayar-Signature is missing.");
        signatureValid = null;
    }

    if (webhookEventId) {
      await supabaseAdmin
        .from('webhook_events')
        .update({ signature_valid: signatureValid })
        .eq('id', webhookEventId);
    }

    // 2. Handle 'testing' event
    // Mayar testing payload structure can be { event: "testing", data: { ... } }
    if (eventType === "testing") {
        console.log("[Mayar Webhook] Testing event received and acknowledged.");
        if (webhookEventId) {
          await supabaseAdmin
            .from('webhook_events')
            .update({ http_status: 200, processed: true, result: 'testing' })
            .eq('id', webhookEventId);
        }
        // Return immediately without processing further logic
        return new Response(JSON.stringify({ message: "Test event received" }), { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // 3. Parse Event
    const data = payload.data || payload;
    const { id, status, amount, credit, customer, custom_field_1, email, customerEmail } = data;

    // Normalize status
    // Docs indicate `data.status` can be boolean; some payloads may send string.
    let isPaid = false;
    if (typeof status === 'boolean') {
        isPaid = status;
    } else if (typeof status === 'string') {
        const normalized = status.toUpperCase();
        isPaid = ['PAID', 'SETTLED', 'SUCCESS', 'PAID_SUCCESS', 'COMPLETED'].includes(normalized);
    }

    if (!isPaid) {
        console.log(`[Mayar Webhook] Ignoring unpaid status: ${String(status)}`);
        if (webhookEventId) {
          await supabaseAdmin
            .from('webhook_events')
            .update({ http_status: 200, processed: true, result: 'unpaid_ignored' })
            .eq('id', webhookEventId);
        }
        return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    // 4. Identify User
    // We sent user_id in 'custom_field_1' or we can match by email
    const targetEmail = customer?.email || data.customerEmail || email || customerEmail || payload?.customerEmail;
    
    // Check custom fields array if present (Mayar structure)
    let targetUserId =
        custom_field_1 ||
        (data as any)?.customField1 ||
        (data as any)?.custom_field1 ||
        (payload as any)?.custom_field_1 ||
        (payload as any)?.customField1 ||
        (payload as any)?.custom_field1 ||
        null;
    if (!targetUserId && data.custom_field && Array.isArray(data.custom_field)) {
        for (const field of data.custom_field) {
            if (!field) continue;
            if (typeof field === 'string') {
                if (!targetUserId && /^[0-9a-fA-F-]{36}$/.test(field)) targetUserId = field;
                continue;
            }
            const key = field.key || field.name || field.label;
            const value = field.value || field.answer || field.data || field.input;
            if (key === 'custom_field_1' && typeof value === 'string' && value.length > 0) {
                targetUserId = value;
                break;
            }
            if (!targetUserId && typeof value === 'string' && /^[0-9a-fA-F-]{36}$/.test(value)) {
                targetUserId = value;
            }
        }
    }

    if (!targetEmail && !targetUserId) {
      console.error("[Mayar Webhook] Missing identifier (email or user_id)");
      // Don't throw error to Mayar, just return 400 so they know something is wrong but don't retry infinitely if it's bad data
      if (webhookEventId) {
        await supabaseAdmin
          .from('webhook_events')
          .update({ http_status: 400, processed: false, result: 'missing_identifier', error_message: 'Missing identifier' })
          .eq('id', webhookEventId);
      }
      return new Response(JSON.stringify({ message: "Could not identify user from payload" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let userId = targetUserId;

    // If we only have email, find the user
    if (!userId && targetEmail) {
      console.log(`[Mayar Webhook] Searching user by email: ${targetEmail}`);
      // Try public.user_tokens first
      const { data: tokenUser } = await supabaseAdmin
        .from('user_tokens')
        .select('user_id')
        .eq('email', targetEmail)
        .single();
      if (tokenUser?.user_id) {
        userId = tokenUser.user_id;
      }
      // Fallback: search auth users (admin)
      if (!userId) {
        const normalizedEmail = String(targetEmail).toLowerCase();
        for (let page = 1; page <= 20 && !userId; page += 1) {
          const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (userError) {
            console.error('[Mayar Webhook] Failed to listUsers:', userError);
            break;
          }
          const list = users?.users || [];
          const match = list.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
          if (match) {
            userId = match.id;
            break;
          }
          if (list.length < 200) break;
        }
      }
    }

    if (!userId) {
      console.error("[Mayar Webhook] User not found for email:", targetEmail);
      if (webhookEventId) {
        await supabaseAdmin
          .from('webhook_events')
          .update({ http_status: 400, processed: false, result: 'user_not_found', error_message: 'User not found' })
          .eq('id', webhookEventId);
      }
      return new Response(JSON.stringify({ message: "User not found" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[Mayar Webhook] Processing payment for UserID: ${userId}`);

    if (webhookEventId) {
      await supabaseAdmin
        .from('webhook_events')
        .update({ user_id: userId })
        .eq('id', webhookEventId);
    }

    // Ensure a token row exists even for first-time purchasers
    if (targetEmail) {
        const { error: ensureError } = await supabaseAdmin
            .from('user_tokens')
            .upsert({
                user_id: userId,
                email: String(targetEmail),
            }, { onConflict: 'user_id' });
        if (ensureError) {
            console.error('[Mayar Webhook] Failed to ensure user_tokens row:', ensureError);
        }
    }

    // Capture Mayar Customer ID (from payload)
    // Mayar Payload structure for customer can be nested in 'customer' object OR flat 'customerId'
    // IMPORTANT: Based on docs and logs, we should look for 'customer.id' OR 'customerId'
    // Also, if the transaction is 'credit.topup', the customer object might be structured differently.
    const mayarCustomerId =
        data.customerId ||
        (data as any).customer_id ||
        (data as any).customerID ||
        (data as any).memberId ||
        (data as any).member_id ||
        (data as any).membershipCustomer?.id ||
        (data as any).membershipCustomer?.userId ||
        customer?.id ||
        payload.customerId ||
        (payload as any).customer_id ||
        null;

    if (mayarCustomerId) {
        console.log(`[Mayar Webhook] Linking Mayar Customer ID: ${mayarCustomerId} to User: ${userId}`);
        const { error: upsertError } = await supabaseAdmin
            .from('user_tokens')
            .upsert({
                user_id: userId,
                email: targetEmail ? String(targetEmail) : null,
                mayar_customer_id: String(mayarCustomerId),
            }, { onConflict: 'user_id' });

        if (upsertError) {
            console.error('[Mayar Webhook] Failed to upsert mayar_customer_id:', upsertError);
        }
    } else {
        console.warn('[Mayar Webhook] No Customer ID found in payload to link.');
    }

    // 6. Log Transaction (idempotent)
    const txId = String(
      id ||
      (data as any).transactionId ||
      (data as any).invoiceId ||
      (payload as any)?.data?.transactionId ||
      (payload as any)?.data?.invoiceId ||
      ''
    );

    const numericAmount = Number(amount);
    const numericCredit = Number(
      credit ??
      (data as any).creditAmount ??
      (data as any).credit_amount ??
      (data as any).creditPurchased ??
      (data as any).credit_purchased ??
      (data as any).customerBalanceDelta ??
      (data as any).customer_balance_delta
    );
    const tokensPurchased = Number.isFinite(numericCredit) && numericCredit > 0
      ? Math.floor(numericCredit)
      : (Number.isFinite(numericAmount) && numericAmount > 0 ? Math.floor(numericAmount / 9500) : 0);

    if (tokensPurchased > 0) {
      const description = `Mayar TopUp (webhook): tx=${txId || id || 'unknown'} credit=${tokensPurchased}`;

      const { data: existing, error: existingError } = await supabaseAdmin
        .from('token_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('description', description)
        .single();

      if (existingError || !existing) {
        const { error: logError } = await supabaseAdmin
          .from('token_transactions')
          .insert({
            user_id: userId,
            amount: tokensPurchased,
            type: 'PURCHASE',
            description,
            created_at: new Date().toISOString()
          });
        if (logError) {
          console.error("[Mayar Webhook] Failed to log transaction:", logError);
        }
      } else {
        console.log('[Mayar Webhook] Duplicate transaction ignored:', id);
      }

      const { data: tokenRow, error: tokenRowError } = await supabaseAdmin
        .from('user_tokens')
        .select('mayar_last_balance')
        .eq('user_id', userId)
        .single();

      if (tokenRowError) {
        console.warn('[Mayar Webhook] Failed to read mayar_last_balance (will fallback to 0):', tokenRowError);
      }

      const currentSnapshot = typeof tokenRow?.mayar_last_balance === 'number' ? tokenRow.mayar_last_balance : 0;
      const nextSnapshot = currentSnapshot + tokensPurchased;

      const { error: snapshotError } = await supabaseAdmin
        .from('user_tokens')
        .upsert({
            user_id: userId,
            email: targetEmail ? String(targetEmail) : null,
            mayar_last_balance: nextSnapshot,
        }, { onConflict: 'user_id' });

      if (snapshotError) {
        console.error('[Mayar Webhook] Failed to update mayar_last_balance snapshot:', snapshotError);
      }

      if (webhookEventId) {
        await supabaseAdmin
          .from('webhook_events')
          .update({ http_status: 200, processed: true, result: 'paid_processed' })
          .eq('id', webhookEventId);
      }
    } else {
      if (webhookEventId) {
        await supabaseAdmin
          .from('webhook_events')
          .update({ http_status: 200, processed: true, result: 'paid_no_credit' })
          .eq('id', webhookEventId);
      }
    }

    // 7. Update balance snapshot is handled by client sync; webhook focuses on logging + linking

    // 7. (Optional) Force Refresh Token State
    // We can't push to client, but we can update a 'last_updated' timestamp in DB to force SWR revalidation if we had one.
    
    return new Response(JSON.stringify({ message: "Webhook processed successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Mayar Webhook] Error:", error);

    try {
      if (supabaseAdmin && webhookEventId) {
        await supabaseAdmin
          .from('webhook_events')
          .update({
            http_status: 400,
            processed: false,
            result: 'exception',
            error_message: error?.message || String(error)
          })
          .eq('id', webhookEventId);
      }
    } catch (e) {
      console.error('[Mayar Webhook] Failed to update webhook_events on exception:', e);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
