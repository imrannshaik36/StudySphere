import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Analytics() {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/analytics`)
            .then(res => res.json())
            .then(data => {
                setApiData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="module-page" style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ fontSize: '2.4rem', marginBottom: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Analytics</h2>

            {loading ? (
                <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-primary)' }}>⏳ Crunching numbers on backend...</p>
                </div>
            ) : apiData ? (
                <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                    <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', marginBottom: '24px' }}>🟢 {apiData.message}</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-info)' }}>{apiData.stats.studyHours}h</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Study Hours</div>
                        </div>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-alt)' }}>{apiData.stats.averageScore}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Average Score</div>
                        </div>
                        <div style={{ padding: '24px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-danger)', marginTop: '6px' }}>{apiData.stats.topSubject}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Top Subject</div>
                        </div>
                    </div>
                </div>
            ) : (
                <p style={{ color: 'var(--accent-danger)' }}>Backend connection failed.</p>
            )}
        </div>
    );
}
