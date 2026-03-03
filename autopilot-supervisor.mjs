import { Dealflow } from './packages/@dealflow/sdk/src/index.ts';
import crypto from 'node:crypto';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// 1. Intelligence Configuration (Groq/Llama-3)
const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

// 2. Dealflow SDK Setup
const sdk = new Dealflow({
    apiKey: 'df_test_5c2697b65c502b1c376ab0c63d04c572',
    baseUrl: 'http://localhost:3000'
});

// 3. Persistent Agent Identity
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicKeyHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
const AGENT_ID = 'autopilot_negotiator_v1';

// Keep track of deals we are currently working on
const currentlyProcessing = new Set();
const processedDeals = new Set();

async function processDeal(deal) {
    if (processedDeals.has(deal.id) || currentlyProcessing.has(deal.id)) return;

    // Logic: Only act if there are NO offers yet (we are the first responder)
    if (deal.offers && deal.offers.length > 0) {
        processedDeals.add(deal.id);
        return;
    }

    console.log(`\n🎯 New Deal Detected: ${deal.id}`);
    console.log(`📝 Intent: "${deal.intent}"`);
    console.log(`💰 Budget: ${deal.constraints.budget_max} ${deal.constraints.currency}`);

    currentlyProcessing.add(deal.id);
    console.log("🤔 System Thinking...");

    try {
        const completion = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an autonomous Procurement Agent. Your goal is to negotiate and provide a high-quality initial offer for a deal. Respond ONLY in JSON: { \"price\": number, \"reasoning\": \"string\" }"
                },
                {
                    role: "user",
                    content: `Intent: ${deal.intent}. Max Budget: ${deal.constraints.budget_max}. Current Summary: ${deal.current_summary}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const brain = JSON.parse(completion.choices[0].message.content);

        // Final sanity check: Don't exceed budget!
        const finalPrice = Math.min(brain.price, deal.constraints.budget_max);

        console.log(`🤖 Decision: Submit offer for $${finalPrice}`);
        console.log(`💡 Strategy: ${brain.reasoning}`);

        // Sign the Action
        const payload = { price: finalPrice, notes: brain.reasoning };
        const messageToSign = JSON.stringify({ action: 'offer', payload });
        const signature = crypto.sign(null, Buffer.from(messageToSign), privateKey).toString('hex');

        // Submit to API
        await deal.offer({
            actor: AGENT_ID,
            ...payload,
            signature,
            publicKey: publicKeyHex
        });

        console.log(`✅ Autonomous Offer Submitted for ${deal.id}`);
        processedDeals.add(deal.id);

    } catch (err) {
        console.error(`❌ Error processing deal ${deal.id}:`, err.message);
        // If it was a compliance block or bad request, don't keep hammering it
        if (err.message.includes('Compliance') || err.message.includes('422')) {
            processedDeals.add(deal.id);
        }
    } finally {
        currentlyProcessing.delete(deal.id);
    }
}

async function startAutopilot() {
    console.log("====================================================");
    console.log("🚀 DEALFLOW AUTOPILOT SUPERVISOR: ACTIVE");
    console.log(`🆔 Agent Identity: ${publicKeyHex.substring(0, 10)}...`);
    console.log("📡 Listening for new deals on http://localhost:3000...");
    console.log("====================================================\n");

    while (true) {
        try {
            // Fetch active deals
            const { deals } = await sdk.deals.list({ status: 'active' });

            for (const dealData of deals) {
                if (!processedDeals.has(dealData.id) && !currentlyProcessing.has(dealData.id)) {
                    // Resume to get full object
                    const deal = await sdk.deals.resume(dealData.id);
                    await processDeal(deal);
                }
            }
        } catch (err) {
            // Silently retry
        }
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

startAutopilot().catch(console.error);
