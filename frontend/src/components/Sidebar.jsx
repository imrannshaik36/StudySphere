import { useState } from 'react';
import './Sidebar.css';

const navItems = [
  { icon: '⊞', label: 'Dashboard', id: 'dashboard' },
  { icon: '🧠', label: 'Learning Hub', id: 'learning-hub' },
  { icon: '📅', label: 'Study Planner', id: 'study-planner' },
  { icon: '📚', label: 'My Subjects', id: 'subjects' },
  { icon: '⏱', label: 'Timer', id: 'timer' },
  { icon: '📝', label: 'Notes', id: 'notes' },
  { icon: '🤖', label: 'AI Chat', id: 'ai-chat' },
  { icon: '📊', label: 'Analytics', id: 'analytics' },
];

export default function Sidebar({ active, onNav }) {
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
        <div className="user-card">
          <div className="user-avatar">KA</div>
          <div className="user-info">
            <p className="user-name">Karthik Appala</p>
            <p className="user-streak">🔥 14-day streak</p>
          </div>
          <button className="settings-btn" title="Settings">⚙</button>
        </div>
      </div>
    </aside>
  );
}
