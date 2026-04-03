import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { icon: '⊞', label: 'Dashboard', id: 'dashboard' },
  { icon: '🧠', label: 'Learning Hub', id: 'learning-hub' },
  { icon: '📅', label: 'Study Planner', id: 'study-planner' },
  { icon: '🎯', label: 'My Goals', id: 'subjects' },
  { icon: '⏱', label: 'Timer', id: 'timer' },
  { icon: '📝', label: 'Notes', id: 'notes' },
  { icon: '🤖', label: 'AI Chat', id: 'ai-chat' },
  { icon: '📊', label: 'Analytics', id: 'analytics' },
];

export default function Sidebar({ active, onNav }) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">S</div>
        <div className="brand-text">
          <span className="brand-name">StudySphere</span>
          <span className="brand-tagline">Learn · Grow · Excel</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-label">MAIN MENU</p>
        <ul>
          {navItems.map(item => (
            <li key={item.id}>
              <button
                className={`nav-item ${active === item.id ? 'nav-item--active' : ''}`}
                onClick={() => onNav(item.id)}
                id={`nav-${item.id}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {active === item.id && <span className="nav-indicator" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="user-avatar" style={{ background: '#4f46e5', minWidth: '32px' }}>{user?.email?.charAt(0).toUpperCase()}</div>
            <div className="user-info" style={{ overflow: 'hidden' }}>
              <p className="user-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.email}</p>
              <p className="user-streak">🟢 Online</p>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Log Out</button>
        </div>
      </div>
    </aside>
  );
}
