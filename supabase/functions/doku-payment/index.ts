import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const DOKU_API_URL = "https://api-sandbox.doku.com/checkout/v1/payment"; // Sandbox URL

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { orderId, amount, customerEmail, customerName } = await req.json();

        const clientId = Deno.env.get("DOKU_CLIENT_ID");
        const secretKey = Deno.env.get("DOKU_SECRET_KEY");

        console.log(`[DOKU] Initiating payment. ClientID present: ${!!clientId}, SecretKey present: ${!!secretKey}`);

        if (!clientId || !secretKey) {
            console.error("[DOKU] Missing credentials. Please set DOKU_CLIENT_ID and DOKU_SECRET_KEY secrets.");
            throw new Error("Missing DOKU_CLIENT_ID or DOKU_SECRET_KEY");
        }

        const requestId = crypto.randomUUID();
        const requestTimestamp = new Date().toISOString().slice(0, 19) + "Z"; // ISO8601 UTC+0
        const requestTarget = "/checkout/v1/payment";

        // 2. Construct Request Body
        // Use localhost:3000 as default for dev
        const callbackUrl = "http://localhost:3000/payment-finish";

        const requestBody = {
            order: {
                amount: amount,
                invoice_number: orderId,
                callback_url: callbackUrl,
                auto_redirect: true
            },
            payment: {
                payment_due_date: 60 // 60 minutes
            },
            customer: {
                name: customerName,
                email: customerEmail,
            }
        };

        const requestBodyJson = JSON.stringify(requestBody);
        console.log("[DOKU] Request Body:", requestBodyJson);

        // 3. Generate Digest (SHA256 of body)
        const encoder = new TextEncoder();
        const data = encoder.encode(requestBodyJson);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const digest = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

        // 4. Generate Signature
        // Component: Client-Id + Request-Id + Request-Timestamp + Request-Target + Digest
        const stringToSign = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${requestTarget}\nDigest:${digest}`;

        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secretKey),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(stringToSign));
        const signature = "HMACSHA256=" + btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

        console.log("[DOKU] Calling API:", DOKU_API_URL);

        // 5. Call DOKU API
        const response = await fetch(DOKU_API_URL, {
            method: "POST",
            headers: {
                "Client-Id": clientId,
                "Request-Id": requestId,
                "Request-Timestamp": requestTimestamp,
                "Signature": signature,
                "Content-Type": "application/json",
            },
            body: requestBodyJson,
        });

        const responseData = await response.json();
        console.log(`[DOKU] Response Status: ${response.status}`, responseData);

        if (!response.ok) {
            console.error("DOKU API Error:", responseData);
            // Pass the full error object back to frontend
            throw new Error(JSON.stringify(responseData));
        }

        // 6. Return response to frontend
        return new Response(JSON.stringify(responseData), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (error: any) {
        console.error("[DOKU] Function Error:", error);

        let errorMessage = error.message;
        // Try to parse if it's a stringified JSON
        try {
            const parsed = JSON.parse(error.message);
            if (parsed.error) errorMessage = JSON.stringify(parsed.error);
        } catch { }

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
});
