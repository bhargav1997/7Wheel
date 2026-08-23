import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Coins, HelpCircle, X, Volume2, VolumeX, ShieldAlert, Sparkles,
  Trophy, Play, RotateCcw, Award, Zap, Flame, ChevronUp, ChevronDown,
  RotateCw, FastForward, CheckCircle2, ShieldCheck, Heart, Diamond, Club, Spade
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

// ── Suit Icon Component ──────────────────────────────────────────────────────
const SuitIcon = ({ suit, className = 'w-6 h-6' }) => {
  switch (suit) {
    case 'HEARTS':
      return <span className={`text-rose-500 font-bold ${className}`}>♥</span>;
    case 'DIAMONDS':
      return <span className={`text-red-500 font-bold ${className}`}>♦</span>;
    case 'SPADES':
      return <span className={`text-slate-200 font-bold ${className}`}>♠</span>;
    case 'CLUBS':
      return <span className={`text-cyan-300 font-bold ${className}`}>♣</span>;
    default:
      return null;
  }
};

export default function HiLo() {
  const navigate = useNavigate();
  const { user, token, updateBalance } = useAuth();
  const { playClick, playWin, playLose, playStreak, soundEnabled, toggleSound } = useSounds();

  const [betAmount, setBetAmount] = useState('25');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [streak, setStreak] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [skipsRemaining, setSkipsRemaining] = useState(2);
  const [cardHistory, setCardHistory] = useState([]);
  const [odds, setOdds] = useState(null);
  const [bustedCard, setBustedCard] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const balance = user?.balance ?? 0;
  const currentPayout = Math.floor(Number(betAmount) * currentMultiplier);

  const getAuthToken = () => token || localStorage.getItem('7wheel_token');

  // Check active session on mount
  useEffect(() => {
    const checkState = async () => {
      const authToken = getAuthToken();
      if (!authToken) return;

      try {
        const { data } = await axios.get('/api/hilo/state', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (data.active && data.game) {
          setBetAmount(String(data.game.betAmount));
          setCurrentCard(data.game.currentCard);
          setStreak(data.game.streak);
          setCurrentMultiplier(data.game.currentMultiplier);
          setSkipsRemaining(data.game.skipsRemaining);
          setCardHistory(data.game.cardHistory || []);
          setOdds(data.game.odds);
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('Fetch Hi-Lo state error:', err);
      }
    };

    checkState();
  }, []);

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
      setBustedCard(null);
      playClick();

      const { data } = await axios.post(
        '/api/hilo/start',
        { betAmount: bet },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (data.balance !== undefined) updateBalance(data.balance);
      setIsPlaying(true);
      setCurrentCard(data.game.currentCard);
      setStreak(data.game.streak);
      setCurrentMultiplier(data.game.currentMultiplier);
      setSkipsRemaining(data.game.skipsRemaining);
      setCardHistory(data.game.cardHistory || []);
      setOdds(data.game.odds);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start Hi-Lo');
    } finally {
      setLoadingAction(false);
    }
  };

  // Guess Action
  const handleGuess = async (action) => {
    if (!isPlaying || loadingAction) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoadingAction(true);
      playClick();

      const { data } = await axios.post(
        '/api/hilo/guess',
        { action },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (data.status === 'WIN') {
        playStreak();
        setCurrentCard(data.drawnCard);
        setStreak(data.streak);
        setCurrentMultiplier(data.currentMultiplier);
        setSkipsRemaining(data.skipsRemaining);
        setCardHistory(data.cardHistory || []);
        setOdds(data.odds);
        toast.success(`Correct! Multiplier is now ${data.currentMultiplier}×`, {
          duration: 1500,
          icon: '🔥',
        });
      } else if (data.status === 'SKIPPED') {
        playClick();
        setCurrentCard(data.newCard);
        setSkipsRemaining(data.skipsRemaining);
        setCardHistory(data.cardHistory || []);
        setOdds(data.odds);
        toast(`Card Skipped (${data.skipsRemaining} remaining)`, { icon: '⏭️' });
      } else if (data.status === 'BUSTED') {
        playLose();
        setIsPlaying(false);
        setBustedCard(data.drawnCard);
        toast.error(`Lost! Drawn card was ${data.drawnCard.label} of ${data.drawnCard.suit}.`, {
          duration: 3000,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing guess');
    } finally {
      setLoadingAction(false);
    }
  };

  // Cash out
  const handleCashout = async () => {
    if (!isPlaying || loadingAction || streak === 0) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      setLoadingAction(true);
      playClick();

      const { data } = await axios.post(
        '/api/hilo/cashout',
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      playWin();
      setShowWinConfetti(true);
      setIsPlaying(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
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
                <Flame className="text-rose-400" size={22} />
                <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
                  Hi-Lo Card Streak
                  <span className="text-[10px] bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    10,000× STREAKS
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Predict Higher, Lower, Red, or Black · Stack streak multipliers · Cash out anytime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={16} className="text-rose-400" /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setShowPaytable(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle size={15} className="text-rose-400" />
              <span>Rules & Odds</span>
            </button>
          </div>
        </div>

        {/* ── Main Game Arena (Grid: Left Wager Controls, Center Card Table, Right Card History Ribbon) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">

          {/* Left Column: Wager Controls (4 Cols on LG) */}
          <div className="lg:col-span-4 space-y-4">

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
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl py-3 px-4 text-white font-mono font-bold text-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all disabled:opacity-50"
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
                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
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
                        ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    } disabled:opacity-40`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Start or Cash Out Action Button */}
              {!isPlaying ? (
                <motion.button
                  onClick={handleStart}
                  disabled={loadingAction || balance < 1}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl font-display font-black text-base uppercase tracking-wider bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:brightness-110 text-white shadow-xl shadow-rose-500/25 border border-rose-400/30 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Play size={18} className="fill-white" />
                  DEAL CARDS — {betAmount} 🪙
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleCashout}
                  disabled={loadingAction || streak === 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-2xl font-display font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all ${
                    streak > 0
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 border border-emerald-300 shadow-emerald-500/30 hover:brightness-110 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Zap size={20} className={streak > 0 ? 'animate-bounce fill-slate-950' : ''} />
                  {streak > 0 ? (
                    <span>CASH OUT +{currentPayout.toLocaleString()} 🪙 ({currentMultiplier}×)</span>
                  ) : (
                    <span>WIN 1 GUESS TO CASH OUT</span>
                  )}
                </motion.button>
              )}
            </div>

            {/* Streak Stats Card */}
            <div className="card p-4 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-400" /> Current Streak
                </span>
                <span className="font-display font-black text-amber-400 text-sm">
                  {streak} Card{streak !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Accrued Multiplier</span>
                <span className="font-mono font-black text-rose-400 text-base">
                  {currentMultiplier}×
                </span>
              </div>
            </div>
          </div>

          {/* Center Column: Interactive 3D Card Arena & Guess Buttons (5 Cols on LG) */}
          <div className="lg:col-span-5 flex flex-col items-center gap-4">
            
            {/* Card Table Felt Box */}
            <div className="w-full card p-6 border-2 border-rose-500/30 bg-gradient-to-b from-slate-950 via-rose-950/20 to-slate-950 rounded-3xl shadow-2xl flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
              
              {/* Active Card / Placeholder */}
              <AnimatePresence mode="wait">
                {currentCard ? (
                  <motion.div
                    key={`${currentCard.label}-${currentCard.suit}-${streak}`}
                    initial={{ rotateY: 90, scale: 0.8, opacity: 0 }}
                    animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                    exit={{ rotateY: -90, scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="w-44 h-64 sm:w-48 sm:h-72 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-700/80 shadow-[0_0_30px_rgba(0,0,0,0.8)] p-4 flex flex-col justify-between select-none relative group hover:border-rose-500/50 transition-colors"
                  >
                    {/* Top Left Rank & Suit */}
                    <div className="flex flex-col items-center w-8 leading-none">
                      <span className={`text-2xl font-black font-display ${currentCard.color === 'RED' ? 'text-rose-500' : 'text-slate-100'}`}>
                        {currentCard.label}
                      </span>
                      <SuitIcon suit={currentCard.suit} className="text-xl" />
                    </div>

                    {/* Center Giant Suit Emblem */}
                    <div className="flex items-center justify-center">
                      <SuitIcon suit={currentCard.suit} className="text-6xl drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
                    </div>

                    {/* Bottom Right Inverted Rank & Suit */}
                    <div className="flex flex-col items-center w-8 leading-none self-end rotate-180">
                      <span className={`text-2xl font-black font-display ${currentCard.color === 'RED' ? 'text-rose-500' : 'text-slate-100'}`}>
                        {currentCard.label}
                      </span>
                      <SuitIcon suit={currentCard.suit} className="text-xl" />
                    </div>
                  </motion.div>
                ) : bustedCard ? (
                  <motion.div
                    key="busted-card"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="w-44 h-64 sm:w-48 sm:h-72 rounded-2xl bg-red-950/60 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] p-4 flex flex-col items-center justify-center text-center space-y-2 select-none"
                  >
                    <span className="text-4xl">💥</span>
                    <span className="text-xl font-display font-black text-red-300">
                      {bustedCard.label} of {bustedCard.suit}
                    </span>
                    <span className="text-xs text-red-400 font-bold uppercase tracking-wider">
                      Round Over
                    </span>
                  </motion.div>
                ) : (
                  <div className="w-44 h-64 sm:w-48 sm:h-72 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-2">
                    <Sparkles size={32} className="text-slate-700 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Deal Cards to Play</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Guess Buttons (Higher / Lower / Red / Black / Skip) */}
            {isPlaying && odds && (
              <div className="w-full space-y-2">
                {/* Main HI / LO Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => handleGuess('HI')}
                    disabled={loadingAction}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-400/40 text-white font-display font-black shadow-lg shadow-emerald-500/20 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronUp size={20} className="text-emerald-300" />
                      <span className="text-sm sm:text-base tracking-wider">HIGHER</span>
                    </div>
                    <div className="text-right leading-tight">
                      <span className="text-amber-300 font-mono text-sm block">{odds.HI.multiplier}×</span>
                      <span className="text-[10px] text-emerald-200 opacity-80">{odds.HI.probability}%</span>
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() => handleGuess('LO')}
                    disabled={loadingAction}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border border-rose-400/40 text-white font-display font-black shadow-lg shadow-rose-500/20 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown size={20} className="text-rose-300" />
                      <span className="text-sm sm:text-base tracking-wider">LOWER</span>
                    </div>
                    <div className="text-right leading-tight">
                      <span className="text-amber-300 font-mono text-sm block">{odds.LO.multiplier}×</span>
                      <span className="text-[10px] text-rose-200 opacity-80">{odds.LO.probability}%</span>
                    </div>
                  </motion.button>
                </div>

                {/* Color & Skip Buttons Row */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleGuess('RED')}
                    disabled={loadingAction}
                    className="py-2.5 px-3 rounded-xl bg-red-950/60 border border-red-700/60 hover:bg-red-900/60 text-red-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>RED ♥♦</span>
                    <span className="font-mono text-amber-300">1.96×</span>
                  </button>

                  <button
                    onClick={() => handleGuess('BLACK')}
                    disabled={loadingAction}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>BLACK ♠♣</span>
                    <span className="font-mono text-amber-300">1.96×</span>
                  </button>

                  <button
                    onClick={() => handleGuess('SKIP')}
                    disabled={loadingAction || skipsRemaining <= 0}
                    className="py-2.5 px-3 rounded-xl bg-purple-950/60 border border-purple-700/60 hover:bg-purple-900/60 text-purple-300 font-bold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                  >
                    <FastForward size={14} />
                    <span>Skip ({skipsRemaining})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Card History Ribbon & Strategy Tips (3 Cols on LG) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card p-4 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl shadow-xl space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <RotateCw size={14} className="text-rose-400" /> Card Streak History
              </span>

              {/* Card Ribbon */}
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
                {cardHistory.length > 0 ? (
                  cardHistory.map((c, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                        idx === cardHistory.length - 1
                          ? 'bg-rose-950/40 border-rose-500/60 text-white font-black shadow-sm ring-1 ring-rose-400/30'
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                        <span className={`font-bold ${c.color === 'RED' ? 'text-rose-400' : 'text-slate-200'}`}>
                          {c.label}
                        </span>
                        <SuitIcon suit={c.suit} className="text-sm" />
                      </div>
                      <span className="text-[10px] font-mono opacity-80">{c.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 text-center py-4">No cards drawn yet</p>
                )}
              </div>
            </div>

            {/* Strategy Card */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1 text-xs text-rose-300">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-rose-400" /> Hi-Lo Strategy:
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Aces are low (1) and Kings are high (13). Same rank cards count as a win for both Higher and Lower!
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* ── Rules & Odds Modal ── */}
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
              className="card w-full max-w-lg p-6 border border-slate-800 bg-slate-950 shadow-2xl rounded-3xl max-h-[85vh] overflow-y-auto space-y-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-rose-400" />
                  <h2 className="font-display font-black text-lg text-white">Hi-Lo Rules & Odds</h2>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  <strong>Hi-Lo Card Streak</strong> is played with a standard 52-card deck. A starting card is dealt, and your goal is to guess the properties of the next card:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Higher (HI)</strong>: Next card rank is higher than or equal to (≥) the current card. Multiplier dynamically scales based on how high the rank is.</li>
                  <li><strong>Lower (LO)</strong>: Next card rank is lower than or equal to (≤) the current card. Multiplier dynamically scales based on how low the rank is.</li>
                  <li><strong>Red (♥/♦)</strong>: Next card is Hearts or Diamonds (Fixed <strong>1.96×</strong>).</li>
                  <li><strong>Black (♠/♣)</strong>: Next card is Spades or Clubs (Fixed <strong>1.96×</strong>).</li>
                  <li><strong>Card Skip</strong>: Swap the current card for a new random card without losing your streak (2 skips per session).</li>
                </ul>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                  <p className="font-bold text-white">Cashout Anytime:</p>
                  <p className="text-[11px] text-slate-300">
                    Each correct guess multiplies your accrued winnings. You can cash out at any time or push for double/triple-digit multipliers!
                  </p>
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
