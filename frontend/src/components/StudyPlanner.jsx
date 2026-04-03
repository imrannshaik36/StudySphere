import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { API_BASE_URL as API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────
// Concept Detail Modal (Existing Feature + UI Polish)
// ─────────────────────────────────────────────────────────
function ConceptModal({ task, subject, onClose, token }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const [elapsed, setElapsed] = useState(0);
    const [timerOn, setTimerOn] = useState(true);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (timerOn) {
            intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [timerOn]);

    useEffect(() => () => clearInterval(intervalRef.current), []);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/concept-detail`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ task: task.task, subject, hoursAllocated: task.hoursAllocated, due: task.due }),
                });
                const data = await res.json();
                if (data.success && data.detail) setDetail(data.detail);
                else setError(data.message || 'Failed to load concept details.');
            } catch {
                setError('Error connecting to backend.');
            } finally {
                setLoading(false);
            }
        };
        fetch_();
    }, [task, subject]);

    const buildShareText = useCallback(() => {
        if (!detail) return '';
        const lines = [`# ${detail.title}`, `\n## Overview\n${detail.overview}`];
        detail.sections?.forEach(s => {
            lines.push(`\n## ${s.heading}\n${s.content}`);
            s.subsections?.forEach(sub => lines.push(`\n### ${sub.subheading}\n${sub.content}`));
        });
        if (detail.definitions?.length) {
            lines.push('\n## Key Definitions');
            detail.definitions.forEach(d => lines.push(`**${d.term}**: ${d.definition}`));
        }
        if (detail.examples?.length) {
            lines.push('\n## Examples');
            detail.examples.forEach(e => lines.push(`**${e.title}**\n${e.description}`));
        }
        if (detail.solvedExamples?.length) {
            lines.push('\n## Solved Examples');
            detail.solvedExamples.forEach((ex, i) => {
                lines.push(`\n### Solved Example ${i + 1}: ${ex.problem}`);
                ex.steps?.forEach(st => lines.push(`Step ${st.stepNumber}: ${st.explanation}`));
                lines.push(`Answer: ${ex.finalAnswer}`);
                lines.push(`Takeaway: ${ex.takeaway}`);
            });
        }
        if (detail.practiceQuestions?.length) {
            lines.push('\n## Practice Questions');
            detail.practiceQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q.question}\n   Hint: ${q.hint}`));
        }
        if (detail.proTip) lines.push(`\n## Pro Tip\n${detail.proTip}`);
        return lines.join('\n');
    }, [detail]);

    const handleShare = async () => {
        const text = buildShareText();
        try { await navigator.clipboard.writeText(text); }
        catch {
            const el = document.createElement('textarea');
            el.value = text; document.body.appendChild(el); el.select();
            document.execCommand('copy'); document.body.removeChild(el);
        }
        setCopied(true); setTimeout(() => setCopied(false), 2500);
    };

    const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

    const allocated = (task.hoursAllocated || 0) * 3600;
    const timerPct = allocated > 0 ? elapsed / allocated : 0;
    const timerColor = timerPct < 0.5 ? '#22c55e' : timerPct < 1 ? '#f59e0b' : '#ef4444';

    return (
        <div onClick={handleBackdrop} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-surface)', borderRadius: '24px 24px 0 0' }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Deep Dive</span>
                        <h2 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{task.task}</h2>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <span style={badgeStyle}>⏱ {task.hoursAllocated}h Target</span>
                            <span style={{ ...badgeStyle, color: timerColor }}>🕒 {formatTime(elapsed)} Session</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleShare} style={{ ...actionBtn, background: 'var(--accent-primary)', color: '#fff' }}>{copied ? 'Copied!' : 'Share'}</button>
                        <button onClick={onClose} style={actionBtn}>✕</button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '32px', flex: 1 }}>
                    {loading ? <LoadingSkeleton /> : detail && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <Section icon="💡" title="Core Overview"><p style={bodyText}>{detail.overview}</p></Section>
                            {detail.sections?.map((s, i) => (
                                <Section key={i} icon="📌" title={s.heading}>
                                    <p style={bodyText}>{s.content}</p>
                                    {s.subsections?.map((sub, j) => (
                                        <div key={j} style={{ marginLeft: '20px', borderLeft: '2px solid var(--border)', paddingLeft: '15px', marginTop: '10px' }}>
                                            <h4 style={{ margin: '0 0 5px' }}>{sub.subheading}</h4>
                                            <p style={bodyText}>{sub.content}</p>
                                        </div>
                                    ))}
                                </Section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// UI Fragments
// ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="skeleton-pulse" style={{ height: '20px', width: '60%', background: 'var(--bg-base)', margin: '10px auto', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '100px', width: '100%', background: 'var(--bg-base)', margin: '20px 0', borderRadius: '12px' }} />
            <p style={{ color: 'var(--text-muted)' }}>Synthesizing knowledge...</p>
        </div>
    );
}

function Section({ icon, title, children }) {
    return (
        <div style={{ animation: 'slideUp 0.4s ease forwards' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', marginBottom: '15px' }}>
                <span>{icon}</span> {title}
            </h3>
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Save Subject Modal
// ─────────────────────────────────────────────────────────
function SaveSubjectModal({ tasks, defaultName, onSave, onClose }) {
    const [name, setName] = useState(defaultName || '');
    return (
        <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '480px', border: '1px solid var(--border)' }}>
                <h2 style={{ marginTop: 0 }}>Save Roadmap</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Enter a name to save this curriculum to your permanent dashboard.</p>
                <input 
                    style={{ ...inputStyle, width: '100%', margin: '20px 0' }} 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Subject Name..."
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} style={{ ...actionBtn, flex: 1 }}>Cancel</button>
                    <button onClick={() => { onSave({ name, tasks }); onClose(); }} style={{ ...actionBtn, flex: 1, background: 'var(--accent-primary)', color: '#fff' }}>Save Subject</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Main StudyPlanner Component
// ─────────────────────────────────────────────────────────
export default function StudyPlanner({ onSaveSubject, selectedSubject }) {
    const { user } = useAuth();
    // ── State ──
    const [tasks, setTasks] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [openTask, setOpenTask] = useState(null);
    const [showSave, setShowSave] = useState(false);
    const [savedBanner, setSavedBanner] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'done'

    // Form States
    const [subject, setSubject] = useState('');
    const [days, setDays] = useState('');
    const [hours, setHours] = useState('');
    const [file, setFile] = useState(null);
    const [generatorMessage, setGeneratorMessage] = useState('');
    const [roadmapGenerated, setRoadmapGenerated] = useState(false);

    // ── Load Logic ──
    useEffect(() => {
        if (selectedSubject) {
            setTasks(selectedSubject.tasks || []);
            setSubject(selectedSubject.name);
            setRoadmapGenerated(true);
            setLoading(false);
        } else {
            // When opened without a selected goal, reset to empty slate
            setTasks([]);
            setSubject('');
            setRoadmapGenerated(false);
            setLoading(false);
        }
    }, [selectedSubject]);

    const [connectingHub, setConnectingHub] = useState(false);

    const handleConnectToHub = async () => {
        setConnectingHub(true);
        try {
            const mainHubSubject = subject || 'Study Goal';
            const topics = tasks.map(t => t.task);

            const storageKey = 'studysphere_learninghub_subjects_v1';
            let hubSubjects = [];
            try { hubSubjects = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}

            let existingSubj = hubSubjects.find(s => s.name === mainHubSubject);
            if (!existingSubj) {
                existingSubj = { name: mainHubSubject, sessionId: null };
                hubSubjects.push(existingSubj);
            }
            localStorage.setItem(storageKey, JSON.stringify(hubSubjects));

            const res = await fetch(`${API_BASE}/api/learning-hub/generate/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                body: JSON.stringify({ subject: mainHubSubject, topics })
            });
            const data = await res.json();
            
            if (data.success && data.sessionId) {
                let hbs = JSON.parse(localStorage.getItem(storageKey) || '[]');
                const idx = hbs.findIndex(s => s.name === mainHubSubject);
                if (idx !== -1) {
                    hbs[idx].sessionId = data.sessionId;
                    localStorage.setItem(storageKey, JSON.stringify(hbs));
                }
                alert("Successfully connected to Learning Hub! Head there to view your adaptive curriculum.");
            } else {
                throw new Error(data.message || 'Failed to generate curriculum.');
            }
        } catch (e) {
            console.error(e);
            alert("Connection failed.");
        } finally {
            setConnectingHub(false);
        }
    };


    // ── Handlers ──
    const handleGenerateAI = async (e) => {
        e.preventDefault();
        if (!days || !hours) return setGeneratorMessage('⚠️ Fill in constraints.');
        setGenerating(true);
        setGeneratorMessage('🧠 AI is architecting your roadmap...');
        
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('days', days);
        formData.append('hoursPerDay', hours);
        if (file) formData.append('document', file);

        try {
            const res = await fetch(`${API_BASE}/api/generate-plan`, { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${user?.token}` },
                body: formData 
            });
            const data = await res.json();
            if (data.success) {
                setTasks(data.tasks.map(t => ({ ...t, completed: false })));
                setRoadmapGenerated(true);
                setGeneratorMessage('');
            }
        } catch (err) {
            setGeneratorMessage('❌ Connection error.');
        } finally {
            setGenerating(false);
        }
    };

    const toggleTask = (index) => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
    };

    const deleteTask = (index) => {
        setTasks(tasks.filter((_, i) => i !== index));
    };

    // ── Computed ──
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.task.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'all' 
                ? true 
                : activeTab === 'done' ? t.completed : !t.completed;
            return matchesSearch && matchesTab;
        });
    }, [tasks, searchQuery, activeTab]);

    const progress = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;
    const totalHours = tasks.reduce((acc, curr) => acc + (curr.hoursAllocated || 0), 0);
    const completedHours = tasks.filter(t => t.completed).reduce((acc, curr) => acc + (curr.hoursAllocated || 0), 0);

    return (
        <div className="study-planner-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            
            {/* Modals */}
            {openTask && <ConceptModal task={openTask} subject={subject} onClose={() => setOpenTask(null)} token={user?.token} />}
            {showSave && <SaveSubjectModal tasks={tasks} defaultName={subject} onClose={() => setShowSave(false)} onSave={onSaveSubject} />}

            {/* Header Area */}
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '10px' }}>
                        {selectedSubject ? selectedSubject.name : "Study Architect"}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        Transforming syllabus data into high-performance learning roadmaps.
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{progress}%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Course Completion</div>
                </div>
            </header>

            {/* Global Progress Bar */}
            <div style={{ height: '10px', background: 'var(--bg-base)', borderRadius: '20px', marginBottom: '40px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-primary)', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: roadmapGenerated ? '1fr 320px' : '1fr', gap: '30px' }}>
                
                {/* Main Content Side */}
                <section>
                    {!roadmapGenerated ? (
                        <div className="glass-panel" style={{ padding: '40px', borderRadius: '30px', border: '1px solid var(--border)' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
                                <span style={{ fontSize: '2rem' }}>⚡</span> Instant Curriculum Generator
                            </h2>
                            <form onSubmit={handleGenerateAI} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="input-group">
                                        <label style={labelStyle}>Subject / Topic</label>
                                        <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Quantum Mechanics" />
                                    </div>
                                    <div className="input-group">
                                        <label style={labelStyle}>Timeline (Days)</label>
                                        <input type="number" style={inputStyle} value={days} onChange={e => setDays(e.target.value)} placeholder="14" />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label style={labelStyle}>Daily Bandwidth (Hours)</label>
                                    <input type="number" style={inputStyle} value={hours} onChange={e => setHours(e.target.value)} placeholder="4" />
                                </div>
                                <div className="input-group">
                                    <label style={labelStyle}>Upload Reference (PDF/Text)</label>
                                    <input type="file" style={{ ...inputStyle, padding: '10px' }} onChange={e => setFile(e.target.files[0])} />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={generating}
                                    style={{ ...actionBtn, background: 'var(--accent-primary)', color: '#fff', padding: '20px', fontSize: '1.1rem', marginTop: '10px' }}
                                >
                                    {generating ? "✨ Processing..." : "🚀 Generate My Roadmap"}
                                </button>
                                {generatorMessage && <p style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 700 }}>{generatorMessage}</p>}
                            </form>
                        </div>
                    ) : (
                        <div className="roadmap-workspace">
                            {/* Toolbar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setViewMode('list')} style={{ ...tabBtn, borderBottom: viewMode === 'list' ? '2px solid var(--accent-primary)' : 'none' }}>List View</button>
                                    <button onClick={() => setViewMode('kanban')} style={{ ...tabBtn, borderBottom: viewMode === 'kanban' ? '2px solid var(--accent-primary)' : 'none' }}>Kanban Board</button>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <input 
                                        style={{ ...inputStyle, padding: '8px 15px', fontSize: '0.9rem' }} 
                                        placeholder="Search tasks..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    <button onClick={handleConnectToHub} disabled={connectingHub || tasks.length === 0} style={{ ...actionBtn, background: '#10b981', color: '#fff' }}>
                                        {connectingHub ? '🧠 Connecting...' : '🧠 Connect to Hub'}
                                    </button>
                                    <button onClick={() => setShowSave(true)} style={{ ...actionBtn, background: 'var(--accent-primary)', color: '#fff' }}>💾 Save</button>
                                </div>
                            </div>

                            {/* View Content */}
                            {viewMode === 'list' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {filteredTasks.map((t, i) => (
                                        <div key={i} className="task-card" style={{ 
                                            padding: '20px', 
                                            background: 'var(--bg-surface)', 
                                            borderRadius: '18px', 
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '20px',
                                            transition: 'all 0.3s ease',
                                            opacity: t.completed ? 0.6 : 1,
                                            transform: t.completed ? 'scale(0.98)' : 'scale(1)'
                                        }}>
                                            <div 
                                                onClick={() => toggleTask(i)} 
                                                style={{ 
                                                    width: '28px', height: '28px', 
                                                    borderRadius: '8px', 
                                                    border: '2px solid var(--accent-primary)',
                                                    background: t.completed ? 'var(--accent-primary)' : 'transparent',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                                                }}
                                            >
                                                {t.completed && "✓"}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: 0, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.task}</h4>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                                    Target: {t.due} • {t.hoursAllocated} Hours
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => setOpenTask(t)} style={{ ...actionBtn, padding: '8px 15px', background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>📖 Open</button>
                                                <button onClick={() => deleteTask(i)} style={{ ...actionBtn, padding: '8px 12px' }}>🗑</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <KanbanCol title="In Progress" tasks={tasks.filter(t => !t.completed)} onOpen={setOpenTask} />
                                    <KanbanCol title="Completed" tasks={tasks.filter(t => t.completed)} onOpen={setOpenTask} />
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Sidebar Analytics Side */}
                {roadmapGenerated && (
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-panel" style={{ padding: '25px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginTop: 0 }}>Efficiency Score</h3>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{completedHours} / {totalHours} Hours</div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You have processed {Math.round((completedHours/totalHours)*100)}% of your total study volume.</p>
                            <div style={{ height: '6px', width: '100%', background: 'var(--bg-base)', borderRadius: '10px', marginTop: '15px' }}>
                                <div style={{ height: '100%', width: `${(completedHours/totalHours)*100}%`, background: '#10b981', borderRadius: '10px' }} />
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '25px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginTop: 0 }}>Timeline Tips</h3>
                            <ul style={{ paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                <li>Focus on high-hour concepts first.</li>
                                <li>Use the Deep Dive feature for complex cards.</li>
                                <li>The AI predicts you'll finish in {days} days at your current pace.</li>
                            </ul>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}

// ── Secondary Components ──

function KanbanCol({ title, tasks, onOpen }) {
    return (
        <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: '20px', minHeight: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title} ({tasks.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {tasks.map((t, i) => (
                    <div key={i} style={{ padding: '15px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.task}</div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>⏱ {t.hoursAllocated}h</span>
                            <button onClick={() => onOpen(t)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>DETAILS →</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Styles ──
const badgeStyle = { 
    background: 'var(--bg-base)', 
    padding: '6px 14px', 
    borderRadius: '10px', 
    fontSize: '0.85rem', 
    fontWeight: 700, 
    color: 'var(--text-secondary)', 
    border: '1px solid var(--border)' 
};

const actionBtn = { 
    padding: '10px 20px', 
    borderRadius: '12px', 
    border: 'none', 
    fontWeight: 700, 
    cursor: 'pointer', 
    transition: 'all 0.2s ease', 
    background: 'var(--bg-base)', 
    color: 'var(--text-primary)' 
};

const inputStyle = { 
    padding: '15px', 
    borderRadius: '12px', 
    border: '1px solid var(--border)', 
    background: 'var(--bg-base)', 
    color: 'var(--text-primary)', 
    outline: 'none', 
    width: '100%' 
};

const labelStyle = { 
    fontSize: '0.9rem', 
    fontWeight: 700, 
    color: 'var(--text-secondary)', 
    marginBottom: '8px', 
    display: 'block' 
};

const tabBtn = { 
    background: 'none', 
    border: 'none', 
    padding: '10px 15px', 
    cursor: 'pointer', 
    fontWeight: 700, 
    color: 'var(--text-secondary)' 
};

const bodyText = { 
    color: 'var(--text-secondary)', 
    lineHeight: '1.8', 
    fontSize: '1rem' 
};
