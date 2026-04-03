import React from 'react';

export default function MySubjects({ goals = [], onSelectGoal, onDeleteGoal }) {
    return (
        <div style={{ animation: 'fadeIn 0.5s ease', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '8px', color: 'var(--text-primary)' }}>My Goals</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '32px', fontWeight: 700 }}>Tap on your saved architected roadmaps to enter the planner.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {goals.length === 0 && (
                    <div style={{ padding: '32px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center', gridColumn: '1 / -1' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>No goals saved yet. Use the Study Planner generator to create one!</p>
                    </div>
                )}
                {goals.map((g, idx) => {
                    const total = g.tasks?.length || 0;
                    const done = g.tasks?.filter(t => t.completed).length || 0;
                    const progressNum = total > 0 ? Math.round((done / total) * 100) : 0;
                    const progress = `${progressNum}%`;
                    
                    return (
                    <div onClick={() => onSelectGoal && onSelectGoal(g)} key={idx} className="glass-panel" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: 'var(--shadow-card)', position: 'relative' }} onMouseOver={e => e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform='scale(1)'}>
                        <div style={{ paddingRight: '30px' }}>
                            <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>{g.title || g.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 600 }}>{total} tasks / {g.tasks?.reduce((acc, t) => acc + (t.hoursAllocated||0), 0) || 0} hours total</p>
                        </div>
                        {onDeleteGoal && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteGoal(g._id); }} style={{ position: 'absolute', top: '24px', right: '24px', background: '#fee2e2', color: '#ef4444', border: 'none', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ✕
                            </button>
                        )}
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-base)', borderRadius: '99px', overflow: 'hidden', marginTop: '8px' }}>
                            <div style={{ width: progress, height: '100%', background: 'linear-gradient(135deg, #10b981, #34d399)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 800 }}>{done} / {total} DONE</span>
                            <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 900 }}>{progress}</span>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
}
