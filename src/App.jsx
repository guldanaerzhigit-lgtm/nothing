import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'nothing-discoveries-v1';

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
  const [pulse, setPulse] = useState(0);
  const [secret, setSecret] = useState('');
  const pressTimer = useRef(null);
  const pressTriggered = useRef(false);
  const tapTimer = useRef(null);
  const tapCount = useRef(0);
  const lastMotion = useRef(0);
  const stillTimer = useRef(null);
  const pointerStart = useRef(null);

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
    if (Math.hypot(dx, dy) > 18) clearTimeout(pressTimer.current);
  };

  const handlePointerUp = () => {
    clearTimeout(pressTimer.current);
    pointerStart.current = null;
  };

  const handleTap = () => {
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
      window.removeEventListener('devicemotion', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [unlock]);

  const handleSecretTap = () => {
    setShowMark((value) => !value);
    if (!discoveries.includes('edge')) unlock('edge', 'there was a way in.');
  };

  return (
    <main className={"nothing-screen mood-" + mood} aria-label="nothing">
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
        <span className="void-dot" />
      </button>
      <div className={"whisper " + (secret ? 'whisper-visible' : '')} aria-live="polite">
        {secret}
      </div>
      <button className="edge-trigger" type="button" aria-label="A hidden detail" onClick={handleSecretTap}>
        {showMark ? <span className="tiny-mark">·</span> : null}
      </button>
      {discoveries.length > 0 && (
        <div className="discovery-count" aria-label={discoveries.length + " secrets discovered"}>
          {String(discoveries.length).padStart(2, '0')}
        </div>
      )}
    </main>
  );
}