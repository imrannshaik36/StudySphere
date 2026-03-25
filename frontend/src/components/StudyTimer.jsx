import { useState, useEffect } from 'react';

export default function StudyTimer() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let timer;
        if (isRunning && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
        }
        return () => clearInterval(timer);
    }, [isRunning, timeLeft]);

    const toggleTimer = () => setIsRunning(!isRunning);
    const resetTimer = () => { setIsRunning(false); setTimeLeft(25 * 60); };

    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');

    return (
        <div className="professional-banner" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <h2 style={{ fontSize: '2rem' }}>Study Timer</h2>
            <div style={{ fontSize: '6rem', fontWeight: 800, letterSpacing: '4px', background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {minutes}:{seconds}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                <button onClick={toggleTimer} style={{ background: isRunning ? 'var(--bg-hover)' : 'var(--accent-primary)', color: '#fff', padding: '12px 32px', borderRadius: '99px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {isRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button onClick={resetTimer} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 32px', borderRadius: '99px', fontSize: '1.2rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    Reset
                </button>
            </div>
        </div>
    );
}
