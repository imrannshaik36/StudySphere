import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Analytics() {
    const { user } = useAuth();
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.token) return;
        fetch(`${API_BASE_URL}/api/analytics`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        })
            .then(res => res.json())
            .then(data => {
                setApiData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [user]);

    return (
        <div className="module-page" style={{ animation: 'fadeIn 0.5s ease', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ fontSize: '2.4rem', marginBottom: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Your Learning Analytics</h2>

            {loading ? (
                <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-primary)' }}>⏳ Crunching numbers on backend...</p>
                </div>
            ) : apiData?.success ? (
                <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                    <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', marginBottom: '24px' }}>🟢 Live Tracking Connected</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-info)' }}>{apiData.stats.studyHours}h</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Study Hours</div>
                        </div>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', overflow: 'hidden' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-danger)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{apiData.stats.topSubject}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Most Studied</div>
                        </div>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', overflow: 'hidden' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-alt)', marginTop: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{apiData.stats.leastSubject}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Least Studied</div>
                        </div>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{apiData.stats.streak} 🔥</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Day Study Streak</div>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '1.4rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Study Timeline (By Subject)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.keys(apiData.timeline || {}).length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No study sessions recorded yet. Start learning!</p>
                        ) : (
                            Object.entries(apiData.timeline).map(([date, subjects]) => (
                                <div key={date} style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', minWidth: '120px' }}>{new Date(date).toLocaleDateString()}</div>
                                    {Object.entries(subjects).map(([sub, sec]) => (
                                        <div key={sub} style={{ background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--accent-alt)' }}>{sub}:</span> {Math.round(sec / 60)} mins
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <p style={{ color: 'var(--accent-danger)' }}>{apiData?.message || 'Backend connection failed.'}</p>
            )}
        </div>
    );
}
