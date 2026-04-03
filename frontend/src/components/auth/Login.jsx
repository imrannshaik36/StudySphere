import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ background: '#fff', padding: '48px', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px', textAlign: 'center' }}>Welcome Back</h2>
                <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px' }}>Enter your credentials to access your StudyPro workspace.</p>
                {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', marginBottom: '24px', fontWeight: 600, fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Email Address</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', color: '#0f172a' }} />
                    </div>
                    <button type="submit" style={{ marginTop: '12px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79,70,229,0.3)' }}>Log In</button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.95rem', color: '#64748b' }}>
                    Don't have an account? <Link to="/signup" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>Sign up</Link>
                </div>
            </div>
        </div>
    );
}
