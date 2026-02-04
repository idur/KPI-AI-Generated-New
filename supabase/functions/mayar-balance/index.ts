
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAYAR_API_URL = "https://api.mayar.id/credit/v1/credit/customer/balance"; // Production Endpoint

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const decodeBase64Url = (input: string): string => {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLength);
    return atob(padded);
};

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders,
        });
    }

    try {
        const { productId, membershipTierId: membershipTierIdFromBody } = await req.json();

        // Get the user from the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({
                customerBalance: null,
                error: {
                    stage: 'auth',
                    message: 'Missing Authorization header'
                }
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                }
            });
        }

        // We need the user's ID to pass as memberId
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length < 2) {
            return new Response(JSON.stringify({
                customerBalance: null,
                error: {
                    stage: 'auth',
                    message: 'Invalid JWT'
                }
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                }
            });
        }

        const jwtPayload = JSON.parse(decodeBase64Url(parts[1]));
        const userId = jwtPayload.sub;
        const userEmailFromJwt = jwtPayload.email;

        if (!userId) {
            throw new Error("Invalid User ID from token");
        }

        const apiKey = Deno.env.get("MAYAR_API_KEY");
        if (!apiKey) {
            console.error("Missing MAYAR_API_KEY");
            throw new Error("Server configuration error: MAYAR_API_KEY missing");
        }

        let mayarCustomerId: string | undefined;
        let userEmail: string | undefined = userEmailFromJwt;

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && serviceRoleKey) {
            const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
            const { data: tokenUser, error: dbError } = await supabaseAdmin
                .from('user_tokens')
                .select('mayar_customer_id, email')
                .eq('user_id', userId)
                .single();

            if (dbError) {
                console.warn('[Mayar Production] Failed to read user_tokens for mayar id/email:', dbError);
            }

            mayarCustomerId = tokenUser?.mayar_customer_id;
            userEmail = tokenUser?.email || userEmail;
        }

        // Construct Query Params
        const membershipTierId = membershipTierIdFromBody || Deno.env.get("MAYAR_MEMBERSHIP_TIER_ID");

        const parseBalance = (data: any): number | null => {
            const rawBalance = (data?.customerBalance ?? data?.data?.customerBalance ?? data?.data?.balance ?? data?.balance ?? null);
            if (typeof rawBalance === 'number') return rawBalance;
            if (typeof rawBalance === 'string' && rawBalance.trim() !== '' && !Number.isNaN(Number(rawBalance))) return Number(rawBalance);
            return null;
        };

        const callMayar = async (strategy: string, params: URLSearchParams) => {
            const url = `${MAYAR_API_URL}?${params.toString()}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            });
            const json = await response.json();
            return { ok: response.ok, status: response.status, json, strategy };
        };

        const baseParams = new URLSearchParams();
        baseParams.append('productId', productId);
        if (membershipTierId) baseParams.append('membershipTierId', membershipTierId);

        const attempts: Array<{ strategy: string; status: number; message?: string }> = [];
        const candidates: Array<{ strategy: string; params: URLSearchParams }> = [];

        if (mayarCustomerId) {
            const p1 = new URLSearchParams(baseParams);
            p1.append('customerId', mayarCustomerId);
            candidates.push({ strategy: `customerId=${mayarCustomerId}`, params: p1 });

            const p2 = new URLSearchParams(baseParams);
            p2.append('memberId', mayarCustomerId);
            candidates.push({ strategy: `memberId(customerId)=${mayarCustomerId}`, params: p2 });
        }

        if (userEmail) {
            const p3 = new URLSearchParams(baseParams);
            p3.append('memberId', userEmail);
            candidates.push({ strategy: `memberId(email)=${userEmail}`, params: p3 });
        }

        const p4 = new URLSearchParams(baseParams);
        p4.append('memberId', userId);
        candidates.push({ strategy: `memberId(userId)=${userId}`, params: p4 });

        let lastError: any = null;

        for (const c of candidates) {
            console.log(`[Mayar Production] Fetching balance using ${c.strategy}`);
            const { ok, status, json, strategy } = await callMayar(c.strategy, c.params);
            console.log(`[Mayar] Response Status (${strategy}): ${status}`);

            if (!ok) {
                attempts.push({ strategy, status, message: json?.message });
                lastError = json;
                continue;
            }

            const balance = parseBalance(json);
            if (balance === null) {
                attempts.push({ strategy, status, message: 'Unexpected response shape' });
                lastError = json;
                continue;
            }

            return new Response(JSON.stringify({
                customerBalance: balance,
                strategy,
                raw: json
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                }
            });
        }

        console.error('[Mayar] API Error (all strategies failed):', { attempts, lastError });
        return new Response(JSON.stringify({
            customerBalance: null,
            error: {
                stage: 'mayar',
                status: 0,
                message: 'Failed to fetch balance from Mayar (all strategies failed)',
                attempts,
                raw: lastError
            }
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
            }
        });

    } catch (error: any) {
        console.error("[Mayar] Error:", error);
        return new Response(JSON.stringify({
            customerBalance: null,
            error: {
                stage: 'edge',
                message: error?.message || String(error)
            }
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
            },
        });
    }
});
