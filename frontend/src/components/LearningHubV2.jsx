import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../config';

const SUBJECTS_STORAGE_KEY = 'studysphere_learninghub_subjects_v1';
const ACTIVE_SUBJECT_KEY = 'studysphere_learninghub_active_subject_v1';

const normalizeSubjectName = (s) => String(s || '').trim();
const parseLines = (text) => String(text || '').split(/[\n,;]+/g).map((t) => t.trim()).filter(Boolean);

// --- Sub-Components for StudyPro UI ---

const Badge = ({ text, type }) => {
  const colors = {
    easy: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
    medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    hard: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
  };
  const style = colors[type] || colors.easy;
  return (
    <span style={{ background: style.bg, color: style.text, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
      {text}
    </span>
  );
};

// Markdown Wrapper styling for Dark Mode
const MarkdownRenderer = ({ content }) => {
  return (
    <div className="react-markdown-content" style={{ color: '#d1d5db', lineHeight: '1.7', fontSize: '1.05rem', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .react-markdown-content h1, .react-markdown-content h2, .react-markdown-content h3 { color: '#fff'; margin-top: '1.5em'; margin-bottom: '0.8em'; fontWeight: 800; }
        .react-markdown-content h2 { font-size: 1.5rem; color: #fff; }
        .react-markdown-content p { margin-bottom: 1.2em; }
        .react-markdown-content ul, .react-markdown-content ol { margin-left: '1.5em'; margin-bottom: '1.2em'; padding-left: '20px'; }
        .react-markdown-content li { margin-bottom: '0.5em'; }
        .react-markdown-content code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #e5e7eb; font-size: 0.9em; }
        .react-markdown-content pre { background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; overflow-x: auto; margin-bottom: 1.5em; border: 1px solid rgba(255,255,255,0.05); }
        .react-markdown-content pre code { background: transparent; padding: 0; color: #a5b4fc; }
        .react-markdown-content strong { color: #fff; font-weight: 700; }
        .react-markdown-content blockquote { border-left: 4px solid #6366f1; padding-left: 16px; margin-left: 0; color: #9ca3af; font-style: italic; background: rgba(99,102,241,0.05); padding: 12px 16px; border-radius: 0 12px 12px 0; }
      `}</style>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

const OverviewPane = ({ curriculum, subjectName }) => {
  const ov = curriculum?.overview || {};
  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Study Overview</h2>
      <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Your personalized learning summary for {subjectName}.</p>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 400px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px' }}>
          <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '4px' }}>Executive Summary</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '24px' }}>AI-generated distillation of your material.</p>
          <div style={{ color: '#e5e7eb', lineHeight: '1.7', fontSize: '1.05rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '16px' }}>Summary: {subjectName}</p>
            <p style={{ marginBottom: '16px' }}>{ov.executiveSummary}</p>
            
            <p style={{ fontWeight: 700, marginTop: '24px', marginBottom: '8px', color: '#fff' }}>Main ideas</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {(ov.mainIdeas || []).map((idea, i) => <li key={i}>{idea}</li>)}
            </ul>

            <p style={{ fontWeight: 700, marginTop: '24px', marginBottom: '8px', color: '#fff' }}>Why it matters</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {(ov.whyItMatters || []).map((pt, i) => <li key={i}>{pt}</li>)}
            </ul>

            <div style={{ background: 'rgba(99,102,241,0.1)', borderLeft: '4px solid #6366f1', padding: '16px', borderRadius: '0 12px 12px 0', marginTop: '24px' }}>
              <p style={{ fontWeight: 800, color: '#818cf8', marginBottom: '4px' }}>Key Takeaway</p>
              <p>{ov.keyTakeaway}</p>
            </div>
          </div>
        </div>

        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>Quick Stats</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {[
                 { label: 'Key Concepts', val: (curriculum?.concepts || []).length },
                 { label: 'Flashcards Generated', val: (curriculum?.flashcards || []).length },
                 { label: 'Quiz Questions', val: (curriculum?.quizzes || []).length }
               ].map((st, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px' }}>
                    <span style={{ color: '#d1d5db', fontWeight: 600, fontSize: '0.9rem' }}>{st.label}</span>
                    <span style={{ color: '#fff', fontWeight: 800 }}>{st.val}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConceptsPane = ({ concepts = [] }) => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Key Concepts</h2>
      <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Deep dive into the core material with structured explanations.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {concepts.map((c, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', overflow: 'hidden', transition: 'all 0.2s' }}>
               <div onClick={() => setOpenIdx(isOpen ? null : i)} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>{c.title}</h3>
                    <Badge text={c.difficulty || 'easy'} type={c.difficulty} />
                  </div>
                  <div style={{ color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>▼</div>
               </div>
               {isOpen && (
                 <div style={{ padding: '0 24px 24px 24px', animation: 'fadeIn 0.3s ease' }}>
                   <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                     <MarkdownRenderer content={[
                       "### Definition\n" + (c.definition || ''),
                       "### Deep Dive\n" + (c.deepDive || ''),
                       "### Code / Walkthrough / Flowchart\n" + (c.codeExample || ''),
                       "### Use Cases\n" + (c.useCases || ''),
                       "### Advantages & Disadvantages\n" + (c.advantagesDisadvantages || '')
                     ].join('\n\n')} />
                   </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FlashcardsPane = ({ flashcards = [] }) => {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  
  if (!flashcards.length) return <div style={{ color: '#fff' }}>No flashcards generated.</div>;
  const card = flashcards[idx];

  const goNext = () => { setFlipped(false); setTimeout(() => setIdx(Math.min(idx+1, flashcards.length-1)), 150); };
  const goPrev = () => { setFlipped(false); setTimeout(() => setIdx(Math.max(idx-1, 0)), 150); };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
         <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Spaced Repetition</h2>
         <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '999px', color: '#d1d5db', fontWeight: 700, fontSize: '0.9rem' }}>
            Card {idx+1} of {flashcards.length}
         </div>
      </div>
      <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Reviewing {flashcards.length} cards.</p>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div 
          onClick={() => setFlipped(!flipped)}
          style={{ width: '100%', maxWidth: '600px', minHeight: '350px', perspective: '1000px', cursor: 'pointer' }}
        >
          <div style={{ width: '100%', height: '100%', position: 'relative', transition: 'transform 0.6s', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
             {/* Front */}
             <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: '24px', right: '24px' }}><Badge text="easy" type="easy" /></div>
                <h3 style={{ fontSize: '1.8rem', color: '#fff', lineHeight: 1.4 }}>{card.question}</h3>
             </div>
             {/* Back */}
             <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', transform: 'rotateY(180deg)' }}>
                <h3 style={{ fontSize: '1.4rem', color: '#e5e7eb', lineHeight: 1.6, fontWeight: 500 }}>{card.answer}</h3>
             </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px 24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
         <button onClick={goPrev} disabled={idx === 0} style={{ background: 'transparent', border: 'none', color: idx === 0 ? '#4b5563' : '#d1d5db', cursor: idx===0?'not-allowed':'pointer', fontWeight: 700, fontSize: '1rem', display:'flex', alignItems:'center', gap:'8px' }}>
            ← Previous
         </button>
         <button onClick={() => setFlipped(true)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
            Reveal Answer
         </button>
         <button onClick={goNext} disabled={idx === flashcards.length-1} style={{ background: 'transparent', border: 'none', color: idx === flashcards.length-1 ? '#4b5563' : '#d1d5db', cursor: idx===flashcards.length-1?'not-allowed':'pointer', fontWeight: 700, fontSize: '1rem', display:'flex', alignItems:'center', gap:'8px' }}>
            Next →
         </button>
      </div>
    </div>
  );
}

const QuizzesPane = ({ quizzes = [] }) => {
  const [idx, setIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!quizzes.length) return <div style={{ color: '#fff' }}>No quizzes generated.</div>;
  const q = quizzes[idx];

  const handleSubmit = () => {
    if (selectedOpt === q.correctIndex) setScore(s => s+1);
    setSubmitted(true);
  };

  const handleNext = () => {
    setSubmitted(false);
    setSelectedOpt(null);
    setIdx(Math.min(idx+1, quizzes.length-1));
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
         <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Adaptive Quiz</h2>
         <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '999px', color: '#d1d5db', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                Question {idx+1} of {quizzes.length}
            </div>
            <div style={{ color: '#818cf8', fontWeight: 800, fontSize: '0.9rem' }}>Score: {score}</div>
         </div>
      </div>
      <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '32px' }}>Test your understanding.</p>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.3)', borderTop: '4px solid #818cf8', borderRadius: '24px', padding: '32px' }}>
         <div style={{ marginBottom: '24px' }}><Badge text={q.difficulty || 'medium'} type={q.difficulty || 'medium'} /></div>
         <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '32px', lineHeight: 1.5 }}>{q.question}</h3>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(q.options || []).map((opt, i) => {
               const isSelected = selectedOpt === i;
               const isCorrect = submitted && i === q.correctIndex;
               const isWrong = submitted && isSelected && i !== q.correctIndex;
               let bg = isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)';
               let border = isSelected ? '1px solid #6366f1' : '1px solid transparent';
               if (isCorrect) { bg = 'rgba(16,185,129,0.15)'; border = '1px solid #10b981'; }
               if (isWrong) { bg = 'rgba(239,68,68,0.15)'; border = '1px solid #ef4444'; }
               
               return (
                 <button 
                    key={i} 
                    disabled={submitted}
                    onClick={() => !submitted && setSelectedOpt(i)}
                    style={{ background: bg, border, display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '16px', cursor: submitted ? 'default' : 'pointer', color: '#d1d5db', fontSize: '1.05rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
                 >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isSelected||isCorrect||isWrong ? 'currentColor' : '#4b5563'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       {(isSelected || isCorrect || isWrong) && <div style={{ width: '10px', height: '10px', background: 'currentColor', borderRadius: '50%' }}></div>}
                    </div>
                    {opt}
                 </button>
               );
            })}
         </div>

         <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
           {!submitted ? (
             <button onClick={handleSubmit} disabled={selectedOpt === null} style={{ background: selectedOpt===null ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: selectedOpt===null ? '#6b7280' : '#fff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: selectedOpt===null ? 'not-allowed' : 'pointer' }}>
               Submit Answer
             </button>
           ) : (
             <button onClick={handleNext} disabled={idx === quizzes.length-1} style={{ background: idx===quizzes.length-1 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: idx===quizzes.length-1 ? '#6b7280' : '#fff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: idx===quizzes.length-1 ? 'not-allowed' : 'pointer' }}>
               {idx === quizzes.length-1 ? 'Quiz Completed' : 'Next Question'}
             </button>
           )}
         </div>
      </div>
    </div>
  );
};

const StudyTimer = ({ sessionId, initialTime = 0 }) => {
  const [seconds, setSeconds] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(true);
  const lastSyncTimeRef = useRef(initialTime);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pulse effect when running
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isRunning && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Sync with backend natively every 30 seconds implicitly backing it up
  const syncTime = () => {
    const diff = seconds - lastSyncTimeRef.current;
    if (diff > 0) {
       fetch(`${API_BASE_URL}/api/learning-hub/sessions/${sessionId}/time`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incrementSec: diff })
       }).catch(() => {});
       lastSyncTimeRef.current = seconds;
    }
  };

  // Sync on unmount gracefully
  useEffect(() => {
    return () => { syncTime(); };
  }, [seconds, sessionId]); 

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px 6px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isRunning ? '#10b981' : '#f59e0b', boxShadow: isRunning ? '0 0 8px rgba(16,185,129,0.8)' : 'none', transition: '0.3s' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: '1.05rem', letterSpacing: '1px' }}>{formatTime(seconds)}</span>
       </div>
       <button onClick={() => { syncTime(); setIsRunning(!isRunning); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e5e7eb', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '0.8rem' }}>
          {isRunning ? '⏸' : '▶'}
       </button>
    </div>
  );
};


// --- Main Component ---

export default function LearningHubV2() {
  const [subjects, setSubjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SUBJECTS_STORAGE_KEY) || '[]'); } catch { return []; }
  });
  
  // Persist the actual selected subject uniquely
  const [selectedSubjectName, setSelectedSubjectName] = useState(() => {
    try { return localStorage.getItem(ACTIVE_SUBJECT_KEY) || null; } catch { return null; }
  });

  const selectedSubject = useMemo(() => subjects.find(s => s.name === selectedSubjectName) || null, [subjects, selectedSubjectName]);

  const [curriculum, setCurriculum] = useState(null);
  const [activeSubNav, setActiveSubNav] = useState('overview');

  const [subjectInputText, setSubjectInputText] = useState(''); 
  const [showCustomTopics, setShowCustomTopics] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guarantee persistence upon changing explicitly
  const persistSubjectSelection = (name) => {
    setSelectedSubjectName(name);
    try {
      if (name) localStorage.setItem(ACTIVE_SUBJECT_KEY, name);
      else localStorage.removeItem(ACTIVE_SUBJECT_KEY);
    } catch {}
  };

  useEffect(() => { 
    if (!selectedSubjectName && subjects.length) persistSubjectSelection(subjects[0].name); 
  }, [selectedSubjectName, subjects]);

  useEffect(() => { try { localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects)); } catch { } }, [subjects]);

  const addSubjects = () => {
    const incoming = parseLines(subjectInputText);
    if (!incoming.length) return;
    setSubjects(prev => {
      const map = new Map(prev.map(s => [s.name.toLowerCase(), s]));
      incoming.forEach(name => {
        const n = normalizeSubjectName(name);
        if (n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(), { name: n, sessionId: null });
      });
      return Array.from(map.values());
    });
    setSubjectInputText('');
  };

  const loadData = async () => {
    setError(null);
    setCurriculum(null);
    if (!selectedSubject?.sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/learning-hub/sessions/${selectedSubject.sessionId}`);
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'Failed load');
      setCurriculum(data.curriculum || null);
    } catch (e) {
      setError(e.message);
      setSubjects(prev => prev.map(s => s.name === selectedSubject?.name ? { ...s, sessionId: null } : s));
    } finally { setLoading(false); }
  };

  useEffect(() => { 
    if (selectedSubject?.sessionId) {
        loadData(); 
        setActiveSubNav('overview'); 
    }
  }, [selectedSubject?.sessionId]);

  const generateCurriculum = async (topicsStr = null) => {
    setError(null);
    setLoading(true);
    try {
      const subj = selectedSubject?.name || normalizeSubjectName(subjectInputText);
      if (!subj) throw new Error('Select a subject.');
      
      const payload = { subject: subj };
      if (typeof topicsStr === 'string' && topicsStr.trim()) {
          payload.topics = topicsStr.split(/[\n,;]+/).map(t => t.trim()).filter(Boolean);
      }

      const res = await fetch(`${API_BASE_URL}/api/learning-hub/generate/ai`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'Generation failed.');
      
      setSubjects(prev => prev.map(s => s.name === subj ? { ...s, sessionId: data.sessionId } : s));
      setCurriculum(data.curriculum || null);
      setActiveSubNav('overview');
    } catch (e) { setError(e.message); } 
    finally { setLoading(false); }
  };

  const handleExitStudyPro = () => {
    setCurriculum(null);
    setActiveSubNav('overview');
    // Does NOT wipe out selectedSubjectName explicitly to honor request exactly
  };

  // Immersive layout when curriculum active
  if (selectedSubject?.sessionId && curriculum) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#0B0D14', zIndex: 100, display: 'flex', animation: 'fadeIn 0.3s ease', fontFamily: 'system-ui, sans-serif' }}>
        {/* Sub-Sidebar */}
        <div style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '24px' }}>
           <button onClick={handleExitStudyPro} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontWeight: 700, cursor: 'pointer', textAlign: 'left', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ← Return to Dashboard
           </button>
           <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b7280', letterSpacing: '1px', marginBottom: '12px' }}>STUDY TOOLS</div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[ 
                { id: 'overview', label: 'Overview', icon: '◫' },
                { id: 'concepts', label: 'Concepts', icon: '💡' },
                { id: 'flashcards', label: 'Flashcards', icon: '🎴' },
                { id: 'quizzes', label: 'Quizzes', icon: '🎓' }
              ].map(nav => (
                <button
                  key={nav.id} onClick={() => setActiveSubNav(nav.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '16px', border: 'none', background: activeSubNav === nav.id ? 'rgba(99,102,241,0.1)' : 'transparent', color: activeSubNav === nav.id ? '#818cf8' : '#9ca3af', fontWeight: activeSubNav === nav.id ? 800 : 700, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '1.2rem', opacity: activeSubNav===nav.id ? 1 : 0.7 }}>{nav.icon}</span>
                  {nav.label}
                </button>
              ))}
           </div>
        </div>

        {/* Content Pane */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
           <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <StudyTimer sessionId={selectedSubject.sessionId} initialTime={0} />
              </div>
             
             {/* Active View */}
             {activeSubNav === 'overview' && <OverviewPane curriculum={curriculum} subjectName={selectedSubject.name} />}
             {activeSubNav === 'concepts' && <ConceptsPane concepts={curriculum.concepts} />}
             {activeSubNav === 'flashcards' && <FlashcardsPane flashcards={curriculum.flashcards} />}
             {activeSubNav === 'quizzes' && <QuizzesPane quizzes={curriculum.quizzes} />}
           </div>
        </div>
      </div>
    );
  }

  // Regular Dashboard Layout
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '8px', color: 'var(--text-primary)' }}>Learning Hub</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '24px', fontWeight: 700 }}>Manage subjects and launch StudyPro environments.</p>

      <div style={{ display: 'flex', gap: '20px' }}>
         <div style={{ width: '320px', flexShrink: 0 }}>
             <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '16px' }}>
                 <div style={{ fontSize: '1.2rem', fontWeight: 950, marginBottom: '16px', color: 'var(--text-primary)' }}>My Subjects</div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   {subjects.map(s => (
                     <button key={s.name} onClick={() => persistSubjectSelection(s.name)} style={{ textAlign: 'left', padding: '14px', borderRadius: '16px', border: s.name === selectedSubjectName ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: s.name === selectedSubjectName ? 'rgba(99,102,241,0.1)' : 'var(--bg-base)', cursor: 'pointer', fontWeight: 900, color: 'var(--text-primary)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                           {s.name}
                           {s.sessionId && <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>Ready</span>}
                        </div>
                     </button>
                   ))}
                   {!subjects.length && <div style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>No subjects yet.</div>}
                 </div>
                 <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <textarea value={subjectInputText} onChange={e => setSubjectInputText(e.target.value)} placeholder="Add subjects..." style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-base)', outline: 'none', fontWeight: 700, color: 'var(--text-primary)' }} />
                    <button onClick={addSubjects} disabled={!subjectInputText.trim()} style={{ marginTop: '10px', width: '100%', padding: '12px', borderRadius: '12px', background: subjectInputText.trim() ? 'var(--accent-primary)' : 'var(--bg-hover)', color: '#fff', fontWeight: 900, cursor: subjectInputText.trim() ? 'pointer' : 'not-allowed' }}>Add</button>
                 </div>
             </div>
         </div>

         <div style={{ flex: 1 }}>
            {error && <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '16px', fontWeight: 800, marginBottom: '20px' }}>{error}</div>}
            
            {selectedSubject ? (
               <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '16px', color: 'var(--text-primary)' }}>{selectedSubject.name}</h3>
                  {selectedSubject.sessionId ? (
                     <div>
                       <div style={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '24px' }}>Curriculum securely generated. You can enter the StudyPro environment.</div>
                       <div style={{display:'flex', gap:'12px'}}>
                         <button onClick={loadData} style={{ padding: '14px 24px', borderRadius: '16px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 900, border: 'none', cursor: 'pointer' }}>Enter StudyPro</button>
                         <button onClick={async () => {
                             setCurriculum(null);
                             setSubjects(prev => prev.map(s => s.name === selectedSubject.name ? { ...s, sessionId: null } : s));
                         }} style={{ padding: '14px 24px', borderRadius: '16px', background: 'var(--bg-base)', color: 'var(--text-primary)', fontWeight: 900, border: '1px solid var(--border)', cursor: 'pointer' }}>Rebuild</button>
                       </div>
                     </div>
                  ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                       <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Allow the AI to construct your adaptive StudyPro environment dynamically, or provide your own explicit topics!</div>
                       
                       <div style={{ display: 'flex', gap: '16px' }}>
                          <button onClick={() => generateCurriculum()} disabled={loading} style={{ padding: '14px 24px', borderRadius: '16px', background: loading ? 'var(--bg-hover)' : 'var(--accent-primary)', color: '#fff', fontWeight: 900, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', flex: 1 }}>
                             {loading && !showCustomTopics ? 'Constructing...' : 'Auto-Construct AI Curriculum'}
                          </button>
                          <button onClick={() => setShowCustomTopics(!showCustomTopics)} disabled={loading} style={{ padding: '14px 24px', borderRadius: '16px', background: 'var(--bg-base)', color: 'var(--text-primary)', fontWeight: 900, border: '1px solid var(--border)', cursor: loading ? 'not-allowed' : 'pointer', flex: 1 }}>
                             {showCustomTopics ? 'Cancel Custom Topics' : 'I want to provide Custom Topics'}
                          </button>
                       </div>

                       {showCustomTopics && (
                         <div style={{ animation: 'fadeIn 0.3s ease', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                           <h4 style={{ color: '#fff', marginBottom: '8px', fontSize: '1.1rem' }}>Enter Specific Topics</h4>
                           <textarea value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="e.g. Arrays, Linked Lists, Trees..." style={{ width: '100%', minHeight: '100px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '1rem', outline: 'none', marginBottom: '16px' }} />
                           <button onClick={() => generateCurriculum(customInput)} disabled={loading || !customInput.trim()} style={{ padding: '14px 24px', borderRadius: '16px', background: (loading || !customInput.trim()) ? 'var(--bg-hover)' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 900, border: 'none', cursor: (loading || !customInput.trim()) ? 'not-allowed' : 'pointer', width: '100%' }}>
                             {loading && showCustomTopics ? 'Constructing with Custom Topics...' : 'Generate with exact topics'}
                           </button>
                         </div>
                       )}
                     </div>
                  )}
               </div>
            ) : (
               <div style={{ padding: '32px', color: 'var(--text-secondary)', fontWeight: 800, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', textAlign: 'center' }}>
                  Select a subject to begin.
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
