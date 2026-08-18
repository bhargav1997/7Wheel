import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Zap, Volume2, VolumeX, Sparkles, Trophy, History, Play, Square, Flame, Crown, Gem, ShieldCheck, Star, Disc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import axios from 'axios';
import toast from 'react-hot-toast';

// ── Symbol Config ────────────────────────────────────────────────────────────
const SYMBOLS = {
  seven:  { label: 'Seven 777', color: 'text-yellow-400' },
  gem:    { label: 'Diamond', color: 'text-cyan-400' },
  bar:    { label: 'BAR Emblem', color: 'text-emerald-400' },
  star:   { label: 'Gold Star', color: 'text-amber-400' },
  bell:   { label: 'Lightning', color: 'text-purple-400' },
  lemon:  { label: 'Golden Disc', color: 'text-yellow-500' },
  cherry: { label: 'Red Flame', color: 'text-red-500' },
  wild:   { label: 'Wild Emblem', color: 'text-pink-400' },
};

function SymbolIcon({ symbolKey, size = 32 }) {
  switch (symbolKey) {
    case 'seven':
      return (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center font-display font-black text-2xl text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] border-2 border-yellow-200">
          7
        </div>
      );
    case 'gem':
      return <Gem size={size} className="text-cyan-400 filter drop-shadow-[0_0_12px_#06b6d4]" />;
    case 'bar':
      return (
        <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 font-display font-black text-xs text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-300 tracking-wider">
          BAR
        </div>
      );
    case 'star':
      return <Star size={size} className="text-amber-400 fill-amber-400 filter drop-shadow-[0_0_12px_#f59e0b]" />;
    case 'bell':
      return <Zap size={size} className="text-purple-400 fill-purple-400 filter drop-shadow-[0_0_12px_#a855f7]" />;
    case 'lemon':
      return <Disc size={size} className="text-yellow-400 filter drop-shadow-[0_0_12px_#eab308]" />;
    case 'cherry':
      return <Flame size={size} className="text-red-500 fill-red-500 filter drop-shadow-[0_0_12px_#ef4444]" />;
    case 'wild':
      return (
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] border border-pink-400/50">
          <Sparkles size={20} />
        </div>
      );
    default:
      return <Sparkles size={size} className="text-brand-400" />;
  }
}

const PAYTABLE = [
  { combo: 'seven',   mult: '50×', label: 'Jackpot 777 Trio', highlight: true, color: 'from-amber-500/20 to-yellow-500/20 text-yellow-300' },
  { combo: 'gem',     mult: '25×', label: 'Diamond Trio', highlight: true, color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300' },
  { combo: 'bar',     mult: '15×', label: 'BAR Emblem Triple', highlight: false },
  { combo: 'star',    mult: '10×', label: 'Gold Star Trio', highlight: false },
  { combo: 'bell',    mult: '8×',  label: 'Thunder Volt Trio', highlight: false },
  { combo: 'lemon',   mult: '5×',  label: 'Golden Disc Trio', highlight: false },
  { combo: 'cherry',  mult: '3×',  label: 'Red Flame Trio', highlight: false },
  { combo: 'cherry2', mult: '1.5×',label: 'Double Flame Combo', highlight: false },
  { combo: 'wild',    mult: 'WILD',label: 'Wild Emblem — Substitutes Any Symbol', highlight: false },
];

const REEL_KEYS = Object.keys(SYMBOLS);

// ── Particle Canvas Overlay ──────────────────────────────────────────────────
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

    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'];
    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.8) * 14,
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
        p.vy += 0.4; // gravity
        p.alpha -= 0.015;
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

      if (alive && Date.now() - startTime < 2500) {
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

// ── Single Reel Column ───────────────────────────────────────────────────────
function SingleReel({ finalSymbol, spinning, stopDelay, onStop, reelIndex }) {
  const [symbols, setSymbols] = useState(['lemon', 'seven', 'cherry']);
  const finalSymbolRef = useRef(finalSymbol);
  finalSymbolRef.current = finalSymbol;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const startSpin = useCallback(() => {
    let idx = Math.floor(Math.random() * REEL_KEYS.length);

    const intervalId = setInterval(() => {
      idx = (idx + 1) % REEL_KEYS.length;
      const prev = REEL_KEYS[(idx + REEL_KEYS.length - 1) % REEL_KEYS.length];
      const curr = REEL_KEYS[idx];
      const next = REEL_KEYS[(idx + 1) % REEL_KEYS.length];
      setSymbols([prev, curr, next]);
    }, 60);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      const target = finalSymbolRef.current || 'seven';
      const targetIdx = REEL_KEYS.indexOf(target);
      const safeIdx = targetIdx >= 0 ? targetIdx : 0;
      const prev = REEL_KEYS[(safeIdx + REEL_KEYS.length - 1) % REEL_KEYS.length];
      const curr = REEL_KEYS[safeIdx];
      const next = REEL_KEYS[(safeIdx + 1) % REEL_KEYS.length];
      setSymbols([prev, curr, next]);
      onStopRef.current?.();
    }, stopDelay);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [stopDelay]);

  useEffect(() => {
    if (spinning) {
      return startSpin();
    }
  }, [spinning, startSpin]);

  return (
    <div className="relative flex-1 max-w-[120px] h-52 md:h-60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border-2 border-slate-700/80 shadow-2xl overflow-hidden flex flex-col items-center justify-between py-2 group">
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none z-20" />
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20" />

      {/* Payline highlight band across center */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-20 bg-brand-500/10 border-y border-brand-500/40 pointer-events-none z-10 shadow-[0_0_15px_rgba(168,85,247,0.2)]" />

      {/* Symbols vertical track */}
      <div className="w-full flex flex-col items-center justify-around h-full relative z-0">
        {symbols.map((symKey, posIndex) => {
          const isCenter = posIndex === 1;

          return (
            <motion.div
              key={posIndex + '-' + symKey}
              animate={{
                scale: isCenter && !spinning ? 1.15 : 0.85,
                opacity: isCenter ? 1 : 0.35,
                filter: spinning ? 'blur(1.5px)' : 'blur(0px)',
              }}
              transition={{ duration: 0.15 }}
              className={`flex items-center justify-center select-none ${
                isCenter ? 'z-10 font-bold' : ''
              }`}
            >
              <SymbolIcon symbolKey={symKey} size={32} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Slot Machine Page Component ─────────────────────────────────────────
export default function SlotMachine() {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { playSpin, playWin, playLose, playClick, soundEnabled, toggleSound } = useSounds();

  const [betAmount, setBetAmount] = useState('25');
  const [reels, setReels] = useState(['seven', 'seven', 'seven']);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({ spins: 0, won: 0, maxWin: 0 });
  const [recentWins, setRecentWins] = useState([]);
  const [pendingReels, setPendingReels] = useState(null);
  const [handlePulled, setHandlePulled] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const pendingReelsRef = useRef(null);
  const autoSpinRef = useRef(autoSpinCount);
  autoSpinRef.current = autoSpinCount;
  const spinningRef = useRef(spinning);
  spinningRef.current = spinning;

  const balance = user?.balance ?? 0;
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  // Spin Action
  const handleSpin = useCallback(async () => {
    if (spinningRef.current) return;
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet < 1) {
      toast.error('Minimum bet is 1 credit');
      setAutoSpinCount(0);
      return;
    }
    if (bet > balanceRef.current) {
      setShowInsufficientModal(true);
      setAutoSpinCount(0);
      return;
    }

    playSpin();
    setHandlePulled(true);
    setTimeout(() => setHandlePulled(false), 400);

    spinningRef.current = true;
    setSpinning(true);
    setStoppedCount(0);
    setResult(null);
    setPendingReels(null);

    // 1) Immediately deduct wager upfront from local balance when pulling spin
    updateBalance((prev) => Math.max(0, prev - bet));

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post(
        '/api/slots/spin',
        { betAmount: bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const nextData = { reels: data.reels, result: data };
      pendingReelsRef.current = nextData;
      setPendingReels(nextData);
    } catch (err) {
      // Refund wager if API spin fails
      updateBalance((prev) => prev + bet);
      spinningRef.current = false;
      setSpinning(false);
      setAutoSpinCount(0);
      toast.error(err.response?.data?.message || 'Spin failed. Try again.');
    }
  }, [betAmount, playSpin, updateBalance]);

  const handleSpinRef = useRef(handleSpin);
  handleSpinRef.current = handleSpin;

  // Handle individual reel stops
  const handleReelStop = useCallback(() => {
    setSpinning((prevSpinning) => {
      // Once reels finish stopping in sequence
      return prevSpinning;
    });
  }, []);

  const [stoppedCount, setStoppedCount] = useState(0);

  const onSingleReelStopped = useCallback(() => {
    setStoppedCount((prev) => {
      const next = prev + 1;
      if (next === 3 && pendingReelsRef.current) {
        const { reels: finalReels, result: finalResult } = pendingReelsRef.current;
        setReels(finalReels);
        setResult(finalResult);
        setSpinning(false);

        // Update stats
        setSessionStats((s) => ({
          spins: s.spins + 1,
          won: s.won + (finalResult.win ? finalResult.payout : 0),
          maxWin: Math.max(s.maxWin, finalResult.win ? finalResult.payout : 0),
        }));

        // 2) Update balance with payout only when all 3 reels finish spinning!
        if (finalResult.win && finalResult.payout > 0) {
          updateBalance((prev) => prev + finalResult.payout);
        }

        if (finalResult.win) {
          playWin();
          setRecentWins((prev) => [
            {
              id: Date.now(),
              combo: finalResult.combo,
              payout: finalResult.payout,
              mult: finalResult.multiplier,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
            ...prev.slice(0, 4),
          ]);
        } else {
          playLose();
        }

        // Auto spin loop trigger
        if (autoSpinRef.current > 0) {
          setAutoSpinCount((c) => {
            const nextCount = c - 1;
            if (nextCount > 0) {
              setTimeout(() => {
                handleSpinRef.current?.();
              }, 600);
            }
            return nextCount;
          });
        }
      }
      return next;
    });
  }, [playWin, playLose]);

  const startAutoSpin = (count) => {
    playClick();
    setAutoSpinCount(count);
    if (!spinningRef.current) {
      handleSpin();
    }
  };

  const stopAutoSpin = () => {
    playClick();
    setAutoSpinCount(0);
  };

  const canSpin = !spinning && parseInt(betAmount, 10) >= 10 && parseInt(betAmount, 10) <= balance;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-brand-500/10 blur-[100px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Top Controls Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { playClick(); navigate('/play'); }}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
            Lobby
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
            >
              {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={() => { playClick(); setShowPaytable(true); }}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-3.5 py-2 rounded-xl border border-brand-500/30 hover:border-brand-400/50 transition-all shadow-sm"
            >
              <HelpCircle size={15} />
              Paytable
            </button>
          </div>
        </div>

        {/* Slot Cabinet Frame */}
        <div className="relative card p-6 md:p-8 border-2 border-amber-500/30 bg-slate-950/80 backdrop-blur-xl shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-3xl overflow-hidden">
          {/* Confetti Explosion on Win */}
          <ConfettiCanvas active={Boolean(result?.win && !spinning)} />

          {/* Golden Header Badge */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="font-display font-black text-xl md:text-2xl text-white tracking-wide flex items-center gap-2">
                  7WHEEL SLOTS
                  <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                    VIP 3-REEL
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">Match 3 symbols or 2 cherries for instant payouts!</p>
              </div>
            </div>

            {/* Jackpot Tag */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1">
                <Sparkles size={12} /> Top Win
              </span>
              <span className="font-display font-black text-lg text-yellow-400">50× MULTIPLIER</span>
            </div>
          </div>

          {/* Machine Outer Housing & Reels */}
          <div className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-4 border-slate-800 rounded-3xl p-4 md:p-6 shadow-inner space-y-4">
            
            {/* Payline Side Arrows */}
            <div className="absolute top-1/2 -left-2 -translate-y-1/2 text-brand-400 animate-pulse hidden sm:block">
              ▶
            </div>
            <div className="absolute top-1/2 -right-2 -translate-y-1/2 text-brand-400 animate-pulse hidden sm:block">
              ◀
            </div>

            {/* Reels Grid */}
            <div className="flex items-center justify-center gap-3 md:gap-6 py-2">
              {[0, 1, 2].map((i) => (
                <SingleReel
                  key={i}
                  finalSymbol={pendingReels?.reels?.[i] ?? reels[i]}
                  spinning={spinning}
                  stopDelay={800 + i * 350}
                  onStop={() => {
                    if (i === 0) setStoppedCount(0);
                    onSingleReelStopped();
                  }}
                  reelIndex={i}
                />
              ))}
            </div>

            {/* Dynamic Result / Payline Banner */}
            <div className="h-16 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {result && !spinning ? (
                  <motion.div
                    key="win-banner"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`w-full py-3 px-4 rounded-2xl text-center border font-display flex items-center justify-center gap-3 ${
                      result.win
                        ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    {result.win ? (
                      <>
                        <Trophy size={20} className="text-yellow-400 animate-bounce" />
                        <div>
                          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 block">
                            {result.multiplier >= 25 ? 'MEGA JACKPOT WIN!' : result.multiplier >= 10 ? 'BIG WIN!' : 'WINNER!'}
                          </span>
                          <span className="text-2xl font-black text-white tracking-tight">
                            +{result.payout.toLocaleString()} Credits
                          </span>
                          <span className="text-xs text-emerald-400/80 ml-2 font-bold">({result.multiplier}×)</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-slate-400">No match this spin — Try again!</span>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-xs text-slate-500 font-medium tracking-wide uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                    {spinning ? 'Spinning Reels…' : 'Set Wager and Click Spin to Play'}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Spin & Control Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              
              {/* Main Spin Button (3 columns wide on desktop) */}
              <motion.button
                onClick={() => { setStoppedCount(0); handleSpin(); }}
                disabled={!canSpin}
                whileHover={canSpin ? { scale: 1.01 } : {}}
                whileTap={canSpin ? { scale: 0.97 } : {}}
                className={`md:col-span-3 py-4 px-6 rounded-2xl font-display font-black text-xl tracking-wider uppercase flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
                  canSpin
                    ? 'bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:via-brand-400 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/40'
                }`}
              >
                {spinning ? (
                  <>
                    <motion.div
                      className="w-6 h-6 border-3 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Spinning…</span>
                  </>
                ) : (
                  <>
                    <Zap size={22} className="fill-white text-white" />
                    <span>SPIN — {betAmount} Credits</span>
                  </>
                )}
              </motion.button>

              {/* Auto Spin Toggle */}
              {autoSpinCount > 0 ? (
                <button
                  onClick={stopAutoSpin}
                  className="py-4 px-4 rounded-2xl font-display font-bold text-xs bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Square size={14} className="fill-red-400" />
                  Stop Auto ({autoSpinCount})
                </button>
              ) : (
                <div className="relative group">
                  <button
                    disabled={spinning || !canSpin}
                    className="w-full h-full py-4 px-3 rounded-2xl font-display font-bold text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play size={14} />
                    Auto Spin
                  </button>

                  {/* Auto Spin Dropup menu on hover */}
                  {!spinning && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto flex flex-col gap-1 z-30">
                      {[5, 10, 25].map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => startAutoSpin(cnt)}
                          className="w-full text-center py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-brand-500 hover:text-white transition-colors"
                        >
                          {cnt} Spins
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wager Selection & Quick Buttons */}
        <div className="card p-5 border border-slate-800 bg-slate-950/60 backdrop-blur-md rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Coins size={20} className="text-yellow-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400 font-medium block">Bet Amount</span>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  min="1"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={spinning || autoSpinCount > 0}
                  className="input-field w-24 text-sm font-black text-center py-1.5 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                />
                <Coins size={14} className="text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Quick Bet Options */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
            {[10, 25, 50, 100, 250].map((v) => (
              <button
                key={v}
                onClick={() => { playClick(); setBetAmount(String(v)); }}
                disabled={spinning || autoSpinCount > 0}
                className={`text-xs font-extrabold px-3 py-2 rounded-xl border transition-all ${
                  betAmount === String(v)
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                } disabled:opacity-40`}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => { playClick(); setBetAmount(String(Math.floor(balance / 2))); }}
              disabled={spinning || autoSpinCount > 0 || balance < 20}
              className="text-xs font-extrabold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 text-amber-400 transition-all disabled:opacity-40"
            >
              ½
            </button>
            <button
              onClick={() => { playClick(); setBetAmount(String(balance)); }}
              disabled={spinning || autoSpinCount > 0 || balance < 1}
              className="text-xs font-extrabold px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500 text-red-400 transition-all disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Session Stats & Recent Wins */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Session Overview Card */}
          <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Session Spins</p>
              <p className="text-xl font-black text-white font-display mt-0.5">{sessionStats.spins}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <History size={18} />
            </div>
          </div>

          <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Session Won</p>
              <p className="text-xl font-black text-emerald-400 font-display mt-0.5">+{sessionStats.won.toLocaleString()} Credits</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Coins size={18} />
            </div>
          </div>

          <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Highest Win</p>
              <p className="text-xl font-black text-yellow-400 font-display mt-0.5">
                {sessionStats.maxWin > 0 ? `+${sessionStats.maxWin.toLocaleString()} Credits` : '0 Credits'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Trophy size={18} />
            </div>
          </div>
        </div>

        {/* Live Session Wins Log */}
        {recentWins.length > 0 && (
          <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Flame size={14} className="text-amber-400" /> Recent Hits This Session
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {recentWins.map((w) => (
                <div key={w.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-400">+{w.payout.toLocaleString()} Credits</span>
                  <span className="text-[10px] text-slate-500 font-mono">{w.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Paytable Modal */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPaytable(false)}
          >
            <motion.div
              className="card w-full max-w-md p-6 border border-slate-800 bg-slate-950 shadow-2xl rounded-3xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={22} className="text-yellow-400" />
                  <h1 className="font-display font-black text-xl text-white">Classic 777 Slots</h1>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {PAYTABLE.map((row) => (
                  <div
                    key={row.combo}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      row.color
                        ? `bg-gradient-to-r ${row.color} border-amber-500/30`
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{row.label}</span>
                    <span className="font-black text-sm text-yellow-400 font-display">{row.mult}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 text-center">
                <p><strong>Wild Symbol</strong> substitutes for any symbol to form a winning combo.</p>
                <p>Minimum wager is <strong>10 Credits</strong> · All outcomes are server-verified.</p>
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
