import { useState } from 'react';

export default function Notes() {
    const [note, setNote] = useState('');

    return (
        <div className="professional-banner" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Quick Notes</h2>
                <button style={{ background: 'var(--accent-primary)', color: '#fff', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save Note</button>
            </div>

            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Start typing your study notes here..."
                style={{
                    flex: 1,
                    minHeight: '400px',
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
            />
        </div>
    );
}
