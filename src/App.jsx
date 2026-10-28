import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'nothing-discoveries-v1';
const VISIT_KEY = 'nothing-visits-v1';
const ACHIEVEMENTS = [
  { id: 'double-tap', title: 'first contact', hint: 'tap the dot twice' },
  { id: 'long-press', title: 'patience', hint: 'hold the dot' },
  { id: 'drag', title: 'displacement', hint: 'move the dot' },
  { id: 'symbol', title: 'hidden shape', hint: 'tap four times quickly' },
  { id: 'waiting', title: 'stillness', hint: 'wait long enough' },
  { id: 'third-visit', title: 'returning', hint: 'come back again' },
  { id: 'archive', title: 'the archive', hint: 'find the hidden corner' },
];

function getLevel(count) {
  if (count >= 7) return { number: '04', name: 'the impossible' };
  if (count >= 5) return { number: '03', name: 'the observer' };
  if (count >= 3) return { number: '02', name: 'the seeker' };
  return { number: '01', name: 'the beginning' };
}

function loadDiscoveries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function App() {
  const [mood, setMood] = useState('still');
  const [discoveries, setDiscoveries] = useState(loadDiscoveries);
  const [showMark, setShowMark] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });
  const [showSymbol, setShowSymbol] = useState(false);
  const visitHandled = useRef(false);
  const edgeTaps = useRef(0);
  const edgeTimer = useRef(null);
  const [pulse, setPulse] = useState(0);
  const [secret, setSecret] = useState('');
  const pressTimer = useRef(null);
  const pressTriggered = useRef(false);
  const tapTimer = useRef(null);
  const tapCount = useRef(0);
  const rapidTaps = useRef([]);
  const lastMotion = useRef(0);
  const stillTimer = useRef(null);
  const pointerStart = useRef(null);
  const isAwake = discoveries.length >= 7;

  const unlock = useCallback((id, message, nextMood = 'reveal') => {
    setDiscoveries((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSecret(message);
      setMood(nextMood);
      window.setTimeout(() => {
        setSecret((value) => value === message ? '' : value);
        setMood((value) => value === nextMood ? 'still' : value);
      }, 2400);
      return next;
    });
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional browser feature */ }
    pressTriggered.current = false;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      pressTriggered.current = true;
      setPulse((value) => value + 1);
      if (navigator.vibrate) navigator.vibrate(18);
      unlock('long-press', 'you stayed.', 'breathe');
    }, 720);
  };

  const handlePointerMove = (event) => {
    if (!pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    if (Math.hypot(dx, dy) > 18) {
      clearTimeout(pressTimer.current);
      const x = Math.max(-70, Math.min(70, dx * 0.7));
      const y = Math.max(-70, Math.min(70, dy * 0.7));
      setDotPosition({ x, y });
      if (!discoveries.includes('drag')) unlock('drag', 'you moved it.', 'shift');
    }
  };

  const handlePointerUp = () => {
    clearTimeout(pressTimer.current);
    pointerStart.current = null;
  };

  const handleTap = () => {
    const now = Date.now();
    rapidTaps.current = [...rapidTaps.current.filter((time) => now - time < 1800), now];
    if (rapidTaps.current.length >= 4) {
      rapidTaps.current = [];
      setShowSymbol(true);
      setMood('glitch');
      unlock('symbol', 'there is a shape inside.', 'glitch');
      window.setTimeout(() => setMood('still'), 1000);
    }
    if (pressTriggered.current) {
      pressTriggered.current = false;
      return;
    }
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current === 2) {
      tapCount.current = 0;
      setMood('shift');
      setPulse((value) => value + 1);
      unlock('double-tap', 'something moved.', 'shift');
      window.setTimeout(() => setMood('still'), 900);
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapCount.current = 0;
      setPulse((value) => value + 1);
      setMood('blink');
      window.setTimeout(() => setMood('still'), 500);
    }, 260);
  };

  useEffect(() => {
    stillTimer.current = window.setTimeout(() => {
      unlock('waiting', 'you waited.', 'breathe');
    }, 45000);

    if (!visitHandled.current) {
      visitHandled.current = true;
      let visits = 0;
      try {
        visits = Number(localStorage.getItem(VISIT_KEY) || '0') + 1;
        localStorage.setItem(VISIT_KEY, String(visits));
      } catch {
        visits = 0;
      }
      if (visits >= 3) {
        window.setTimeout(() => unlock('third-visit', 'you came back.', 'returning'), 1800);
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(stillTimer.current);
      } else {
        stillTimer.current = window.setTimeout(() => {
          unlock('return', 'back again.', 'reveal');
        }, 12000);
      }
    };

    const onMotion = (event) => {
      const now = Date.now();
      if (now - lastMotion.current < 1800) return;
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      if (magnitude > 19) {
        lastMotion.current = now;
        setMood('shift');
        unlock('shake', 'you moved.', 'shift');
        window.setTimeout(() => setMood('still'), 1100);
      }
    };

    window.addEventListener('devicemotion', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(pressTimer.current);
      clearTimeout(tapTimer.current);
      clearTimeout(stillTimer.current);
      clearTimeout(edgeTimer.current);
      window.removeEventListener('devicemotion', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [unlock]);

  useEffect(() => {
    if (!isAwake) return undefined;
    let direction = 1;
    const timer = window.setInterval(() => {
      setDotPosition((current) => {
        const nextX = Math.max(-42, Math.min(42, current.x + (Math.random() * 26 + 10) * direction));
        const nextY = Math.max(-42, Math.min(42, current.y + (Math.random() * 22 - 11)));
        direction *= -1;
        return { x: nextX, y: nextY };
      });
      setPulse((value) => value + 1);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [isAwake]);

  const handleSecretTap = () => {
    edgeTaps.current += 1;
    clearTimeout(edgeTimer.current);
    edgeTimer.current = window.setTimeout(() => {
      if (edgeTaps.current >= 3) {
        setShowArchive((value) => !value);
        unlock('archive', 'nothing remembers.');
      } else {
        setShowMark((value) => !value);
        unlock('edge', 'there was a way in.');
      }
      edgeTaps.current = 0;
    }, 450);
  };

  return (
    <main className={"nothing-screen mood-" + mood + (isAwake ? " mood-awake" : "")} aria-label="nothing">
      <button
        className={"void-button pulse-" + (pulse % 3)}
        type="button"
        aria-label="Nothing"
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className={"void-dot" + (showSymbol ? " void-dot-symbol" : "")} style={{ "--dot-x": dotPosition.x + "px", "--dot-y": dotPosition.y + "px" }} />
      </button>
      <div className={"whisper " + (secret ? 'whisper-visible' : '')} aria-live="polite">
        {secret || (isAwake ? 'you found me.' : '')}
      </div>
      <button className="edge-trigger" type="button" aria-label="A hidden detail" onClick={handleSecretTap}>
        {showMark ? <span className="tiny-mark">·</span> : null}
      </button>
      {showSymbol && (
        <button className="symbol-dismiss" type="button" aria-label="Hide discovered symbol" onClick={() => setShowSymbol(false)}>
          <span className="hidden-symbol" />
        </button>
      )}

      {showArchive && (
        <section className="archive" role="dialog" aria-label="Levels and achievements">
          <div className="archive-title">nothing found</div>
          <div className="archive-level">LEVEL {getLevel(discoveries.length).number}</div>
          <div className="archive-level-name">{getLevel(discoveries.length).name}</div>
          <div className="archive-progress">{String(Math.min(discoveries.length, 7)).padStart(2, '0')} / 07</div>
          <div className="archive-line" />
          <div className="achievement-heading">achievements</div>
          <div className="achievement-list">
            {ACHIEVEMENTS.map((item) => {
              const earned = discoveries.includes(item.id);
              return (
                <div className={"achievement" + (earned ? " achievement-earned" : "")} key={item.id}>
                  <span className="achievement-icon">{earned ? '●' : '○'}</span>
                  <span className="achievement-copy">
                    <span className="achievement-title">{earned ? item.title : '???'}</span>
                    <span className="achievement-hint">{earned ? 'unlocked' : item.hint}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <button className="archive-close" type="button" onClick={() => setShowArchive(false)} aria-label="Close archive">×</button>
        </section>
      )}
      {discoveries.length > 0 && !showArchive && (
        <div className="discovery-count" aria-label={discoveries.length + " secrets discovered"}>
          {String(discoveries.length).padStart(2, '0')}
        </div>
      )}
    </main>
  );
}