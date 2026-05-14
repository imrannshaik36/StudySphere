require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
// Port 5000 is sometimes taken by other local services on macOS.
// Default to 5001 so the backend stays reachable out of the box.
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

const connectDB = require('./config/db');
connectDB(); // Initialize MongoDB
app.use('/api/auth', require('./routes/authRoutes'));

const { protect } = require('./middleware/authMiddleware');
const LearningSession = require('./models/LearningSession');
const Goal = require('./models/Goal');
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

async function callGrokAPI(prompt, systemPrompt = "You are an expert educational curriculum designer and subject matter expert. Your goal is to teach the student with crystal-clear, deep, and flawless pedagogical content.", jsonMode = true) {
    if (!GROK_API_KEY) throw new Error("Missing GROK_API_KEY in environment variables. Please add GROK_API_KEY=your_key in your backend/.env file.");

    console.log("Calling Groq API length of prompt: ", prompt.length);

    const bodyObj = {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 8000
    };

    if (jsonMode) {
        bodyObj.response_format = { type: "json_object" };
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify(bodyObj)
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
app.post('/api/learning-hub/generate/ai', protect, async (req, res) => {
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
      "advantagesDisadvantages": "A thorough comparison of the pros, cons, tradeoffs, and limitations in Markdown bullet points.",
      "practiceQuestions": ["Rigorous question 1", "Rigorous question 2", "Rigorous question 3", "Rigorous question 4", "Rigorous question 5"]
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
4. Every concept MUST comprehensively fill out definition, deepDive, codeExample, useCases, advantagesDisadvantages, and practiceQuestions with immense markdown detail.
5. Generate precisely 4 to 5 rigorous practice questions per concept in the 'practiceQuestions' array. Provide ONLY the question.
6. CRITICAL: Escape all newlines as \\n within your JSON string values. Do not use raw literal formatting returns.
`;
        const llmResponse = await callGrokAPI(prompt);
        let parsedData;
        try {
            parsedData = JSON.parse(llmResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim());
        } catch (parseError) {
            console.error("Failed to parse LLM response:", llmResponse);
            throw new Error("LLM did not return proper JSON structure.");
        }

        const dbSess = await LearningSession.create({ userId: req.user._id, subject, mode: 'ai', curriculum: parsedData });
        return res.json({ success: true, sessionId: dbSess._id, subject, curriculum: parsedData });

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
                { title: "Mock Concept 1", difficulty: "easy", definition: "A placeholder definition for this mock concept.", deepDive: "Deep dive text", codeExample: "Code example", useCases: "- Example use", advantagesDisadvantages: "- Pros and cons", practiceQuestions: ["Mock Q1", "Mock Q2", "Mock Q3", "Mock Q4"] },
                { title: "Mock Concept 2", difficulty: "medium", definition: "A deeper placeholder definition.", deepDive: "Deep dive text", codeExample: "Code example", useCases: "- Example use", advantagesDisadvantages: "- Pros and cons", practiceQuestions: ["Mock Q1", "Mock Q2", "Mock Q3", "Mock Q4"] }
            ],
            flashcards: [
                { question: "Mock Flashcard Q1?", answer: "Mock Answer 1" },
                { question: "Mock Flashcard Q2?", answer: "Mock Answer 2" }
            ],
            quizzes: [
                { question: "Mock Quiz Q1?", difficulty: "easy", options: ["A", "B", "C", "D"], correctIndex: 0 }
            ]
        };
        const mockSess = await LearningSession.create({ userId: req.user._id, subject, mode: 'ai', curriculum: mockCurriculum });
        return res.json({ success: true, sessionId: mockSess._id, subject, curriculum: mockCurriculum });
    }
});

app.put('/api/learning-hub/sessions/:sessionId/time', protect, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { incrementSec } = req.body;
        const session = await LearningSession.findOne({ _id: sessionId, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, message: "Session not found." });

        session.timeSpentSec = (session.timeSpentSec || 0) + (Number(incrementSec) || 0);
        await session.save();
        return res.json({ success: true, timeSpentSec: session.timeSpentSec });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Generate modules: Manual topic entry
app.post('/api/learning-hub/generate/manual', protect, async (req, res) => {
    const { subject, topics } = req.body || {};
    const topicsArr = Array.isArray(topics) ? topics : [];

    if (!subject || !String(subject).trim()) {
        return res.status(400).json({ success: false, message: 'Missing `subject`.' });
    }
    if (topicsArr.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing `topics` array.' });
    }

    try {
        const modules = generateManualModules(subject, topicsArr);
        const dbSess = await LearningSession.create({ userId: req.user._id, subject, mode: 'manual', modules });
        res.json({ success: true, sessionId: dbSess._id, subject, modules });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Generate modules: PDF / text upload (MVP extraction)
app.post('/api/learning-hub/generate/pdf', protect, upload.single('file'), async (req, res) => {
    const { subject: subjectFromBody } = req.body || {};
    const subject = subjectFromBody && String(subjectFromBody).trim() ? String(subjectFromBody).trim() : 'Your uploaded material';

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Missing uploaded file.' });
    }

    try {
        const fileName = req.file.originalname || 'upload';
        let extractedText = '';

        if ((req.file.mimetype || '').includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
            const parsed = await pdfParse(req.file.buffer);
            extractedText = parsed?.text || '';
        } else {
            extractedText = req.file.buffer.toString('utf8');
        }

        const keywords = extractKeywordsFromText(extractedText);
        const topics = keywords.length ? keywords : [`${subject} concept 1`, `${subject} concept 2`, `${subject} concept 3`];

        const modules = generateManualModules(subject, topics);
        const dbSess = await LearningSession.create({ userId: req.user._id, subject, mode: 'pdf', modules });

        res.json({ success: true, sessionId: dbSess._id, subject, modules, extractedTopics: topics.slice(0, 10) });
    } catch (err) {
        console.error('PDF extraction failed:', err);
        return res.status(500).json({ success: false, message: 'Failed to process uploaded file.' });
    }
});

// Get a session
app.get('/api/learning-hub/sessions/:sessionId', protect, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await LearningSession.findOne({ _id: sessionId, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
        res.json({ success: true, ...session.toObject() });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Update module progress inside a session
app.post('/api/learning-hub/sessions/:sessionId/progress', protect, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { moduleId, progressNum } = req.body || {};
        const session = await LearningSession.findOne({ _id: sessionId, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        const mid = Number(moduleId);
        const idx = session.modules.findIndex(m => Number(m.id) === mid);
        if (idx > -1) {
            session.modules[idx] = { ...session.modules[idx], ...normalizeProgress(progressNum) };
            session.markModified('modules');
            await session.save();
        }
        res.json({ success: true, modules: session.modules });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Add time spent on a module
app.post('/api/learning-hub/sessions/:sessionId/modules/:moduleId/time', protect, async (req, res) => {
    try {
        const { sessionId, moduleId } = req.params;
        const session = await LearningSession.findOne({ _id: sessionId, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        const mid = Number(moduleId);
        const { secondsToAdd } = req.body || {};
        const add = Math.max(0, Math.floor(Number(secondsToAdd) || 0));

        const idx = session.modules.findIndex(m => Number(m.id) === mid);
        if (idx > -1) {
            session.modules[idx].timeSpentSec = (Number(session.modules[idx].timeSpentSec) || 0) + add;
            session.markModified('modules');
            await session.save();
        }
        res.json({ success: true, modules: session.modules });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Save notes for a module
app.post('/api/learning-hub/sessions/:sessionId/modules/:moduleId/notes', protect, async (req, res) => {
    try {
        const { sessionId, moduleId } = req.params;
        const session = await LearningSession.findOne({ _id: sessionId, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        const mid = Number(moduleId);
        const { noteText } = req.body || {};

        const idx = session.modules.findIndex(m => Number(m.id) === mid);
        if (idx > -1) {
            session.modules[idx].noteText = String(noteText || '');
            session.markModified('modules');
            await session.save();
        }
        res.json({ success: true, modules: session.modules });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get all subjects
app.get('/api/learning-hub/subjects', protect, async (req, res) => {
    try {
        const sessions = await LearningSession.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const subjects = sessions.map(s => ({ name: s.subject, sessionId: s._id }));
        res.json({ success: true, subjects });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Delete a subject
app.delete('/api/learning-hub/sessions/:sessionId', protect, async (req, res) => {
    try {
        await LearningSession.findOneAndDelete({ _id: req.params.sessionId, userId: req.user._id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─────────────────────────────────────────
// Goals API (Study Planner Saves)
// ─────────────────────────────────────────
app.get('/api/goals', protect, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, goals });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/goals', protect, async (req, res) => {
    try {
        const { title, tasks } = req.body;
        const newGoal = await Goal.create({ userId: req.user._id, title, tasks });
        res.json({ success: true, goal: newGoal });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/goals/:id', protect, async (req, res) => {
    try {
        await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
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

// Analytics Engine based on User LearningSession data
app.get('/api/analytics', protect, async (req, res) => {
    try {
        const sessions = await LearningSession.find({ userId: req.user._id });

        let totalSeconds = 0;
        const subjectTimeMap = {};
        const dailyStudyMap = {};

        sessions.forEach(session => {
            const subject = session.subject || 'Unknown Subject';
            if (!subjectTimeMap[subject]) subjectTimeMap[subject] = 0;

            // Date processing
            const dateStr = session.createdAt ? new Date(session.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            if (!dailyStudyMap[dateStr]) dailyStudyMap[dateStr] = {};
            if (!dailyStudyMap[dateStr][subject]) dailyStudyMap[dateStr][subject] = 0;

            let sessionSeconds = 0;
            // timeSpentSec per session (top level) or per module
            if (session.modules && Array.isArray(session.modules)) {
                session.modules.forEach(mod => {
                    sessionSeconds += (Number(mod.timeSpentSec) || 0);
                });
            } else {
                sessionSeconds += (Number(session.timeSpentSec) || 0);
            }

            totalSeconds += sessionSeconds;
            subjectTimeMap[subject] += sessionSeconds;
            dailyStudyMap[dateStr][subject] += sessionSeconds;
        });

        const studyHours = (totalSeconds / 3600).toFixed(1);

        // Calculate Extrema
        let topSubject = 'N/A';
        let leastSubject = 'N/A';
        let maxTime = -1;
        let minTime = Infinity;

        for (const [sub, time] of Object.entries(subjectTimeMap)) {
            if (time > maxTime) { maxTime = time; topSubject = sub; }
            if (time < minTime && time > 0) { minTime = time; leastSubject = sub; }
        }
        if (minTime === Infinity && maxTime === -1) { topSubject = 'N/A'; leastSubject = 'N/A'; }
        else if (minTime === Infinity) leastSubject = topSubject;

        // Calculate Login Streak
        const sortedDates = Object.keys(dailyStudyMap).sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        let cursorDate = new Date(); // Start from today
        cursorDate.setHours(0, 0, 0, 0);

        // Simple backward continuous timeline checker
        if (sortedDates.length > 0) {
            for (let i = 0; i < sortedDates.length; i++) {
                const logDate = new Date(sortedDates[i]);
                logDate.setHours(0, 0, 0, 0);

                const diffTime = cursorDate - logDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 0 || diffDays === 1) {
                    streak++;
                    cursorDate = logDate; // Push cursor backward
                } else if (diffDays > 1) {
                    break; // Streak broke
                }
            }
        }

        res.json({
            success: true,
            message: 'Learning Hub Analytics',
            stats: {
                studyHours,
                topSubject,
                leastSubject,
                streak
            },
            timeline: dailyStudyMap,
            subjectBreakdown: subjectTimeMap
        });
    } catch (err) {
        console.error("Analytics Error", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────
// AI Study Roadmap Generator (Gemini)
// ─────────────────────────────────────────
app.post('/api/generate-plan', protect, upload.single('document'), async (req, res) => {
    try {
        const { subject, days, hoursPerDay } = req.body;
        const file = req.file;

        let contextText = subject ? subject.trim() : 'General Computer Science Topics';

        // Extract text from uploaded PDF (if any)
        if (file) {
            try {
                // ✅ Lazy require — only loads pdf-parse when a PDF is actually uploaded
                const pdfParse = require('pdf-parse');
                const pdfData = await pdfParse(file.buffer);
                const extracted = pdfData.text.trim();
                if (extracted.length > 0) {
                    contextText = extracted.substring(0, 15000);
                }
            } catch (pdfErr) {
                console.warn('PDF parsing failed, falling back to subject text:', pdfErr.message);
            }
        }

        const totalDays = parseInt(days) || 30;
        const dailyHours = parseInt(hoursPerDay) || 2;
        const totalHours = totalDays * dailyHours;

        if (GROK_API_KEY) {
            // ── Grok Path ──────────────────────────────────────────────
            const systemPrompt = "You are an expert academic planner.";
            const prompt = `
Context to study: ${contextText}
The student has exactly ${totalDays} days to study, committing ${dailyHours} hours per day (Total: ${totalHours} hours).

Break down the fundamental and advanced concepts from the context into a sequential study roadmap.
Allocate specific hours to each concept so the sum of ALL hoursAllocated equals EXACTLY ${totalHours} hours.

Return ONLY a valid JSON object containing a "tasks" array — no markdown, no explanation, no extra text.
Format:
{
  "tasks": [
    { "id": 1, "task": "Concept Name", "due": "Day X", "hoursAllocated": 4, "completed": false }
  ]
}
`;

            const llmResponse = await callGrokAPI(prompt, systemPrompt, true);
            let responseText = llmResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsedData = JSON.parse(responseText);

            return res.json({
                success: true,
                tasks: parsedData.tasks || [],
                message: 'AI Roadmap Generated by Groq!'
            });

        } else {
            // ── Mock Fallback (no API key) ────────────────────────────────
            console.warn('⚠️  No GROK_API_KEY in .env — returning mock roadmap.');

            const concepts = [
                'Fundamentals & Basics',
                'Core Algorithms',
                'Advanced Theory',
                'Practical Real-world Application',
                'Mock Testing Phase',
                'Final Comprehensive Review'
            ];

            let hoursLeft = totalHours;
            const hoursPerConcept = Math.floor(totalHours / concepts.length);

            const fakeTasks = concepts.map((concept, index) => {
                const isLast = index === concepts.length - 1;
                const hours = isLast ? hoursLeft : hoursPerConcept;
                hoursLeft -= hours;

                return {
                    id: index + 1, // ✅ ids start at 1, never 0
                    task: `${concept} — ${subject || 'Uploaded Material'}`,
                    due: `Day ${Math.ceil((index + 1) * (totalDays / concepts.length))}`,
                    hoursAllocated: hours,
                    completed: false
                };
            });

            return res.json({
                success: true,
                tasks: fakeTasks,
                message: 'Mock roadmap returned. Add GEMINI_API_KEY to .env for real AI output.'
            });
        }

    } catch (err) {
        console.error('❌ Error generating plan:', err);
        res.status(500).json({
            success: false,
            // ✅ Send the real error so the frontend can display it
            message: err.message || 'Failed to generate AI plan.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────
// Concept Deep-Dive (per card detail)
// ─────────────────────────────────────────
app.post('/api/concept-detail', protect, async (req, res) => {
    try {
        const { task, subject, hoursAllocated, due } = req.body;

        if (!task) return res.status(400).json({ success: false, message: 'task is required.' });

        const systemPrompt = "You are an expert teacher and academic content writer. Return ONLY a valid JSON object.";
        const prompt = `
Generate a comprehensive deep-dive study guide for the following concept:

Concept: "${task}"
${subject ? `Subject Area: ${subject}` : ''}
${hoursAllocated ? `Study Time Allocated: ${hoursAllocated} hours` : ''}
${due ? `Scheduled: ${due}` : ''}

Use this exact JSON format:
{
  "title": "Full concept title",
  "overview": "2-3 sentence high-level overview of the concept",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed explanation paragraph",
      "subsections": [
        { "subheading": "Subsection title", "content": "Detailed explanation" }
      ]
    }
  ],
  "definitions": [
    { "term": "Key term", "definition": "Clear definition" }
  ],
  "examples": [
    { "title": "Example title", "description": "Brief real-world example to illustrate the concept" }
  ],
  "solvedExamples": [
    {
      "problem": "A clearly stated problem to solve",
      "steps": [
        { "stepNumber": 1, "explanation": "What you do in this step and why" }
      ],
      "finalAnswer": "The complete answer or result",
      "takeaway": "What this example teaches about the concept"
    }
  ],
  "practiceQuestions": [
    { "question": "Sample question?", "hint": "Brief hint to approach it" }
  ],
  "relatedConcepts": [
    { "name": "Related concept name", "relevance": "Why it's related" }
  ],
  "proTip": "One expert tip for mastering this concept"
}
`;
        const llmResponse = await callGrokAPI(prompt, systemPrompt, true);
        let responseText = llmResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const detail = JSON.parse(responseText);
        return res.json({ success: true, detail });

    } catch (err) {
        console.error('❌ Concept detail error:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to fetch concept detail.' });
    }
});

app.post('/api/chat', protect, async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'message is required.' });
        }

        const systemMsg = {
            role: 'system',
            content: `You are StudySphere AI Tutor — a brilliant, concise academic assistant.
Your style:
- Use **bold** for key terms
- Use numbered lists for steps, bullet points for lists
- Use triple backticks for code blocks
- Keep replies focused and helpful
- End with a tip or follow-up question when useful`,
        };

        // Convert history from frontend format to OpenAI format
        let historyMsgs = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: Array.isArray(h.parts)
                ? h.parts.map(p => p.text || '').join('\n')
                : (h.content || ''),
        }));

        // Remove messages with empty or whitespace-only content
        historyMsgs = historyMsgs.filter(m => m.content && m.content.trim().length > 0);

        // Strip leading assistant messages — Groq requires history to start with 'user'
        while (historyMsgs.length > 0 && historyMsgs[0].role === 'assistant') {
            historyMsgs.shift();
        }

        // Merge consecutive same-role messages to prevent role alternation errors
        const deduped = [];
        for (const msg of historyMsgs) {
            if (deduped.length > 0 && deduped[deduped.length - 1].role === msg.role) {
                deduped[deduped.length - 1].content += '\n' + msg.content;
            } else {
                deduped.push({ ...msg });
            }
        }

        const messages = [systemMsg, ...deduped, { role: 'user', content: message }];

        const apiKey = process.env.GROK_API_KEY;
        if (!apiKey) throw new Error('GROK_API_KEY is missing from .env');

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 1500,
                temperature: 0.7,
            }),
        });

        const data = await groqRes.json();
        if (!groqRes.ok) throw new Error(data?.error?.message || `Groq API error ${groqRes.status}`);

        const reply = data.choices?.[0]?.message?.content?.trim() || '';
        res.json({ success: true, reply });

    } catch (err) {
        console.error('Chat Error:', err.message);
        res.status(500).json({ success: false, message: err.message || 'AI Error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is internally running at http://localhost:${PORT}`);
});
