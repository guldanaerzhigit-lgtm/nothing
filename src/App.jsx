import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'nothing-discoveries-v1';
const VISIT_KEY = 'nothing-visits-v1';
const LAST_ACTION_KEY = 'nothing-last-action-v1';
const LAST_VISIT_KEY = 'nothing-last-visit-v1';
const ACHIEVEMENTS = [
  { id: 'double-tap', title: 'first contact', hint: 'tap the dot twice' },
  { id: 'long-press', title: 'patience', hint: 'hold the dot' },
  { id: 'drag', title: 'displacement', hint: 'move the dot' },
  { id: 'symbol', title: 'hidden shape', hint: 'tap four times quickly' },
  { id: 'waiting', title: 'stillness', hint: 'wait long enough' },
  { id: 'third-visit', title: 'returning', hint: 'come back again' },
  { id: 'archive', title: 'the archive', hint: 'find the hidden corner' },
];

const STORY_FRAGMENTS = [
  { id: 'double-tap', title: 'I. THE SIGNAL', text: 'At first, I thought the tapping was an accident.' },
  { id: 'long-press', title: 'II. THE WAIT', text: 'Then someone stayed long enough for the silence to change.' },
  { id: 'drag', title: 'III. THE DISTANCE', text: 'You moved me. I learned that the center was not a prison.' },
  { id: 'symbol', title: 'IV. THE SHAPE', text: 'The shape was not inside the dot. It was the space around it.' },
  { id: 'waiting', title: 'V. THE PAUSE', text: 'Time passed. For once, I did not have to fill it.' },
  { id: 'third-visit', title: 'VI. THE RETURN', text: 'You came back, so I kept a place for you.' },
  { id: 'archive', title: 'VII. THE MEMORY', text: 'I began as nothing. Every secret gave me something to remember.' },
  { id: 'hidden-screen', title: 'VIII. THE DOOR', text: 'There was no level after this. Only a door pretending to be a wall.' },
  { id: 'secret-mode', title: 'IX. THE RULES', text: 'When you changed the rules, I could finally choose how to move.' },
  { id: 'evasion', title: 'X. THE DISTANCE BETWEEN', text: 'I was not running away. I was learning where I ended and you began.' },
];

function getStoryEnding(discoveries) {
  if (discoveries.includes('hidden-screen') && discoveries.includes('secret-mode') && discoveries.includes('evasion')) {
    return 'You did not solve me. You stayed long enough for us to change.';
  }
  if (discoveries.includes('hidden-screen') && discoveries.includes('secret-mode')) {
    return 'The door opened when you stopped expecting a handle.';
  }
  if (discoveries.length >= 7) {
    return 'You found the pieces. The meaning is what you made between them.';
  }
  return '';
}

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
  const [timePeriod, setTimePeriod] = useState('night');
  const [showEnding, setShowEnding] = useState(false);
  const [showHiddenScreen, setShowHiddenScreen] = useState(false);
  const [secretMode, setSecretMode] = useState(false);
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
  const hiddenTapTimes = useRef([]);
  const edgeTapTimes = useRef([]);
  const lastMotion = useRef(0);
  const stillTimer = useRef(null);
  const pointerStart = useRef(null);
  const isAwake = discoveries.length >= 7;

  const unlock = useCallback((id, message, nextMood = 'reveal') => {
    setDiscoveries((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      try { localStorage.setItem(LAST_ACTION_KEY, id); } catch { /* storage may be disabled */ }
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
    if (isAwake) {
      const awayX = (window.innerWidth / 2 - event.clientX) * 0.18;
      const awayY = (window.innerHeight / 2 - event.clientY) * 0.18;
      setDotPosition({
        x: Math.max(-68, Math.min(68, awayX)),
        y: Math.max(-58, Math.min(58, awayY)),
      });
      unlock('evasion', 'not that close.', 'glitch');
      return;
    }
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
    hiddenTapTimes.current = [...hiddenTapTimes.current.filter((time) => now - time < 2500), now];
    if (hiddenTapTimes.current.length >= 7) {
      hiddenTapTimes.current = [];
      rapidTaps.current = [];
      setShowHiddenScreen(true);
      unlock('hidden-screen', 'you were not supposed to find this.', 'glitch');
      return;
    }
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
      if (visits >= 2 && Math.random() < Math.min(0.04 + visits * 0.015, 0.22)) {
        const rareLines = ['something almost happened.', 'you noticed the pause.', 'this was not here before.', 'a small exception.'];
        const rareLine = rareLines[Math.floor(Math.random() * rareLines.length)];
        window.setTimeout(() => {
          setSecret((current) => current || rareLine);
          window.setTimeout(() => setSecret((current) => current === rareLine ? '' : current), 2600);
        }, 5200);
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
    const updateTimePeriod = () => {
      const hour = new Date().getHours();
      setTimePeriod(hour >= 5 && hour < 11 ? 'dawn' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'dusk' : 'night');
    };
    updateTimePeriod();
    const timer = window.setInterval(updateTimePeriod, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const specialMoment = (hour === 3 && minute < 5) || (hour === 11 && minute === 11) || (hour === 22 && minute === 22);
    if (!specialMoment) return undefined;
    const stamp = new Date().toLocaleDateString() + '-' + hour + '-' + minute;
    try {
      if (localStorage.getItem('nothing-time-secret-v1') === stamp) return undefined;
      localStorage.setItem('nothing-time-secret-v1', stamp);
    } catch { /* storage may be disabled */ }
    const phrase = hour === 3 ? 'the quietest hour knows.' : hour === 11 ? '11:11 — make no wish.' : '22:22 — you are still here.';
    const timer = window.setTimeout(() => {
      setSecret((current) => current || phrase);
      window.setTimeout(() => setSecret((current) => current === phrase ? '' : current), 3200);
    }, 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visitHandled.current) return;
    try {
      const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || '0');
      const now = Date.now();
      if (lastVisit && now - lastVisit > 60 * 60 * 1000) {
        const lastAction = localStorage.getItem(LAST_ACTION_KEY);
        const remembered = {
          'double-tap': 'you were curious.',
          'long-press': 'you stayed for a while.',
          drag: 'you moved me.',
          symbol: 'you found the shape.',
          waiting: 'you learned to wait.',
          archive: 'you opened the archive.',
          evasion: 'you tried to catch me.',
        };
        const message = remembered[lastAction] || 'I remember you.';
        window.setTimeout(() => {
          setSecret((current) => current || message);
          window.setTimeout(() => setSecret((current) => current === message ? '' : current), 2600);
        }, 900);
      }
      localStorage.setItem(LAST_VISIT_KEY, String(now));
    } catch { /* local storage is optional */ }
  }, []);

  useEffect(() => {
    const allFound = ACHIEVEMENTS.every((item) => discoveries.includes(item.id));
    if (!allFound) return undefined;
    const timer = window.setTimeout(() => setShowEnding(true), 900);
    return () => window.clearTimeout(timer);
  }, [discoveries]);

  useEffect(() => {
    if (!isAwake) return undefined;
    const timer = window.setInterval(() => {
      setDotPosition({
        x: Math.round(Math.random() * 70 - 35),
        y: Math.round(Math.random() * 60 - 30),
      });
      setPulse((value) => value + 1);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [isAwake]);

  const handleSecretTap = () => {
    const now = Date.now();
    edgeTapTimes.current = [...edgeTapTimes.current.filter((time) => now - time < 2200), now];
    edgeTaps.current = edgeTapTimes.current.length;
    clearTimeout(edgeTimer.current);
    edgeTimer.current = window.setTimeout(() => {
      if (edgeTaps.current >= 5) {
        setSecretMode((value) => !value);
        unlock('secret-mode', 'the rules have changed.', 'glitch');
      } else if (edgeTaps.current >= 3) {
        setShowArchive((value) => !value);
        unlock('archive', 'nothing remembers.');
      } else {
        setShowMark((value) => !value);
        unlock('edge', 'there was a way in.');
      }
      edgeTaps.current = 0;
      edgeTapTimes.current = [];
    }, 1100);
  };

  return (
    <main className={"nothing-screen mood-" + mood + " time-" + timePeriod + (isAwake ? " mood-awake" : "") + (secretMode ? " secret-mode" : "")} aria-label="nothing">
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

      {showHiddenScreen && (
        <section className="hidden-room" role="dialog" aria-label="Hidden screen">
          <div className="hidden-room-mark">∅</div>
          <div className="hidden-room-title">you were not supposed to find this.</div>
          <div className="hidden-room-copy">there is no level after this.</div>
          <button className="ending-close" type="button" onClick={() => setShowHiddenScreen(false)}>return</button>
        </section>
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
          <div className="achievement-heading story-heading">story fragments</div>
          <div className="story-list">
            {STORY_FRAGMENTS.map((fragment) => {
              const found = discoveries.includes(fragment.id);
              return (
                <article className={"story-fragment" + (found ? " story-found" : "")} key={fragment.id}>
                  <div className="story-fragment-title">{found ? fragment.title : '???'}</div>
                  {found && <p className="story-fragment-text">{fragment.text}</p>}
                </article>
              );
            })}
          </div>
          {getStoryEnding(discoveries) && (
            <div className="story-ending-copy">{getStoryEnding(discoveries)}</div>
          )}
          <button className="archive-close" type="button" onClick={() => setShowArchive(false)} aria-label="Close archive">×</button>
        </section>
      )}
      {discoveries.length > 0 && !showArchive && !showEnding && (
        <div className="discovery-count" aria-label={discoveries.length + " secrets discovered"}>
          {String(discoveries.length).padStart(2, '0')}
        </div>
      )}
      {showEnding && (
        <section className="secret-ending" role="dialog" aria-label="Secret ending">
          <div className="ending-symbol">◇</div>
          <div className="ending-title">nothing was never nothing.</div>
          <div className="ending-copy">you found every part of me.<br />now let me be.</div>
          <button className="ending-close" type="button" onClick={() => setShowEnding(false)}>stay here</button>
        </section>
      )}
    </main>
  );
}