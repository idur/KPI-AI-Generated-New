
async function runTest() {
    const WEBHOOK_URL = "https://rshnvxskxffyvjniqsyo.supabase.co/functions/v1/mayar-webhook";

    // 1. Test "Testing" Event (Ping)
    console.log("---------------------------------------------------");
    console.log("🧪 TEST 1: Sending 'testing' event (Ping)...");
    const pingPayload = {
        event: "testing",
        data: {
            id: "ping-123",
            status: "SUCCESS"
        }
    };

    try {
        const res1 = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pingPayload)
        });
        const data1 = await res1.json();
        console.log(`Status: ${res1.status}`);
        console.log(`Response:`, data1);
        
        if (res1.status === 200) console.log("✅ TEST 1 PASSED");
        else console.log("❌ TEST 1 FAILED");

    } catch (err) {
        console.error("❌ TEST 1 ERROR:", err);
    }

    // 2. Test "Payment" Event (Simulation)
    console.log("\n---------------------------------------------------");
    console.log("🧪 TEST 2: Sending 'PAID' transaction simulation...");
    const paymentPayload = {
        event: "credit.topup", // Generic event name
        data: {
            id: `TRX-TEST-${Date.now()}`,
            status: "PAID",
            amount: 50000,
            customer: {
                name: "Unit Tester",
                email: "nonexistent@example.com" // Deliberately using non-existent email to check logic
            },
            email: "nonexistent@example.com"
        }
    };

    try {
        const res2 = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentPayload)
        });
        const data2 = await res2.json();
        console.log(`Status: ${res2.status}`);
        console.log(`Response:`, data2);

        // We expect 400 because user doesn't exist, which means logic reached the user lookup phase
        if (res2.status === 400 && data2.message === "User not found") {
            console.log("✅ TEST 2 PASSED (Correctly identified missing user)");
        } else if (res2.status === 200) {
            console.log("⚠️ TEST 2 RESULT: 200 OK (User might exist or logic permissive)");
        } else {
            console.log("❌ TEST 2 FAILED (Unexpected response)");
        }

    } catch (err) {
        console.error("❌ TEST 2 ERROR:", err);
    }
    console.log("---------------------------------------------------");
}

runTest();
