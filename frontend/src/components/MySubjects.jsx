import React from 'react';

const subjects = [
    { name: 'Mathematics', desc: 'Calculus and Linear Algebra', progress: '78%' },
    { name: 'Physics', desc: 'Electromagnetism', progress: '42%' },
    { name: 'Data Structures', desc: 'Trees and Graphs', progress: '91%' },
    { name: 'Machine Learning', desc: 'Neural Networks', progress: '55%' },
];

export default function MySubjects() {
    return (
        <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '24px' }}>My Subjects</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {subjects.map(s => (
                    <div key={s.name} className="widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{s.name}</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{s.desc}</p>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-hover)', borderRadius: '99px', overflow: 'hidden', marginTop: '8px' }}>
                            <div style={{ width: s.progress, height: '100%', background: 'var(--accent-primary)', borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>{s.progress} completed</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
