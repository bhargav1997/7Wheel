import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Coins, HelpCircle, X, Volume2, VolumeX, ShieldAlert, Sparkles,
  Trophy, Play, RotateCcw, Award, Zap, Castle, Flame, Skull, Gem, ShieldCheck,
  ChevronRight, ArrowUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import axios from 'axios';
import toast from 'react-hot-toast';

// ── Confetti Canvas Overlay ──────────────────────────────────────────────────
function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#ef4444', '#a855f7'];
    const particles = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 150,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    }));

    let startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.alpha -= 0.012;
        p.rotation += p.vRot;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive && Date.now() - startTime < 3000) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-3xl"
    />
  );
}

// ── Difficulty Modes & Paytables ─────────────────────────────────────────────
const DIFFICULTY_MODES = {
  EASY: {
    label: 'Easy',
    doors: 4,
    traps: 1,
    safes: 3,
    color: 'from-emerald-600 to-teal-700',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentBorder: 'border-emerald-500/50',
    multipliers: [1.29, 1.69, 2.21, 2.89, 3.78, 4.94, 6.46, 8.45, 11.05],
  },
  MEDIUM: {
    label: 'Medium',
    doors: 3,
    traps: 1,
    safes: 2,
    color: 'from-amber-600 to-yellow-700',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentBorder: 'border-amber-500/50',
    multipliers: [1.45, 2.13, 3.12, 4.58, 6.72, 9.86, 14.47, 21.23, 31.14],
  },
  HARD: {
    label: 'Hard',
    doors: 2,
    traps: 1,
    safes: 1,
    color: 'from-red-600 to-rose-700',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    accentBorder: 'border-red-500/50',
    multipliers: [1.94, 3.80, 7.45, 14.60, 28.62, 56.09, 109.94, 215.48, 422.34],
  },
  MASTER: {
    label: 'Master',
    doors: 3,
    traps: 2,
    safes: 1,
    color: 'from-purple-600 via-pink-600 to-indigo-700',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accentBorder: 'border-purple-500/50',
    multipliers: [2.91, 8.55, 25.14, 73.91, 217.30, 638.86, 1878.25, 5522.05, 16234.80],
  },
};

export default function Tower() {
  const navigate = useNavigate();
  const { user, token, updateBalance } = useAuth();
  const { playClick, playWin, playLose, playStreak, soundEnabled, toggleSound } = useSounds();

  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [betAmount, setBetAmount] = useState('25');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(0); // 0 to 9
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [history, setHistory] = useState([]); // [{ floor, doorIndex, isSafe }]
  const [revealedLayout, setRevealedLayout] = useState(null); // When busted or conquered
  const [bustedFloor, setBustedFloor] = useState(null);
  const [bustedDoor, setBustedDoor] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const towerScrollRef = useRef(null);

  const balance = user?.balance ?? 0;
  const currentCfg = DIFFICULTY_MODES[difficulty];
  const currentPayout = Math.floor(Number(betAmount) * currentMultiplier);

  const getAuthToken = () => token || localStorage.getItem('7wheel_token');

  // Check active session on mount
  useEffect(() => {
    const checkState = async () => {
      const authToken = getAuthToken();
      if (!authToken) return;

      try {
        const { data } = await axios.get('/api/tower/state', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (data.active && data.game) {
          setDifficulty(data.game.difficulty);
          setBetAmount(String(data.game.betAmount));
          setCurrentFloor(data.game.currentFloor);
          setCurrentMultiplier(data.game.currentMultiplier);
          setHistory(data.game.history || []);
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('Fetch tower state error:', err);
      }
    };

    checkState();
  }, []);

  // Auto-scroll active floor into view
  useEffect(() => {
    if (towerScrollRef.current && isPlaying) {
      const activeEl = towerScrollRef.current.querySelector(`#tower-floor-${currentFloor}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentFloor, isPlaying]);

  // Start round
  const handleStart = async () => {
    if (loadingAction || isPlaying) return;
    const bet = parseInt(betAmount, 10);

    if (isNaN(bet) || bet < 1) {
      toast.error('Minimum bet is 1 credit');
      return;
    }
    if (bet > balance) {
      setShowInsufficientModal(true);
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      toast.error('Please log in to play');
      return;
    }

    try {
      setLoadingAction(true);
      setShowWinConfetti(false);
      setRevealedLayout(null);
      setBustedFloor(null);
      setBustedDoor(null);
      playClick();

      const { data } = await axios.post(
        '/api/tower/start',
        { betAmount: bet, difficulty },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (data.balance !== undefined) updateBalance(data.balance);
      setIsPlaying(true);
      setCurrentFloor(data.game.currentFloor);
      setCurrentMultiplier(data.game.currentMultiplier);
      setHistory(data.game.history || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start climb');
    } finally {
      setLoadingAction(false);
    }
  };

  // Step on door
  const handleStep = async (floorIdx, doorIdx) => {
    if (!isPlaying || loadingAction || floorIdx !== currentFloor) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoadingAction(true);
      playClick();

      const { data } = await axios.post(
        '/api/tower/step',
        { doorIndex: doorIdx },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (data.status === 'SAFE') {
        playStreak();
        setCurrentFloor(data.currentFloor);
        setCurrentMultiplier(data.currentMultiplier);
        setHistory(data.history || []);
        toast.success(`Floor ${data.currentFloor} Cleared! (${data.currentMultiplier}×)`, {
          duration: 1500,
          icon: '💎',
        });
      } else if (data.status === 'CONQUERED') {
        playWin();
        setShowWinConfetti(true);
        setIsPlaying(false);
        setCurrentFloor(9);
        setCurrentMultiplier(data.currentMultiplier);
        setRevealedLayout(data.fullLayout);
        if (data.balance !== undefined) updateBalance(data.balance);
        toast.success(`🏆 TOWER CONQUERED! Won +${data.payout.toLocaleString()} Credits!`, {
          duration: 5000,
        });
      } else if (data.status === 'BUSTED') {
        playLose();
        setIsPlaying(false);
        setBustedFloor(floorIdx);
        setBustedDoor(doorIdx);
        setRevealedLayout(data.fullLayout);
        toast.error('💥 Trap Skull hit! Round over.', { duration: 3000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error stepping on floor');
    } finally {
      setLoadingAction(false);
    }
  };

  // Cash out
  const handleCashout = async () => {
    if (!isPlaying || loadingAction || currentFloor === 0) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoadingAction(true);
      playClick();

      const { data } = await axios.post(
        '/api/tower/cashout',
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      playWin();
      setShowWinConfetti(true);
      setIsPlaying(false);
      setRevealedLayout(data.fullLayout);
      if (data.balance !== undefined) updateBalance(data.balance);
      toast.success(`💰 Cashed out +${data.payout.toLocaleString()} Credits at ${data.multiplier}×!`, {
        duration: 4000,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cash out');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 relative">
        <ConfettiCanvas active={showWinConfetti} />

        {/* ── Top Bar / Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/play')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors shrink-0"
              title="Back to Lobby"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Castle className="text-purple-400" size={22} />
                <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
                  Tower of Fortune
                  <span className="text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    16,000× TOWER
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Climb 9 floors of mystery doors · Avoid skull traps · Cash out anytime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={16} className="text-purple-400" /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setShowPaytable(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle size={15} className="text-purple-400" />
              <span>How to Play</span>
            </button>
          </div>
        </div>

        {/* ── Main Game Arena (Grid Layout: Controls on Left, Tower in Center, Ladder on Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">

          {/* Left Column: Wager & Difficulty Controls (4 Cols on LG) */}
          <div className="lg:col-span-4 space-y-4">

            {/* Difficulty Selector Card */}
            <div className="card p-4 sm:p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-3 shadow-xl">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-purple-400" /> Difficulty Mode
              </label>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DIFFICULTY_MODES).map(([key, mode]) => {
                  const isSel = difficulty === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isPlaying) return;
                        playClick();
                        setDifficulty(key);
                      }}
                      disabled={isPlaying}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSel
                          ? `bg-gradient-to-br ${mode.color} text-white ${mode.accentBorder} shadow-lg shadow-black/40 ring-1 ring-white/20`
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-black text-sm">{mode.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mode.badgeColor}`}>
                          {mode.doors}D / {mode.traps}💀
                        </span>
                      </div>
                      <span className="text-[11px] opacity-80 block font-mono">
                        Max: {mode.multipliers[8]}×
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wager Input Card */}
            <div className="card p-4 sm:p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} className="text-amber-400" /> Bet Amount
                </label>
                <span className="text-xs font-mono text-slate-500">
                  Balance: <strong className="text-slate-300">{balance.toLocaleString()}</strong> 🪙
                </span>
              </div>

              {/* Amount Input */}
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={balance}
                  disabled={isPlaying}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl py-3 px-4 text-white font-mono font-bold text-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
                  placeholder="25"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setBetAmount(String(Math.max(1, Math.floor(Number(betAmount) / 2))))}
                    disabled={isPlaying}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    ½
                  </button>
                  <button
                    onClick={() => setBetAmount(String(Math.min(balance, Number(betAmount) * 2)))}
                    disabled={isPlaying}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    2×
                  </button>
                  <button
                    onClick={() => setBetAmount(String(balance))}
                    disabled={isPlaying}
                    className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Quick Chips */}
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    disabled={isPlaying}
                    onClick={() => {
                      playClick();
                      setBetAmount(String(amt));
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      betAmount === String(amt)
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    } disabled:opacity-40`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Main Action Button (Start or Cash Out) */}
              {!isPlaying ? (
                <motion.button
                  onClick={handleStart}
                  disabled={loadingAction || balance < 1}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl font-display font-black text-base uppercase tracking-wider bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:brightness-110 text-white shadow-xl shadow-purple-500/25 border border-purple-400/30 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Play size={18} className="fill-white" />
                  START CLIMB — {betAmount} 🪙
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleCashout}
                  disabled={loadingAction || currentFloor === 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-2xl font-display font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all ${
                    currentFloor > 0
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 border border-emerald-300 shadow-emerald-500/30 hover:brightness-110 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Gem size={20} className={currentFloor > 0 ? 'animate-bounce fill-slate-950' : ''} />
                  {currentFloor > 0 ? (
                    <span>CASH OUT +{currentPayout.toLocaleString()} 🪙 ({currentMultiplier}×)</span>
                  ) : (
                    <span>PICK FLOOR 1 TO CASH OUT</span>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Center Column: The 9-Floor Castle Tower (5 Cols on LG) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div
              ref={towerScrollRef}
              className="w-full card p-4 sm:p-5 border-2 border-purple-500/30 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 rounded-3xl shadow-2xl space-y-2 max-h-[620px] overflow-y-auto relative"
            >
              {/* Top Treasury Crown Header */}
              <div className="text-center py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 flex items-center justify-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                  Floor 9 · Top Treasury ({currentCfg.multipliers[8]}×)
                </span>
              </div>

              {/* 9 Floors (Rendered from Floor 8 at top down to Floor 0 at bottom) */}
              <div className="flex flex-col gap-2">
                {Array.from({ length: 9 }, (_, i) => 8 - i).map((floorIdx) => {
                  const isCurrent = isPlaying && currentFloor === floorIdx;
                  const isPassed = currentFloor > floorIdx;
                  const isLocked = currentFloor < floorIdx;
                  const mult = currentCfg.multipliers[floorIdx];
                  const stepEntry = history.find((h) => h.floor === floorIdx);

                  return (
                    <motion.div
                      key={floorIdx}
                      id={`tower-floor-${floorIdx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (8 - floorIdx) * 0.03 }}
                      className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                        isCurrent
                          ? 'bg-purple-950/70 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-2 ring-purple-400/40'
                          : isPassed
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-900/40 border-slate-800/80 opacity-70'
                      }`}
                    >
                      {/* Floor Meta Bar */}
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 flex items-center gap-1">
                          <Castle size={11} className={isPassed ? 'text-emerald-400' : isCurrent ? 'text-purple-400' : 'text-slate-500'} />
                          Floor {floorIdx + 1}
                        </span>
                        <span className={`text-xs font-black font-mono ${
                          isPassed ? 'text-emerald-400' : isCurrent ? 'text-amber-300' : 'text-slate-500'
                        }`}>
                          {mult}×
                        </span>
                      </div>

                      {/* Doors Row for this Floor */}
                      <div className="grid grid-flow-col auto-cols-fr gap-2">
                        {Array.from({ length: currentCfg.doors }, (_, doorIdx) => {
                          const isPickedOnThisFloor = stepEntry && stepEntry.doorIndex === doorIdx;
                          const isBustedOnThisDoor = bustedFloor === floorIdx && bustedDoor === doorIdx;
                          const revealedDoorVal = revealedLayout ? revealedLayout[floorIdx]?.[doorIdx] : null;

                          return (
                            <motion.button
                              key={doorIdx}
                              disabled={!isCurrent || loadingAction}
                              onClick={() => handleStep(floorIdx, doorIdx)}
                              whileHover={isCurrent ? { scale: 1.05 } : {}}
                              whileTap={isCurrent ? { scale: 0.95 } : {}}
                              className={`h-12 sm:h-14 rounded-xl border font-display font-black text-sm flex items-center justify-center transition-all relative overflow-hidden ${
                                isBustedOnThisDoor
                                  ? 'bg-red-600/40 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse ring-2 ring-red-400'
                                  : isPickedOnThisFloor
                                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400'
                                  : revealedLayout
                                  ? revealedDoorVal === false
                                    ? 'bg-red-950/40 border-red-800/60 text-red-400/60'
                                    : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400/60'
                                  : isCurrent
                                  ? 'bg-purple-900/50 border-purple-500/80 text-purple-200 hover:bg-purple-600/40 hover:border-purple-400 shadow-md shadow-purple-500/20 cursor-pointer animate-pulse'
                                  : isPassed
                                  ? 'bg-slate-900/30 border-slate-800/50 text-slate-600 cursor-default'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {/* Door State Icon */}
                              {isBustedOnThisDoor ? (
                                <Skull size={22} className="text-red-400 animate-bounce" />
                              ) : isPickedOnThisFloor ? (
                                <Gem size={20} className="text-emerald-300 animate-pulse" />
                              ) : revealedLayout ? (
                                revealedDoorVal === false ? (
                                  <Skull size={16} className="text-red-400/60" />
                                ) : (
                                  <Gem size={16} className="text-emerald-400/60" />
                                )
                              ) : isCurrent ? (
                                <span className="text-xs text-purple-300 font-bold">DOOR {doorIdx + 1}</span>
                              ) : (
                                <span className="text-[11px] opacity-40">🔒</span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Multiplier Ladder & Live Stats (3 Cols on LG) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card p-4 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ArrowUp size={14} className="text-amber-400" /> Multiplier Ladder
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${currentCfg.badgeColor}`}>
                  {difficulty}
                </span>
              </div>

              {/* Ladder list */}
              <div className="flex flex-col gap-1 text-xs">
                {Array.from({ length: 9 }, (_, i) => 8 - i).map((floorIdx) => {
                  const isCurrent = isPlaying && currentFloor === floorIdx;
                  const isPassed = currentFloor > floorIdx;
                  const mult = currentCfg.multipliers[floorIdx];
                  const pot = Math.floor(Number(betAmount) * mult);

                  return (
                    <div
                      key={floorIdx}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-black shadow-md ring-1 ring-purple-400/50'
                          : isPassed
                          ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300 font-bold'
                          : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <span className="text-[11px]">Floor {floorIdx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">{pot.toLocaleString()} 🪙</span>
                        <span className={`font-black ${isPassed ? 'text-emerald-400' : isCurrent ? 'text-amber-300' : 'text-slate-400'}`}>
                          {mult}×
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1 text-xs text-purple-300">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" /> Tower Strategy:
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                You can cash out after any cleared floor! Avoid pushing your luck into skulls if you are in high profit.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* ── How to Play Modal ── */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPaytable(false)}
          >
            <motion.div
              className="card w-full max-w-xl p-6 border border-slate-800 bg-slate-950 shadow-2xl rounded-3xl max-h-[85vh] overflow-y-auto space-y-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Castle size={20} className="text-purple-400" />
                  <h2 className="font-display font-black text-lg text-white">How to Play Tower of Fortune</h2>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  <strong>Tower of Fortune</strong> is a 9-floor vertical risk ladder casino game. On each floor, choose one mystery door.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                    <Gem size={20} className="text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">Safe Crystal 💎</strong>
                      <span className="text-[11px] text-slate-400">Multiplier boosts & unlocks next floor</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                    <Skull size={20} className="text-red-400 shrink-0" />
                    <div>
                      <strong className="text-white block">Trap Skull 💀</strong>
                      <span className="text-[11px] text-slate-400">Round collapses and bet is lost</span>
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-white pt-2">Difficulty Multipliers:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="text-left py-1.5">Floor</th>
                        <th className="text-center py-1.5">Easy (4D/1💀)</th>
                        <th className="text-center py-1.5">Medium (3D/1💀)</th>
                        <th className="text-center py-1.5">Hard (2D/1💀)</th>
                        <th className="text-center py-1.5 text-purple-400">Master (3D/2💀)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 9 }, (_, i) => i).map((f) => (
                        <tr key={f} className="border-b border-slate-800/40 hover:bg-slate-900/40">
                          <td className="py-1.5 font-bold text-slate-300">Floor {f + 1}</td>
                          <td className="text-center text-emerald-400">{DIFFICULTY_MODES.EASY.multipliers[f]}×</td>
                          <td className="text-center text-amber-400">{DIFFICULTY_MODES.MEDIUM.multipliers[f]}×</td>
                          <td className="text-center text-rose-400">{DIFFICULTY_MODES.HARD.multipliers[f]}×</td>
                          <td className="text-center text-purple-400 font-bold">{DIFFICULTY_MODES.MASTER.multipliers[f]}×</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <ShieldAlert size={12} /> Fair probability ~97% RTP house edge.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InsufficientCreditsModal
        open={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        onOpenBuyCredits={() => setShowBuyModal(true)}
      />
      <BuyCreditsModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} />
    </div>
  );
}
