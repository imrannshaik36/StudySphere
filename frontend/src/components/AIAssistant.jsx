import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

/* ── Helpers ── */
const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const genId   = () => Math.random().toString(36).slice(2, 9);

const WELCOME = "Hello! I'm your AI assistant. I can help you understand concepts, write and debug code, analyze uploaded files, or just have a conversation. What can I help you with today?";

// ─────────────────────────────────────────────────────────────────────────────
// callGrok — sends message + history to /api/chat (server.js)
//
// History format server.js expects: { role: 'user'|'model', parts: [{ text }] }
// We keep internal messages as { role: 'user'|'ai', text } and convert here.
//
// KEY FIXES vs original:
//  1. Filter out the AI welcome message (role=ai, no preceding user msg) so
//     history never starts with 'model' → avoids xAI 400 "first msg must be user"
//  2. Filter out any message whose text is empty/whitespace → avoids xAI 400
//  3. Merge consecutive same-role entries (extra safety)
// ─────────────────────────────────────────────────────────────────────────────
async function callGrok(sessionMessages, currentApiContent, signal, token) {
    // Build history from everything except the current (last) user message.
    // sessionMessages here = all messages stored in the session so far
    // (before the new user message was appended to UI).

    // Convert to server format, skipping empty texts
    let history = sessionMessages
        .filter(m => m.role === 'user' || m.role === 'ai')
        .map(m => ({
            role:  m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: (m.text || '').trim() }],
        }))
        .filter(m => m.parts[0].text.length > 0); // drop empty

    // Strip leading 'model' entries — xAI requires history to start with 'user'
    while (history.length > 0 && history[0].role === 'model') history.shift();

    // Merge consecutive same-role messages
    const deduped = [];
    for (const m of history) {
        if (deduped.length > 0 && deduped[deduped.length - 1].role === m.role) {
            deduped[deduped.length - 1].parts[0].text += '\n' + m.parts[0].text;
        } else {
            deduped.push({ role: m.role, parts: [{ text: m.parts[0].text }] });
        }
    }

    // Build plain-text version of the current user message
    let messageText = '';
    if (Array.isArray(currentApiContent)) {
        currentApiContent.forEach(b => {
            if (b.type === 'text')     messageText += b.text;
            if (b.type === 'image')    messageText += '\n[User attached an image]';
            if (b.type === 'document') messageText += '\n[PDF attached]';
        });
    } else {
        messageText = currentApiContent || '';
    }
    messageText = messageText.trim();

    const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        signal,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: messageText, history: deduped }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Server error ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Unknown error from server');
    return data.reply || "I couldn't generate a response.";
}

/* ── File → base64 ── */
const toBase64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
});

const SUPPORTED_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_DOCS   = ['application/pdf'];

/* ══════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════ */
export default function App() {
    const { user } = useAuth();
    const [sessions, setSessions]       = useState(() => {
        const id = genId();
        return [{ id, title: 'New Chat', messages: [{ role: 'ai', text: WELCOME, time: getTime() }], created: Date.now(), bookmarked: false }];
    });
    const [activeId, setActiveId]       = useState(null);
    const [input, setInput]             = useState('');
    const [busy, setBusy]               = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [editingId, setEditingId]     = useState(null);
    const [editTitle, setEditTitle]     = useState('');
    const [sidebarTab, setSidebarTab]   = useState('all'); // 'all' | 'bookmarked'
    const abortRef                      = useRef(null);
    const chatEndRef                    = useRef(null);
    const textareaRef                   = useRef(null);
    const fileInputRef                  = useRef(null);

    const activeSession = sessions.find(s => s.id === (activeId ?? sessions[0]?.id)) ?? sessions[0];
    const currentId     = activeSession?.id;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeSession?.messages, busy]);

    /* ── Session ops ── */
    const newChat = () => {
        const id = genId();
        setSessions(prev => [{ id, title: 'New Chat', messages: [{ role: 'ai', text: WELCOME, time: getTime() }], created: Date.now(), bookmarked: false }, ...prev]);
        setActiveId(id);
        setInput('');
        setAttachments([]);
    };

    const deleteSession = (id, e) => {
        e.stopPropagation();
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            if (next.length === 0) {
                const nid = genId();
                return [{ id: nid, title: 'New Chat', messages: [{ role: 'ai', text: WELCOME, time: getTime() }], created: Date.now(), bookmarked: false }];
            }
            return next;
        });
        if (currentId === id) setActiveId(null);
    };

    const startRename = (s, e) => {
        e.stopPropagation();
        setEditingId(s.id);
        setEditTitle(s.title);
    };

    const commitRename = (id) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle.trim() || s.title } : s));
        setEditingId(null);
    };

    const toggleBookmark = (id, e) => {
        e.stopPropagation();
        setSessions(prev => prev.map(s => s.id === id ? { ...s, bookmarked: !s.bookmarked } : s));
    };

    /* ── File handling ── */
    const handleFiles = async (files) => {
        const newAttach = [];
        for (const file of files) {
            if (SUPPORTED_IMAGES.includes(file.type)) {
                const b64 = await toBase64(file);
                newAttach.push({ type: 'image', name: file.name, mediaType: file.type, data: b64, id: genId() });
            } else if (SUPPORTED_DOCS.includes(file.type)) {
                const b64 = await toBase64(file);
                newAttach.push({ type: 'pdf', name: file.name, data: b64, id: genId() });
            } else {
                const text = await file.text();
                newAttach.push({ type: 'text', name: file.name, content: text, id: genId() });
            }
        }
        setAttachments(prev => [...prev, ...newAttach]);
    };

    const onFileChange = (e) => { handleFiles(Array.from(e.target.files)); e.target.value = ''; };

    const onDrop = (e) => {
        e.preventDefault();
        handleFiles(Array.from(e.dataTransfer.files));
    };

    /* ── Send ── */
    const handleSend = async () => {
        const text = input.trim();
        if ((!text && attachments.length === 0) || busy) return;

        // Build display message
        const userMsg = { role: 'user', text: text || '(file attached)', time: getTime(), attachments: [...attachments] };

        // Build API content array
        const apiContent = [];
        for (const a of attachments) {
            if (a.type === 'image') {
                apiContent.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } });
            } else if (a.type === 'pdf') {
                apiContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data } });
            } else {
                apiContent.push({ type: 'text', text: `[File: ${a.name}]\n${a.content}` });
            }
        }
        if (text) apiContent.push({ type: 'text', text });

        // Snapshot history BEFORE appending userMsg (used for API call)
        const historySnapshot = activeSession.messages;

        // Append user message to UI immediately
        setSessions(prev => prev.map(s => s.id === currentId
            ? {
                ...s,
                title: s.title === 'New Chat' && text ? text.slice(0, 32) + (text.length > 32 ? '…' : '') : s.title,
                messages: [...s.messages, userMsg],
            }
            : s));

        setInput('');
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = '24px';
        setBusy(true);

        abortRef.current = new AbortController();
        try {
            // Pass history snapshot (without the new user msg) + the current API content
            const reply = await callGrok(historySnapshot, apiContent, abortRef.current.signal, user?.token);
            setSessions(prev => prev.map(s => s.id === currentId
                ? { ...s, messages: [...s.messages, { role: 'ai', text: reply, time: getTime() }] }
                : s));
        } catch (err) {
            if (err.name !== 'AbortError') {
                setSessions(prev => prev.map(s => s.id === currentId
                    ? { ...s, messages: [...s.messages, { role: 'ai', text: `⚠️ **Error:** ${err.message}`, time: getTime(), isError: true }] }
                    : s));
            }
        } finally {
            setBusy(false);
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
        setBusy(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleTextareaInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = '24px';
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
    };

    /* Group sessions by date */
    const now               = Date.now();
    const visibleSessions   = sidebarTab === 'bookmarked' ? sessions.filter(s => s.bookmarked) : sessions;
    const todaySessions     = visibleSessions.filter(s => now - s.created < 86400000);
    const yesterdaySessions = visibleSessions.filter(s => now - s.created >= 86400000 && now - s.created < 172800000);
    const olderSessions     = visibleSessions.filter(s => now - s.created >= 172800000);

    return (
        <>
            <style>{CSS}</style>
            <div className="app" onDrop={onDrop} onDragOver={e => e.preventDefault()}>

                {/* ── SIDEBAR ── */}
                <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
                    <div className="sidebar-top">
                        <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
                            <SidebarIcon />
                        </button>
                        <button className="new-chat-btn" onClick={newChat} title="New chat">
                            <EditIcon />
                        </button>
                    </div>

                    {/* Sidebar tab switcher */}
                    <div className="sidebar-tabs">
                        <button className={`sidebar-tab ${sidebarTab === 'all' ? 'sidebar-tab--active' : ''}`} onClick={() => setSidebarTab('all')}>All</button>
                        <button className={`sidebar-tab ${sidebarTab === 'bookmarked' ? 'sidebar-tab--active' : ''}`} onClick={() => setSidebarTab('bookmarked')}>
                            <BookmarkIcon filled /> Saved
                        </button>
                    </div>

                    <div className="sidebar-scroll">
                        {sidebarTab === 'bookmarked' && visibleSessions.length === 0 && (
                            <p className="sidebar-empty">No bookmarked chats yet.<br />Click 🔖 on any chat to save it.</p>
                        )}
                        <SessionGroup label="Today"     list={todaySessions}     currentId={currentId} setActiveId={setActiveId} deleteSession={deleteSession} startRename={startRename} editingId={editingId} editTitle={editTitle} setEditTitle={setEditTitle} commitRename={commitRename} toggleBookmark={toggleBookmark} />
                        <SessionGroup label="Yesterday" list={yesterdaySessions} currentId={currentId} setActiveId={setActiveId} deleteSession={deleteSession} startRename={startRename} editingId={editingId} editTitle={editTitle} setEditTitle={setEditTitle} commitRename={commitRename} toggleBookmark={toggleBookmark} />
                        <SessionGroup label="Older"     list={olderSessions}     currentId={currentId} setActiveId={setActiveId} deleteSession={deleteSession} startRename={startRename} editingId={editingId} editTitle={editTitle} setEditTitle={setEditTitle} commitRename={commitRename} toggleBookmark={toggleBookmark} />
                    </div>

                    <div className="sidebar-footer">
                        <div className="sidebar-user">
                            <div className="user-avatar">A</div>
                            <span className="user-name">StudySphere</span>
                        </div>
                    </div>
                </aside>

                {/* ── MAIN ── */}
                <main className="main">
                    {/* top bar */}
                    <div className="topbar">
                        {!sidebarOpen && (
                            <button className="sidebar-toggle topbar-toggle" onClick={() => setSidebarOpen(true)}>
                                <SidebarIcon />
                            </button>
                        )}
                        <span className="topbar-title">
                            {activeSession?.title || 'New Chat'}
                        </span>
                    </div>

                    {/* messages */}
                    <div className="messages-area">
                        {activeSession?.messages.map((msg, i) => (
                            <MessageRow key={i} msg={msg} isLast={i === activeSession.messages.length - 1} />
                        ))}
                        {busy && <ThinkingRow />}
                        <div ref={chatEndRef} />
                    </div>

                    {/* ── INPUT ── */}
                    <div className="input-zone">
                        {/* attachment preview */}
                        {attachments.length > 0 && (
                            <div className="attach-row">
                                {attachments.map(a => (
                                    <div key={a.id} className="attach-pill">
                                        <span className="attach-icon">{a.type === 'image' ? '🖼' : a.type === 'pdf' ? '📄' : '📝'}</span>
                                        <span className="attach-name">{a.name}</span>
                                        <button className="attach-remove" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="input-box">
                            <button className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
                                <AttachIcon />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                accept="image/*,.pdf,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.html,.css,.json,.md,.csv"
                                onChange={onFileChange}
                            />

                            <textarea
                                ref={textareaRef}
                                className="input-textarea"
                                value={input}
                                onChange={handleTextareaInput}
                                onKeyDown={handleKeyDown}
                                placeholder="Message AI..."
                                disabled={busy}
                                rows={1}
                            />

                            <button
                                className={`send-btn ${(!input.trim() && attachments.length === 0) ? 'send-btn--disabled' : ''}`}
                                onClick={busy ? handleStop : handleSend}
                                disabled={!busy && !input.trim() && attachments.length === 0}
                                title={busy ? 'Stop' : 'Send'}
                            >
                                {busy ? <StopIcon /> : <UpIcon />}
                            </button>
                        </div>
                        <p className="input-hint">AI can make mistakes. Consider checking important information.</p>
                    </div>
                </main>
            </div>
        </>
    );
}

/* ── Session Group ── */
function SessionGroup({ label, list, currentId, setActiveId, deleteSession, startRename, editingId, editTitle, setEditTitle, commitRename, toggleBookmark }) {
    if (!list.length) return null;
    return (
        <div className="session-group">
            <p className="session-group-label">{label}</p>
            {list.map(s => (
                <div
                    key={s.id}
                    className={`session-item ${s.id === currentId ? 'session-item--active' : ''}`}
                    onClick={() => setActiveId(s.id)}
                >
                    <ChatBubbleIcon />
                    {editingId === s.id
                        ? <input
                            className="session-rename-input"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={() => commitRename(s.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(s.id); e.stopPropagation(); }}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                        : <span className="session-title">{s.title}</span>
                    }
                    <div className="session-actions">
                        <button
                            className={`session-action-btn ${s.bookmarked ? 'session-action-btn--bookmarked' : ''}`}
                            onClick={e => toggleBookmark(s.id, e)}
                            title={s.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                            <BookmarkIcon filled={s.bookmarked} />
                        </button>
                        <button className="session-action-btn" onClick={e => startRename(s, e)} title="Rename"><PenIcon /></button>
                        <button className="session-action-btn session-action-btn--delete" onClick={e => deleteSession(s.id, e)} title="Delete"><TrashIcon /></button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Message Row ── */
function MessageRow({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--ai'}`}>
            {!isUser && <div className="ai-avatar"><AILogo /></div>}
            <div className={`msg-content ${isUser ? 'msg-content--user' : 'msg-content--ai'}`}>
                {/* attachments preview */}
                {msg.attachments?.length > 0 && (
                    <div className="msg-attachments">
                        {msg.attachments.map(a => (
                            <div key={a.id} className="msg-attach-item">
                                {a.type === 'image'
                                    ? <img src={`data:${a.mediaType};base64,${a.data}`} alt={a.name} className="msg-img" />
                                    : <div className="msg-file-pill"><span>{a.type === 'pdf' ? '📄' : '📝'}</span>{a.name}</div>
                                }
                            </div>
                        ))}
                    </div>
                )}
                <div className="msg-text">{renderMarkdown(msg.text, isUser)}</div>
                <span className="msg-time">{msg.time}</span>
            </div>
        </div>
    );
}

/* ── Thinking ── */
function ThinkingRow() {
    return (
        <div className="msg-row msg-row--ai">
            <div className="ai-avatar"><AILogo /></div>
            <div className="msg-content msg-content--ai">
                <div className="thinking-dots">
                    <span /><span /><span />
                </div>
            </div>
        </div>
    );
}

/* ── Markdown renderer ── */
function renderMarkdown(raw, isUser) {
    if (!raw) return null;
    if (isUser) return <span style={{ whiteSpace: 'pre-wrap' }}>{raw}</span>;

    const lines = raw.split('\n');
    const out = [];
    let codeBuf = null, codeLang = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('```')) {
            if (codeBuf === null) { codeBuf = []; codeLang = line.slice(3).trim() || 'code'; }
            else {
                out.push(
                    <div key={`cb${i}`} className="code-block">
                        <div className="code-header">
                            <span className="code-lang">{codeLang}</span>
                            <button className="code-copy" onClick={() => navigator.clipboard?.writeText(codeBuf.join('\n'))}>Copy code</button>
                        </div>
                        <pre className="code-pre"><code>{codeBuf.join('\n')}</code></pre>
                    </div>
                );
                codeBuf = null; codeLang = '';
            }
            continue;
        }
        if (codeBuf !== null) { codeBuf.push(line); continue; }
        if (line === '') { out.push(<div key={`sp${i}`} style={{ height: 8 }} />); continue; }

        if (/^#{1,3} /.test(line)) {
            const lvl  = line.match(/^(#+)/)[1].length;
            const text = line.replace(/^#+\s/, '');
            out.push(<div key={`h${i}`} className={`md-h md-h${lvl}`}>{inlineFmt(text)}</div>);
            continue;
        }
        if (/^[-*] /.test(line)) {
            out.push(<div key={`li${i}`} className="md-li"><span className="md-bullet">•</span>{inlineFmt(line.slice(2))}</div>);
            continue;
        }
        const nm = line.match(/^(\d+)\. (.+)/);
        if (nm) {
            out.push(<div key={`ni${i}`} className="md-li"><span className="md-num">{nm[1]}.</span>{inlineFmt(nm[2])}</div>);
            continue;
        }
        out.push(<p key={`p${i}`} className="md-p">{inlineFmt(line)}</p>);
    }
    return out;
}

function inlineFmt(text) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>;
        if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} className="inline-code">{p.slice(1, -1)}</code>;
        return p;
    });
}

/* ── Icons ── */
const SidebarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
    </svg>
);
const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const ChatBubbleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);
const PenIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
);
const AttachIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
);
const UpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4l8 8h-6v8h-4v-8H4z" />
    </svg>
);
const StopIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
);
const AILogo = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.15" />
        <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
);
const BookmarkIcon = ({ filled }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
);

/* ══════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Söhne:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:           #f9f9f7;
  --sidebar-bg:   #efefed;
  --border:       rgba(0,0,0,0.08);
  --text:         #1a1a1a;
  --text-muted:   rgba(0,0,0,0.45);
  --text-dim:     rgba(0,0,0,0.28);
  --user-bubble:  #1a1a1a;
  --user-text:    #ffffff;
  --accent:       #10a37f;
  --ai-avatar:    #10a37f;
  --hover:        rgba(0,0,0,0.04);
  --hover-strong: rgba(0,0,0,0.07);
  --input-bg:     #ffffff;
  --code-bg:      #f4f4f2;
  --code-text:    #1a1a1a;
  --radius:       12px;
  --font: 'Söhne', 'ui-sans-serif', system-ui, sans-serif;
  --mono: 'JetBrains Mono', 'Consolas', monospace;
}

body { font-family: var(--font); background: var(--bg); color: var(--text); }

.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ══ SIDEBAR ══ */
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar--open   { width: 260px; }
.sidebar--closed { width: 0; border-right: none; }

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  gap: 4px;
  flex-shrink: 0;
}

.sidebar-toggle, .new-chat-btn {
  width: 36px; height: 36px; border-radius: 8px;
  border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.sidebar-toggle:hover, .new-chat-btn:hover {
  background: var(--hover-strong); color: var(--text);
}

.sidebar-scroll {
  flex: 1; overflow-y: auto; padding: 4px 8px;
}
.sidebar-scroll::-webkit-scrollbar { width: 4px; }
.sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 99px; }

.session-group { margin-bottom: 16px; }
.session-group-label {
  font-size: 0.7rem; font-weight: 600; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 4px 8px 6px; user-select: none;
}

.session-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  color: var(--text-muted); font-size: 0.85rem;
  transition: background 0.12s, color 0.12s;
  position: relative; min-height: 36px;
}
.session-item:hover { background: var(--hover); color: var(--text); }
.session-item--active { background: var(--hover-strong) !important; color: var(--text) !important; }

.session-title {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 0.84rem;
}

.session-actions {
  display: none; align-items: center; gap: 2px; flex-shrink: 0;
}
.session-item:hover .session-actions,
.session-item--active .session-actions { display: flex; }

.session-action-btn {
  width: 26px; height: 26px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
}
.session-action-btn:hover { background: var(--hover-strong); color: var(--text); }
.session-action-btn--delete:hover { color: #f87171; }

.session-rename-input {
  flex: 1; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.12);
  border-radius: 5px; color: var(--text); font-size: 0.84rem; font-family: var(--font);
  padding: 2px 6px; outline: none;
}

.sidebar-footer {
  padding: 12px; border-top: 1px solid var(--border); flex-shrink: 0;
}
.sidebar-user {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background 0.12s;
}
.sidebar-user:hover { background: var(--hover); }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
}
.user-name { font-size: 0.88rem; font-weight: 500; color: var(--text); }

/* ══ MAIN ══ */
.main {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg);
}

.topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  min-height: 52px;
}
.topbar-toggle { flex-shrink: 0; }
.topbar-title {
  font-size: 0.9rem; font-weight: 500; color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1;
}

/* ══ MESSAGES ══ */
.messages-area {
  flex: 1; overflow-y: auto; padding: 24px 0;
}
.messages-area::-webkit-scrollbar { width: 4px; }
.messages-area::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px; }

.msg-row {
  display: flex; gap: 16px; padding: 12px 10%;
  max-width: 100%; animation: fadeUp 0.25s ease both;
}
.msg-row--user { justify-content: flex-end; }
.msg-row--ai   { justify-content: flex-start; align-items: flex-start; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ai-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  margin-top: 4px;
}

.msg-content {
  display: flex; flex-direction: column; gap: 4px; max-width: 680px;
}
.msg-content--user { align-items: flex-end; }
.msg-content--ai   { align-items: flex-start; }

.msg-text {
  font-size: 0.95rem; line-height: 1.7; color: var(--text);
}
.msg-content--user .msg-text {
  background: var(--user-bubble);
  padding: 12px 18px; border-radius: 18px 18px 4px 18px;
  color: var(--user-text); font-size: 0.95rem;
}

.msg-time {
  font-size: 0.68rem; color: var(--text-dim); padding: 0 4px;
}

.msg-attachments {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;
}
.msg-img {
  max-width: 240px; max-height: 200px; border-radius: 10px;
  border: 1px solid var(--border); object-fit: cover;
}
.msg-file-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 10px; font-size: 0.82rem;
  background: var(--input-bg); border: 1px solid var(--border);
  color: var(--text-muted);
}

/* ── Markdown ── */
.md-p  { margin: 2px 0; }
.md-h  { font-weight: 700; margin: 10px 0 4px; color: var(--text); }
.md-h1 { font-size: 1.3rem; }
.md-h2 { font-size: 1.1rem; }
.md-h3 { font-size: 1rem; }
.md-li {
  display: flex; align-items: baseline; gap: 8px;
  padding: 2px 0; font-size: 0.95rem;
}
.md-bullet { color: var(--accent); font-size: 1.1em; flex-shrink: 0; }
.md-num    { color: var(--accent); font-weight: 600; flex-shrink: 0; min-width: 22px; }
.inline-code {
  font-family: var(--mono); font-size: 0.85em;
  background: rgba(0,0,0,0.06); border: 1px solid var(--border);
  padding: 1px 6px; border-radius: 5px; color: #c7254e;
}

/* ── Code block ── */
.code-block {
  border-radius: 10px; overflow: hidden;
  border: 1px solid var(--border); margin: 8px 0; width: 100%;
}
.code-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; background: rgba(0,0,0,0.03);
  border-bottom: 1px solid var(--border);
}
.code-lang { font-size: 0.72rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--mono); }
.code-copy {
  font-size: 0.72rem; font-weight: 500; padding: 3px 10px; border-radius: 5px;
  background: transparent; border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer; font-family: var(--font);
  transition: all 0.12s;
}
.code-copy:hover { background: var(--hover); color: var(--text); }
.code-pre {
  font-family: var(--mono); font-size: 0.84rem; line-height: 1.6;
  padding: 16px; margin: 0; background: var(--code-bg);
  color: var(--code-text); overflow-x: auto; white-space: pre;
}

/* ── Thinking dots ── */
.thinking-dots {
  display: flex; align-items: center; gap: 5px;
  padding: 16px 0;
}
.thinking-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(0,0,0,0.3);
  animation: blink 1.4s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1);   }
}

/* ══ INPUT ══ */
.input-zone {
  padding: 12px 10% 16px;
  flex-shrink: 0;
}

.attach-row {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;
}
.attach-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 99px; font-size: 0.8rem;
  background: var(--input-bg); border: 1px solid var(--border);
  color: var(--text-muted);
}
.attach-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attach-remove {
  background: none; border: none; color: var(--text-dim);
  cursor: pointer; font-size: 1rem; line-height: 1;
  padding: 0; width: 16px; text-align: center;
  transition: color 0.1s;
}
.attach-remove:hover { color: #f87171; }

.input-box {
  display: flex; align-items: flex-end; gap: 8px;
  background: var(--input-bg);
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 16px; padding: 10px 10px 10px 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}
.input-box:focus-within {
  border-color: rgba(0,0,0,0.28);
  box-shadow: 0 0 0 4px rgba(0,0,0,0.04), 0 1px 6px rgba(0,0,0,0.08);
}

.input-action-btn {
  width: 32px; height: 32px; border-radius: 8px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: color 0.15s, background 0.15s;
}
.input-action-btn:hover { color: var(--text); background: var(--hover-strong); }

.input-textarea {
  flex: 1; background: none; border: none; outline: none; resize: none;
  font-family: var(--font); font-size: 0.95rem; line-height: 1.55;
  color: var(--text); min-height: 24px; max-height: 160px;
  overflow-y: auto; padding: 4px 0;
}
.input-textarea::placeholder { color: var(--text-dim); }
.input-textarea::-webkit-scrollbar { display: none; }

.send-btn {
  width: 34px; height: 34px; border-radius: 8px; border: none; flex-shrink: 0;
  background: #1a1a1a; color: #ffffff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.send-btn:hover:not(.send-btn--disabled) {
  background: #333; transform: scale(1.05);
}
.send-btn--disabled { opacity: 0.3; cursor: not-allowed; }

.input-hint {
  text-align: center; font-size: 0.68rem; color: var(--text-dim);
  margin-top: 10px; letter-spacing: 0.01em;
}

/* ── Sidebar Tabs ── */
.sidebar-tabs {
  display: flex; gap: 4px; padding: 4px 8px 8px;
  flex-shrink: 0;
}
.sidebar-tab {
  flex: 1; padding: 6px 8px; border-radius: 8px; border: none;
  background: transparent; color: var(--text-muted); font-size: 0.78rem;
  font-weight: 600; cursor: pointer; font-family: var(--font);
  display: flex; align-items: center; justify-content: center; gap: 5px;
  transition: background 0.12s, color 0.12s;
}
.sidebar-tab:hover { background: var(--hover); color: var(--text); }
.sidebar-tab--active { background: var(--hover-strong); color: var(--text); }

.sidebar-empty {
  text-align: center; font-size: 0.78rem; color: var(--text-dim);
  padding: 24px 16px; line-height: 1.6;
}

/* ── Bookmarked button ── */
.session-action-btn--bookmarked { color: #f59e0b !important; }
`;