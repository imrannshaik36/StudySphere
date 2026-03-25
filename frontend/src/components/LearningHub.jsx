import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function LearningHub() {
    const [subject, setSubject] = useState('');
    const [mode, setMode] = useState(null); // 'ai' | 'manual' | 'pdf'

    const [topicsText, setTopicsText] = useState('');
    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [sessionId, setSessionId] = useState(null);
    const [modules, setModules] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState(null);
    const [extractedTopics, setExtractedTopics] = useState([]);

    const parseTopics = (text) => {
        return String(text || '')
            .split(/[\n,;]+/g)
            .map(t => t.trim())
            .filter(Boolean);
    };

    const getColor = (idx) => {
        const colors = [
            'linear-gradient(135deg, #0ea5e9, #3b82f6)',
            'linear-gradient(135deg, #8b5cf6, #d946ef)',
            'linear-gradient(135deg, #10b981, #059669)'
        ];
        return colors[idx % colors.length];
    };

    const selectedModule = modules.find(m => m.id === selectedModuleId) || null;

    const generateModules = async () => {
        setError(null);
        setLoading(true);

        try {
            const safeSubject = String(subject || '').trim();
            if (!safeSubject) {
                setError('Please enter a subject/topic first.');
                return;
            }

            if (mode === 'ai') {
                const res = await fetch(`${API_BASE_URL}/api/learning-hub/generate/ai`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject: safeSubject })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || 'AI generation failed.');

                setSessionId(data.sessionId);
                setModules(data.modules || []);
                setSelectedModuleId(null);
                setExtractedTopics([]);
                return;
            }

            if (mode === 'manual') {
                const topics = parseTopics(topicsText);
                if (topics.length === 0) {
                    setError('Please enter at least 1 topic (one per line is fine).');
                    return;
                }

                const res = await fetch(`${API_BASE_URL}/api/learning-hub/generate/manual`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject: safeSubject, topics })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || 'Manual generation failed.');

                setSessionId(data.sessionId);
                setModules(data.modules || []);
                setSelectedModuleId(null);
                setExtractedTopics([]);
                return;
            }

            if (mode === 'pdf') {
                if (!file) {
                    setError('Please upload a PDF file first.');
                    return;
                }

                const formData = new FormData();
                formData.append('subject', safeSubject);
                formData.append('file', file);

                const res = await fetch(`${API_BASE_URL}/api/learning-hub/generate/pdf`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || 'PDF generation failed.');

                setSessionId(data.sessionId);
                setModules(data.modules || []);
                setSelectedModuleId(null);
                setExtractedTopics(data.extractedTopics || []);
                return;
            }

            setError('Pick one option (AI Roadmap / Manual / PDF).');
        } catch (e) {
            setError(e?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const updateProgress = async (moduleId, nextProgressNum) => {
        if (!sessionId) return;

        try {
            const clamped = Math.max(0, Math.min(100, Math.round(nextProgressNum)));
            const res = await fetch(`${API_BASE_URL}/api/learning-hub/sessions/${sessionId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId, progressNum: clamped })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Failed to update progress.');
            setModules(data.modules || []);
        } catch {
            // For MVP: keep UI resilient; next refresh will recover from backend.
        }
    };

    return (
        <div className="module-page" style={{ animation: 'fadeIn 0.5s ease', maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.8rem', marginBottom: '8px', fontWeight: 800, color: 'var(--text-primary)' }}>Learning Hub</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '28px' }}>
                Enter what you want to learn, pick a preparation method, and we will generate your study modules instantly.
            </p>

            {error ? (
                <div style={{ padding: '16px 20px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.35)', borderRadius: '14px', color: 'var(--accent-danger)', marginBottom: '18px' }}>
                    {error}
                </div>
            ) : null}

            {!sessionId ? (
                <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', boxShadow: 'var(--shadow-card)' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '18px' }}>
                        <div style={{ flex: '1 1 320px' }}>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '8px' }}>Subject / Topic</label>
                            <input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder='e.g. Data Structures, DBMS, Sliding Window...'
                                style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none', fontSize: '1.05rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <button
                            onClick={() => setMode('ai')}
                            style={{ padding: '12px 16px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', border: mode === 'ai' ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: mode === 'ai' ? 'rgba(99,102,241,0.12)' : 'var(--bg-base)', color: 'var(--text-primary)' }}
                        >
                            AI Roadmap
                        </button>
                        <button
                            onClick={() => setMode('manual')}
                            style={{ padding: '12px 16px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', border: mode === 'manual' ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: mode === 'manual' ? 'rgba(99,102,241,0.12)' : 'var(--bg-base)', color: 'var(--text-primary)' }}
                        >
                            Manual Topic Entry
                        </button>
                        <button
                            onClick={() => setMode('pdf')}
                            style={{ padding: '12px 16px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', border: mode === 'pdf' ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: mode === 'pdf' ? 'rgba(99,102,241,0.12)' : 'var(--bg-base)', color: 'var(--text-primary)' }}
                        >
                            PDF Textbook Upload
                        </button>
                    </div>

                    {mode === 'ai' ? (
                        <div style={{ padding: '18px 0' }}>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '12px' }}>
                                Type a subject/topic. We will generate modules in an industry-standard learning order.
                            </p>
                        </div>
                    ) : null}

                    {mode === 'manual' ? (
                        <div style={{ padding: '18px 0' }}>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '10px' }}>
                                Topics (one per line)
                            </label>
                            <textarea
                                value={topicsText}
                                onChange={(e) => setTopicsText(e.target.value)}
                                placeholder={`e.g.\nIntroduction to ${subject || 'your topic'}\nCore concept 1\nCore concept 2\nCommon mistakes`}
                                style={{ width: '100%', minHeight: '160px', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none', fontSize: '1.05rem', resize: 'vertical' }}
                            />
                        </div>
                    ) : null}

                    {mode === 'pdf' ? (
                        <div style={{ padding: '18px 0' }}>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '10px' }}>
                                Upload your PDF (or a text file for MVP)
                            </label>
                            <input
                                type="file"
                                accept="application/pdf,text/plain"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                style={{ width: '100%', padding: '12px 0' }}
                            />
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px', alignItems: 'center' }}>
                        <button
                            disabled={loading}
                            onClick={generateModules}
                            style={{ padding: '14px 22px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1 }}
                        >
                            {loading ? 'Generating...' : 'Generate Modules'}
                        </button>
                        {mode === 'pdf' && file ? (
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Selected: {file.name}</span>
                        ) : null}
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: '18px', padding: '18px 20px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '6px' }}>{subject}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                                    {modules.length} modules ready. Update progress as you study.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSessionId(null);
                                    setModules([]);
                                    setSelectedModuleId(null);
                                    setExtractedTopics([]);
                                    setMode(null);
                                    setTopicsText('');
                                    setFile(null);
                                }}
                                style={{ padding: '12px 16px', background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}
                            >
                                New Session
                            </button>
                        </div>

                        {extractedTopics.length ? (
                            <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                Extracted topics: {extractedTopics.join(', ')}
                            </div>
                        ) : null}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        {modules.map((mod, index) => {
                            const isSelected = mod.id === selectedModuleId;
                            const progressNum = Number(mod.progressNum ?? 0);
                            const progressLabel = `${progressNum}%`;

                            return (
                                <div
                                    key={mod.id}
                                    onClick={() => setSelectedModuleId(mod.id)}
                                    style={{
                                        background: 'var(--bg-surface)',
                                        borderRadius: '20px',
                                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                        boxShadow: 'var(--shadow-card)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                                    }}
                                >
                                    <div style={{ height: '140px', background: getColor(index), display: 'flex', alignItems: 'flex-end', padding: '20px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: '#fff', padding: '6px 14px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            Module {mod.id}
                                        </div>
                                    </div>

                                    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>{mod.title}</h3>

                                        <div style={{ marginTop: 'auto' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 700 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                                                <span style={{ color: 'var(--accent-primary)' }}>{progressLabel}</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: 'var(--bg-hover)', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ width: progressLabel, height: '100%', background: 'var(--accent-primary)', borderRadius: '99px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '28px' }}>
                        {selectedModule ? (
                            <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>{selectedModule.title}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                                            Progress: <span style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>{selectedModule.progressNum}%</span>
                                            <span style={{ marginLeft: '10px' }}>Estimated: {selectedModule.estimatedHours}h</span>
                                        </p>
                                    </div>

                                    <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '10px 16px', borderRadius: '16px', fontWeight: 900 }}>
                                        Continue
                                    </div>
                                </div>

                                <div style={{ width: '100%', height: '10px', background: 'var(--bg-hover)', borderRadius: '99px', overflow: 'hidden', marginBottom: '18px' }}>
                                    <div style={{ width: `${selectedModule.progressNum}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '99px' }} />
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>Topics</div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {(selectedModule.topics || []).map((t, i) => (
                                            <span key={`${t}_${i}`} style={{ padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '999px', color: 'var(--text-secondary)', fontWeight: 800 }}>
                                                {t}
                                            </span>
                                        ))}
                                        {(selectedModule.topics || []).length === 0 ? (
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>No topics yet.</span>
                                        ) : null}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>Dependencies</div>
                                    <div style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>
                                        {(selectedModule.dependencies || []).length
                                            ? `Depends on module(s): ${selectedModule.dependencies.join(', ')}`
                                            : 'No prerequisites.'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => updateProgress(selectedModule.id, selectedModule.progressNum + 10)}
                                        style={{ padding: '12px 18px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                                    >
                                        Mark +10%
                                    </button>
                                    <button
                                        onClick={() => updateProgress(selectedModule.id, 100)}
                                        style={{ padding: '12px 18px', background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                                    >
                                        Complete
                                    </button>
                                    <button
                                        onClick={() => updateProgress(selectedModule.id, 0)}
                                        style={{ padding: '12px 18px', background: 'transparent', color: 'var(--accent-danger)', border: '1px solid rgba(236,72,153,0.35)', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '24px', color: 'var(--text-muted)', fontWeight: 800 }}>
                                Select a module to view topics and update progress.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
