require('dotenv').config();
const GROK_API_KEY = process.env.GROK_API_KEY;
async function test() {
    console.log("Key length:", GROK_API_KEY?.length);
    const models = ['grok-beta', 'grok-2', 'grok-2-latest', 'grok-1'];
    for (const model of models) {
        try {
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROK_API_KEY}` },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }], model })
            });
            const data = await res.text();
            console.log(`[${model}] Status:`, res.status, "Message:", data.substring(0, 100));
        } catch(e) {
            console.log(`[${model}] Fetch Exception:`, e.message);
        }
    }
}
test();
