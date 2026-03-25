require('dotenv').config();
const GROK_API_KEY = process.env.GROK_API_KEY;
async function test() {
    console.log("Key length:", GROK_API_KEY?.length);
    try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROK_API_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: 'test' },
                    { role: 'user', content: 'hello' }
                ],
                model: 'grok-2-latest',
            })
        });
        console.log("Status:", res.status);
        const data = await res.text();
        console.log("Data:", data);
    } catch(e) {
        console.error("Fetch Exception:", e);
    }
}
test();
