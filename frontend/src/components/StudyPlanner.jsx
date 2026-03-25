import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function StudyPlanner() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/study-planner`)
            .then(res => res.json())
            .then(data => {
                const initialTasks = data.tasks.map(t => ({ ...t, completed: false }));
                setTasks(initialTasks);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([{ id: Date.now(), task: newTask, due: 'Pending', completed: false }, ...tasks]);
        setNewTask('');
    };

    const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    return (
        <div className="module-page" style={{ animation: 'fadeIn 0.5s ease', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Study Planner</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '8px' }}>Manage your academic workload.</p>
                </div>
                <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', padding: '12px 24px', borderRadius: '16px', fontWeight: 700, fontSize: '1.2rem' }}>
                    {tasks.filter(t => t.completed).length} / {tasks.length} Done
                </div>
            </div>

            <form onSubmit={addTask} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                <input
                    type="text"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="What do you need to study?"
                    style={{ flex: 1, padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1.1rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button type="submit" style={{ padding: '0 32px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.target.style.transform = 'scale(1.05)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                    Add Task
                </button>
            </form>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading planner...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tasks.map(t => (
                        <div
                            key={t.id}
                            onClick={() => toggleTask(t.id)}
                            style={{
                                padding: '20px 24px',
                                background: 'var(--bg-surface)',
                                borderRadius: '16px',
                                border: `1px solid ${t.completed ? 'var(--accent-alt)' : 'var(--border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: t.completed ? 0.7 : 1,
                                boxShadow: 'var(--shadow-card)'
                            }}
                        >
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: `2px solid ${t.completed ? 'var(--accent-alt)' : 'var(--text-muted)'}`, background: t.completed ? 'var(--accent-alt)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {t.completed && <span style={{ color: '#fff', fontSize: '14px' }}>✓</span>}
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none', flex: 1 }}>{t.task}</span>
                            <span style={{ padding: '6px 12px', background: 'var(--bg-base)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Due {t.due}</span>
                        </div>
                    ))}
                    {tasks.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>You have no tasks pending! Time to relax. 🎉</div>}
                </div>
            )}
        </div>
    );
}
