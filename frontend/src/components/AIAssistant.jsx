import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function AIAssistant() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const endRef = useRef(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/ai-chat`)
            .then(res => res.json())
            .then(data => {
                setMessages([{ sender: 'ai', text: `Hello! ${data.message} I can help you understand complex topics, debug code, or plan study sessions. What's on your mind?` }]);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const newMsgs = [...messages, { sender: 'user', text: input }];
        setMessages(newMsgs);
        setInput('');

        // Mock AI response for demo purposes
        setTimeout(() => {
            setMessages(prev => [...prev, { sender: 'ai', text: 'That is a fascinating question! I am querying the intelligence matrix... (This is a mock response)' }]);
        }, 800);
    };

    return (
        <div className="module-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>AI Tutor</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '4px' }}>Ask me anything about your current subjects.</p>
            </div>

            <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>

                {/* Chat History */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {loading ? (
                        <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Connecting to Intelligence Matrix...</div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: msg.sender === 'ai' ? '16px' : 0, alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                    {msg.sender === 'user' ? 'You' : 'StudySphere AI'}
                                </span>
                                <div style={{
                                    padding: '16px 20px',
                                    background: msg.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-base)',
                                    color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                                    borderRadius: '20px',
                                    borderBottomRightRadius: msg.sender === 'user' ? '4px' : '20px',
                                    borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '20px',
                                    border: msg.sender === 'ai' ? '1px solid var(--border)' : 'none',
                                    lineHeight: 1.5, fontSize: '1.05rem'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSend} style={{ padding: '20px', background: 'var(--bg-base)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type your question here..."
                        style={{ flex: 1, padding: '16px 20px', borderRadius: '99px', border: '1px solid var(--border)', fontSize: '1rem', background: 'var(--bg-surface)', outline: 'none', color: 'var(--text-primary)' }}
                    />
                    <button type="submit" style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s', padding: 0 }} onMouseOver={e => e.target.style.transform = 'scale(1.1)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
