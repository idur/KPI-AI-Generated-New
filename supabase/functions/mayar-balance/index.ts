
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAYAR_API_URL = "https://api.mayar.id/credit/v1/credit/customer/balance"; // Production Endpoint

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { productId } = await req.json();

        // Get the user from the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        // We need the user's ID to pass as memberId
        const token = authHeader.replace('Bearer ', '');
        const jwtPayload = JSON.parse(atob(token.split('.')[1]));
        const userId = jwtPayload.sub;

        if (!userId) {
            throw new Error("Invalid User ID from token");
        }

        const apiKey = Deno.env.get("MAYAR_API_KEY");
        if (!apiKey) {
            console.error("Missing MAYAR_API_KEY");
            throw new Error("Server configuration error: MAYAR_API_KEY missing");
        }

        // Construct Query Params
        const params = new URLSearchParams();
        params.append("productId", productId);
        params.append("memberId", userId); // Updated to use memberId as per requested URL structure

        // Note: membershipTierId is requested in the URL structure provided by user, 
        // but we removed it earlier based on "Credit Based Product" instructions.
        // If the sandbox endpoint strictly requires it, we might need to add it back or pass empty.
        // Based on the user's URL: ...&membershipTierId={membershipTierId}...
        // Let's assume we might need to pass it if provided, or maybe it's optional for some products.
        // However, the previous instruction was to remove it. 
        // Let's stick to the parameters we have, but if the endpoint fails, we know why.
        // Actually, looking at the user's input, they explicitly included membershipTierId in the example URL.
        // Let's check if we have it in the request body. If not, we can't append it.
        // For now, let's keep it simple as per previous "Credit Based Product" refinement which removed it.
        // But the URL structure implies it might be needed. 
        // Let's try sending just productId and memberId first (mapped from userId).

        const url = `${MAYAR_API_URL}?${params.toString()}`;

        console.log(`[Mayar Production] Fetching balance for MemberID: ${userId}`);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        
        console.log(`[Mayar] Response Status: ${response.status}`);

        if (!response.ok) {
            console.error("[Mayar] API Error:", data);
            throw new Error(data.message || "Failed to fetch balance from Mayar");
        }

        return new Response(JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (error: any) {
        console.error("[Mayar] Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
});
