import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StudyTimer from './components/StudyTimer';
import Notes from './components/Notes';
import MySubjects from './components/MySubjects';
import LearningHubV2 from './components/LearningHubV2';
import StudyPlanner from './components/StudyPlanner';
import AIAssistant from './components/AIAssistant';
import Analytics from './components/Analytics';
import './Dashboard.css';

const modules = [
    {
        id: 'study-planner',
        title: 'Study Planner',
        description: 'Organize and track your study milestones seamlessly.',
        bgClass: 'card-bg-emerald',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
                <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
                <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
            </svg>
        )
    },
    {
        id: 'learning-hub',
        title: 'Learning Hub',
        description: 'Access your structured learning modules here.',
        bgClass: 'card-bg-ocean',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
        )
    },
    {
        id: 'ai-chat',
        title: 'AI Chat',
        description: 'Get instant, intelligent help with complex doubts.',
        bgClass: 'card-bg-amethyst',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" /><path d="M20 14h2" />
                <path d="M15 13v2" /><path d="M9 13v2" />
            </svg>
        )
    },
    {
        id: 'analytics',
        title: 'Analytics',
        description: 'Deep dive into your study performance metrics.',
        bgClass: 'card-bg-sunset',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
            </svg>
        )
    }
];

export default function Dashboard() {
    const [activeNav, setActiveNav] = useState('dashboard');

    return (
        <div className="dashboard-layout">
            <Sidebar active={activeNav} onNav={setActiveNav} />

            <div className="dashboard-main">
                <Header />

                <main className="dashboard-content">
                    {activeNav === 'dashboard' && (
                        <>
                            {/* Welcome Banner (Hero area) */}
                            <div className="professional-banner">
                                <div className="banner-content">
                                    <h2>Welcome back to StudySphere 👋</h2>
                                    <p>Choose a module to continue your learning journey</p>
                                </div>
                                <div className="banner-decoration"></div>
                            </div>

                            {/* Main Cards Row */}
                            <div className="premium-cards-grid">
                                {modules.map(mod => (
                                    <button
                                        key={mod.id}
                                        className={`premium-card ${mod.bgClass}`}
                                        onClick={() => setActiveNav(mod.id)}
                                    >
                                        <div className="premium-card-content">
                                            <div className="premium-icon-wrap">
                                                {mod.icon}
                                            </div>
                                            <div className="premium-info">
                                                <h3>{mod.title}</h3>
                                                <p>{mod.description}</p>
                                            </div>
                                        </div>
                                        <div className="premium-glow-orb"></div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {activeNav === 'timer' && <StudyTimer />}
                    {activeNav === 'notes' && <Notes />}
                    {activeNav === 'subjects' && <MySubjects />}
                    {activeNav === 'learning-hub' && <LearningHubV2 />}
                    {activeNav === 'study-planner' && <StudyPlanner />}
                    {activeNav === 'ai-chat' && <AIAssistant />}
                    {activeNav === 'analytics' && <Analytics />}
                </main>
            </div>
        </div>
    );
}
