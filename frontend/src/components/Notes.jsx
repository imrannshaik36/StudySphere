import { useState, useEffect } from 'react';

export default function Notes() {
    const [note, setNote] = useState('');
    const [savedNotes, setSavedNotes] = useState(() => {
        const saved = localStorage.getItem('studySphere_quickNotes');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('studySphere_quickNotes', JSON.stringify(savedNotes));
    }, [savedNotes]);

    const handleSaveNote = () => {
        if (!note.trim()) return;
        const newNote = {
            id: Date.now().toString(),
            text: note,
            timestamp: new Date().toLocaleString()
        };
        setSavedNotes([newNote, ...savedNotes]);
        setNote('');
    };

    const handleDeleteNote = (id) => {
        setSavedNotes(savedNotes.filter(n => n.id !== id));
    };

    return (
        <div className="professional-banner" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Quick Notes</h2>
                <button 
                    onClick={handleSaveNote}
                    style={{ background: 'var(--accent-primary)', color: '#fff', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Save Note
                </button>
            </div>

            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Start typing your study notes here..."
                style={{
                    minHeight: '150px',
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    flexShrink: 0
                }}
            />

            {savedNotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-secondary)' }}>Saved Notes</h3>
                    {savedNotes.map((n) => (
                        <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginRight: '16px' }}>
                                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: '1.5' }}>{n.text}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.timestamp}</div>
                            </div>
                            <button 
                                onClick={() => handleDeleteNote(n.id)} 
                                style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, flexShrink: 0 }}>
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
