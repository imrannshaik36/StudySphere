require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
// Port 5000 is sometimes taken by other local services on macOS.
// Default to 5001 so the backend stays reachable out of the box.
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Disk-backed MVP storage
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');
const learningHubSessions = new Map();

if (fs.existsSync(SESSIONS_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        for (const [k, v] of Object.entries(data)) {
            learningHubSessions.set(k, v);
        }
    } catch(e) { console.error("Failed to load sessions.json", e); }
}

const saveSessionsToDisk = () => {
    try {
        const obj = Object.fromEntries(learningHubSessions);
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj));
    } catch(e) { console.error("Failed to save sessions.json", e); }
};
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const makeSessionId = () => {
    // Simple unique-enough id for local MVP usage.
    return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeProgress = (progressNum) => {
    const safe = clamp(Number(progressNum) || 0, 0, 100);
    return { progressNum: safe, progress: `${safe}%` };
};

const GROK_API_KEY = process.env.GROK_API_KEY;

async function callGrokAPI(prompt, systemPrompt = "You are an expert educational curriculum designer and subject matter expert. Your goal is to teach the student with crystal-clear, deep, and flawless pedagogical content.") {
    if (!GROK_API_KEY) throw new Error("Missing GROK_API_KEY in environment variables. Please add GROK_API_KEY=your_key in your backend/.env file.");
    
    console.log("Calling Groq API length of prompt: ", prompt.length);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 8000,
            response_format: { type: "json_object" }
        })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(`Grok API Error: ${data.error?.message || res.statusText}`);
    return data.choices[0].message.content;
}

const generateAiModules = (subject) => {
    const safeSubject = String(subject || '').trim();
    const baseTopics = [
        `${safeSubject} fundamentals`,
        `${safeSubject} core concepts`,
        `${safeSubject} core theories`,
        `${safeSubject} practical applications`,
        `${safeSubject} advanced topics`,
        `${safeSubject} review & mastery`
    ].filter(Boolean);

    const moduleCount = 6;
    const modules = [];
    for (let i = 0; i < moduleCount; i++) {
        const id = i + 1;
        const titleMap = [
            `Module 1: ${safeSubject} Foundations`,
            `Module 2: ${safeSubject} Core Concepts`,
            `Module 3: ${safeSubject} Deep Dive`,
            `Module 4: ${safeSubject} Applications`,
            `Module 5: ${safeSubject} Advanced Topics`,
            `Module 6: ${safeSubject} Mastery & Practice`
        ];

        const topics = [
            {
                id: `t1-${id}`,
                title: baseTopics[i] || `${safeSubject} topic ${i + 1}`,
                matter: `Here is the comprehensive learning material for ${baseTopics[i] || `${safeSubject} topic ${i + 1}`}. This section will soon be powered by an LLM to deliver personalized, robust, and dynamic reading material, practical examples, and tailored practice questions. For now, this is mocked generated matter.`
            }
        ];
        if (i % 2 === 1) {
            topics.push({
                id: `t2-${id}`,
                title: `${safeSubject} subtopic ${i + 1}`,
                matter: `Deep dive into ${safeSubject} subtopic ${i + 1}. Once AI integration is complete, expect detailed breakdowns and advanced pedagogical content here.`
            });
        }

        const deps = i === 0 ? [] : [i]; // depends on previous module id
        const { progressNum, progress } = normalizeProgress(0);

        modules.push({
            id,
            title: titleMap[i] || `Module ${i + 1}`,
            topics,
            dependencies: deps,
            estimatedHours: 2 + i, // placeholder for MVP
            ...{ progressNum, progress },
            timeSpentSec: 0,
            noteText: ''
        });
    }
    return modules;
};

const generateManualModules = (subject, topicsInput) => {
    const safeSubject = String(subject || '').trim();
    const topics = (topicsInput || [])
        .map(t => String(t).trim())
        .filter(Boolean);

    if (topics.length === 0) return [];

    // Group topics into modules (2 topics per module, rounded up)
    const chunkSize = 2;
    const moduleChunks = [];
    for (let i = 0; i < topics.length; i += chunkSize) {
        moduleChunks.push(topics.slice(i, i + chunkSize));
    }

    const modules = moduleChunks.map((chunk, idx) => {
        const id = idx + 1;
        const title = idx === 0
            ? `Module 1: ${chunk.join(' & ')}`
            : `Module ${id}: ${chunk.join(' & ')}`;

        const topicObjects = chunk.map((t, tIdx) => ({
            id: `tm-${id}-${tIdx}`,
            title: t,
            matter: `Welcome to the unit on ${t}. In upcoming updates, an AI will curate extensive, tailored material for this topic, including key concepts, code snippets, and study queries. This serves as a structural placeholder.`
        }));

        const deps = idx === 0 ? [] : [idx]; // previous module id
        const { progressNum, progress } = normalizeProgress(0);

        return {
            id,
            title,
            topics: topicObjects,
            dependencies: deps,
            estimatedHours: clamp(chunk.length + 1, 2, 6),
            ...{ progressNum, progress },
            timeSpentSec: 0,
            noteText: ''
        };
    });

    // Ensure at least 2 modules for a coherent UI.
    return modules.length >= 2 ? modules : [
        ...modules,
        {
            id: 2,
            title: `Module 2: Practice & Consolidation`,
            topics: [
                { id: `tm-2-0`, title: `${safeSubject} practice`, matter: `Curated practice questions and exercises for ${safeSubject}. AI will dynamically generate difficulty-scaled problems here.` },
                { id: `tm-2-1`, title: `${safeSubject} revision`, matter: `High-yield revision notes for ${safeSubject}. Built for quick reviews before examinations.` }
            ],
            dependencies: [1],
            estimatedHours: 3,
            ...normalizeProgress(0),
            timeSpentSec: 0,
            noteText: ''
        }
    ];
};

const extractKeywordsFromText = (text) => {
    const content = String(text || '');
    const words = content
        .toLowerCase()
        .match(/[a-z]{4,}/g) || [];

    const freq = new Map();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

    return Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([w]) => w);
};

// Basic Health Check Route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        message: 'StudySphere Backend is running!',
        timestamp: new Date().toISOString()
    });
});

// Learning Hub Route
app.get('/api/learning-hub', (req, res) => {
    res.json({
        success: true,
        message: 'Learning Hub MVP: use /api/learning-hub/generate/* to create modules.',
        modules: [
            { id: 1, title: 'Introduction to React', progress: '100%' },
            { id: 2, title: 'Advanced Express API', progress: '45%' },
            { id: 3, title: 'Database Optimization', progress: '10%' }
        ]
    });
});

// Generate modules: AI Roadmap
app.post('/api/learning-hub/generate/ai', async (req, res) => {
    const { subject, topics } = req.body || {};
    if (!subject || !String(subject).trim()) {
        return res.status(400).json({ success: false, message: 'Missing `subject`.' });
    }

    const sessionId = makeSessionId();
    const customTopicsList = (Array.isArray(topics) && topics.length > 0) ? topics : [];

    let conceptInstruction = 'Generate between 6 to 8 highly detailed concepts.';
    if (customTopicsList.length > 0) {
        conceptInstruction = `Generate exactly ${customTopicsList.length} highly detailed concepts, perfectly mapping one-to-one to these explicitly requested topics: [ ${customTopicsList.join(', ')} ]. Do not invent your own concepts; strictly follow this list!`;
    }

    try {
        const prompt = `
Create a comprehensive, structured learning curriculum for the subject: "${subject}".
You MUST respond ONLY with a raw JSON object. DO NOT wrap the JSON in markdown formatting (no \`\`\`json). Do not add any conversational text.

The JSON object MUST strictly follow this structure:
{
  "overview": {
    "executiveSummary": "A highly detailed summary of the subject.",
    "mainIdeas": ["Idea 1", "Idea 2", "Idea 3"],
    "whyItMatters": ["Point 1", "Point 2"],
    "keyTakeaway": "One major takeaway sentence."
  },
  "concepts": [
    {
      "title": "Concept Name",
      "difficulty": "easy",
      "definition": "A 2-3 paragraph deep and clear definition of the concept.",
      "deepDive": "An incredibly deep, under-the-hood analysis and breakdown of how the concept works theoretically.",
      "codeExample": "If coding/algorithm related, provide a robust code walkthrough. If database related, provide SQL queries. If theoretical (like ANN, Cloud), provide an ASCII text-based flowchart or structural diagram.",
      "useCases": "Detailed real-world applications and scenarios where this concept is indispensable.",
      "advantagesDisadvantages": "A thorough comparison of the pros, cons, tradeoffs, and limitations in Markdown bullet points."
    }
  ], 
  "flashcards": [
    { "question": "A specific question", "answer": "The accurate answer" }
  ], 
  "quizzes": [
    {
      "question": "A multiple choice question",
      "difficulty": "easy",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ] 
}

Instructions:
1. ${conceptInstruction} Difficulty must be "easy", "medium", or "hard".
2. Generate exactly 6 challenging flashcards.
3. Generate exactly 5 rigorous quiz questions mapping to the learning material. "correctIndex" must be an integer (0-3).
4. Every concept MUST comprehensively fill out definition, deepDive, codeExample, useCases, and advantagesDisadvantages with immense markdown detail.
5. CRITICAL: Escape all newlines as \\n within your JSON string values. Do not use raw literal formatting returns.
`;
        const llmResponse = await callGrokAPI(prompt);
        let parsedData;
        try {
            parsedData = JSON.parse(llmResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim());
        } catch (parseError) {
            console.error("Failed to parse LLM response:", llmResponse);
            throw new Error("LLM did not return proper JSON structure.");
        }

        learningHubSessions.set(sessionId, { subject, mode: 'ai', curriculum: parsedData, createdAt: Date.now(), timeSpentSec: 0 });
        saveSessionsToDisk();
        return res.json({ success: true, sessionId, subject, curriculum: parsedData });

    } catch (error) {
        console.error("Grok Gen Error:", error);
        // Fallback to mock generation if the key is missing or errored
        if (error.message.includes("Missing GROK_API_KEY")) {
             return res.status(500).json({ success: false, message: error.message });
        }
        
        // Safety Fallback (optional, but good for robust UX if Grok times out)
        const mockCurriculum = {
            overview: {
                executiveSummary: `Fallback summary for ${subject}. Since the Grok API failed, this is mock generated content.`,
                mainIdeas: ["Mock Idea 1", "Mock Idea 2"],
                whyItMatters: ["Mock matter 1", "Mock matter 2"],
                keyTakeaway: "Mock key takeaway."
            },
            concepts: [
                { title: "Mock Concept 1", difficulty: "easy", definition: "A placeholder definition for this mock concept.", deepDive: "Deep dive text", codeExample: "Code example", useCases: "- Example use", advantagesDisadvantages: "- Pros and cons" },
                { title: "Mock Concept 2", difficulty: "medium", definition: "A deeper placeholder definition.", deepDive: "Deep dive text", codeExample: "Code example", useCases: "- Example use", advantagesDisadvantages: "- Pros and cons" }
            ],
            flashcards: [
                { question: "Mock Flashcard Q1?", answer: "Mock Answer 1" },
                { question: "Mock Flashcard Q2?", answer: "Mock Answer 2" }
            ],
            quizzes: [
                { question: "Mock Quiz Q1?", difficulty: "easy", options: ["A", "B", "C", "D"], correctIndex: 0 }
            ]
        };
        learningHubSessions.set(sessionId, { subject, mode: 'ai', curriculum: mockCurriculum, createdAt: Date.now(), timeSpentSec: 0 });
        saveSessionsToDisk();
        return res.json({ success: true, sessionId, subject, curriculum: mockCurriculum });
    }
});

app.put('/api/learning-hub/sessions/:sessionId/time', (req, res) => {
    const { sessionId } = req.params;
    const { incrementSec } = req.body;
    const session = learningHubSessions.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });
    
    session.timeSpentSec = (session.timeSpentSec || 0) + (Number(incrementSec) || 0);
    saveSessionsToDisk();
    return res.json({ success: true, timeSpentSec: session.timeSpentSec });
});

// Generate modules: Manual topic entry
app.post('/api/learning-hub/generate/manual', (req, res) => {
    const { subject, topics } = req.body || {};
    const topicsArr = Array.isArray(topics) ? topics : [];

    if (!subject || !String(subject).trim()) {
        return res.status(400).json({ success: false, message: 'Missing `subject`.' });
    }
    if (topicsArr.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing `topics` array.' });
    }

    const sessionId = makeSessionId();
    const modules = generateManualModules(subject, topicsArr);
    learningHubSessions.set(sessionId, { subject, mode: 'manual', modules, createdAt: Date.now() });
    saveSessionsToDisk();

    res.json({ success: true, sessionId, subject, modules });
});

// Generate modules: PDF / text upload (MVP extraction)
app.post('/api/learning-hub/generate/pdf', upload.single('file'), async (req, res) => {
    const { subject: subjectFromBody } = req.body || {};
    const subject = subjectFromBody && String(subjectFromBody).trim() ? String(subjectFromBody).trim() : 'Your uploaded material';

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Missing uploaded file.' });
    }

    try {
        const fileName = req.file.originalname || 'upload';
        let extractedText = '';

        // Basic support for pdf vs text notes.
        if ((req.file.mimetype || '').includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
            const parsed = await pdfParse(req.file.buffer);
            extractedText = parsed?.text || '';
        } else {
            // Treat other uploads as plain text for MVP.
            extractedText = req.file.buffer.toString('utf8');
        }

        const keywords = extractKeywordsFromText(extractedText);
        const topics = keywords.length ? keywords : [`${subject} concept 1`, `${subject} concept 2`, `${subject} concept 3`];

        const sessionId = makeSessionId();
        const modules = generateManualModules(subject, topics);
        learningHubSessions.set(sessionId, {
            subject,
            mode: 'pdf',
            modules,
            createdAt: Date.now()
        });
        saveSessionsToDisk();

        res.json({ success: true, sessionId, subject, modules, extractedTopics: topics.slice(0, 10) });
    } catch (err) {
        console.error('PDF/text extraction failed:', err);
        return res.status(500).json({ success: false, message: 'Failed to process uploaded file.' });
    }
});

// Get a session (modules + progress)
app.get('/api/learning-hub/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = learningHubSessions.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, ...session });
});

// Update module progress inside a session
app.post('/api/learning-hub/sessions/:sessionId/progress', (req, res) => {
    const { sessionId } = req.params;
    const session = learningHubSessions.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const { moduleId, progressNum } = req.body || {};
    const mid = Number(moduleId);
    if (!Number.isFinite(mid)) return res.status(400).json({ success: false, message: 'Invalid `moduleId`.' });

    const next = normalizeProgress(progressNum);

    const idx = session.modules.findIndex(m => Number(m.id) === mid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Module not found in session.' });

    session.modules[idx] = { ...session.modules[idx], ...next };
    learningHubSessions.set(sessionId, session);

    res.json({ success: true, modules: session.modules });
});

// Add time spent on a module (MVP: stored in memory)
app.post('/api/learning-hub/sessions/:sessionId/modules/:moduleId/time', (req, res) => {
    const { sessionId, moduleId } = req.params;
    const session = learningHubSessions.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const mid = Number(moduleId);
    if (!Number.isFinite(mid)) return res.status(400).json({ success: false, message: 'Invalid `moduleId`.' });

    const { secondsToAdd } = req.body || {};
    const add = Math.max(0, Math.floor(Number(secondsToAdd) || 0));

    const idx = session.modules.findIndex(m => Number(m.id) === mid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Module not found in session.' });

    const current = Number(session.modules[idx].timeSpentSec) || 0;
    session.modules[idx].timeSpentSec = current + add;
    learningHubSessions.set(sessionId, session);

    res.json({ success: true, modules: session.modules });
});

// Save notes for a module (MVP: stored in memory)
app.post('/api/learning-hub/sessions/:sessionId/modules/:moduleId/notes', (req, res) => {
    const { sessionId, moduleId } = req.params;
    const session = learningHubSessions.get(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const mid = Number(moduleId);
    if (!Number.isFinite(mid)) return res.status(400).json({ success: false, message: 'Invalid `moduleId`.' });

    const { noteText } = req.body || {};
    const text = String(noteText ?? '');

    const idx = session.modules.findIndex(m => Number(m.id) === mid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Module not found in session.' });

    session.modules[idx].noteText = text;
    learningHubSessions.set(sessionId, session);

    res.json({ success: true, modules: session.modules });
});

// Study Planner Route
app.get('/api/study-planner', (req, res) => {
    console.log("📅 Study Planner API hit!");
    res.json({
        success: true,
        message: 'Study Planner data loaded from backend.',
        tasks: [
            { id: 1, task: 'Complete Calculus Chapter 4', due: 'Today' },
            { id: 2, task: 'Review Physics Notes', due: 'Tomorrow' },
            { id: 3, task: 'Write English Essay', due: 'Friday' }
        ]
    });
});

// AI Assistant Route
app.get('/api/ai-chat', (req, res) => {
    console.log("🤖 AI Chat API hit!");
    res.json({
        success: true,
        message: 'AI Assistant backend connected and ready.',
        status: 'Online',
        recentQueries: ['Explain quantum entanglement', 'How does useState work?']
    });
});

// Analytics Route
app.get('/api/analytics', (req, res) => {
    console.log("📊 Analytics API hit!");
    res.json({
        success: true,
        message: 'Analytics data successfully fetched.',
        stats: {
            studyHours: 42,
            averageScore: '88%',
            topSubject: 'Computer Science'
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server internally running at http://localhost:${PORT}`);
});
