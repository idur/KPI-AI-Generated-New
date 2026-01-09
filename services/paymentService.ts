import { supabase } from './supabaseClient';

export interface PaymentRequest {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
}

/**
 * Initiates a payment process using DOKU via Supabase Edge Function.
 * Returns the Payment URL to redirect the user to.
 */
export const initiatePayment = async (req: PaymentRequest): Promise<string> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        // Using invoke handling potential auth headers automatically
        const { data, error } = await supabase.functions.invoke('doku-payment', {
            body: req,
        });

        if (error) {
            console.error("Payment initiation function error:", error);
            // If it's a FunctionInvokeError, context might be hidden. 
            // Often "context: ..." or standard error string.
            throw new Error(`Gagal menghubungi server pembayaran: ${error.message || error}`);
        }

        // Check for DOKU API error in the response body if function executed but returned api error
        if (data.error) {
            // data.error might be a stringified JSON from our improved function
            let preciseError = data.error;
            if (typeof data.error === 'object') {
                preciseError = JSON.stringify(data.error);
            }
            throw new Error(preciseError);
        }

        // DOKU Checkout API structure: { response: { payment: { url: "..." } } }
        if (data?.response?.payment?.url) {
            return data.response.payment.url;
        }

        // Fallback/log structure if unexpected
        console.error("Unexpected payment response structure:", data);
        throw new Error("Respon api tidak valid: " + JSON.stringify(data));

    } catch (err: any) {
        console.error("Payment Initiation Error:", err);
        throw err;
    }
};
