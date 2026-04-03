import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header() {
    const { user } = useAuth();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <header className="header">
            <div className="header-left">
                <h1 className="header-greeting">
                    {greeting}, <span className="text-gradient">{user?.name || 'Student'}</span> 👋
                </h1>
                <p className="header-sub">Here's your study overview for today</p>
            </div>

            <div className="header-right">
                <div className="header-date">
                    <span className="date-day">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                    <span className="date-full">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
            </div>
        </header>
    );
}
