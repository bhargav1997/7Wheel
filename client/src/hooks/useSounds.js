import { useRef, useCallback, useEffect, useState } from 'react';

// useSounds — game sound effects via Web Audio API (no external files needed)
function createAudioCtx() {
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function playTone(ctx, { freq = 440, type = 'sine', duration = 0.2, gain = 0.3, delay = 0 } = {}) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch {}
}

export function useSounds() {
  const ctxRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('7wheel_sound') !== 'off'; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('7wheel_sound', soundEnabled ? 'on' : 'off'); } catch {}
  }, [soundEnabled]);

  const getCtx = useCallback(() => {
    if (!soundEnabled) return null;
    if (!ctxRef.current) ctxRef.current = createAudioCtx();
    if (ctxRef.current?.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [soundEnabled]);

  const playWin = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => playTone(ctx, { freq, type: 'sine', duration: 0.3, gain: 0.22, delay: i * 0.1 }));
  }, [getCtx]);

  const playLose = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return;
    [330, 277].forEach((freq, i) => playTone(ctx, { freq, type: 'triangle', duration: 0.4, gain: 0.18, delay: i * 0.2 }));
  }, [getCtx]);

  const playSpin = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return;
    for (let i = 0; i < 16; i++) {
      playTone(ctx, { freq: 200 + Math.random() * 400, type: 'square', duration: 0.04, gain: 0.07, delay: i * 0.04 });
    }
  }, [getCtx]);

  const playClick = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return;
    playTone(ctx, { freq: 800, type: 'square', duration: 0.05, gain: 0.1 });
  }, [getCtx]);

  const playStreak = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return;
    [523, 659, 1047].forEach((freq, i) => playTone(ctx, { freq, type: 'sine', duration: 0.25, gain: 0.28, delay: i * 0.12 }));
  }, [getCtx]);

  const toggleSound = useCallback(() => setSoundEnabled((v) => !v), []);

  return { soundEnabled, toggleSound, playWin, playLose, playSpin, playClick, playStreak };
}
