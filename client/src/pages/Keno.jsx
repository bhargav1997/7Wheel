import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Volume2, VolumeX, ShieldAlert, Sparkles, Trophy, Play, RotateCcw, Award, Zap, Trash2, Dices, Shuffle } from 'lucide-react';
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

// ── Paytable Data ────────────────────────────────────────────────────────────
const KENO_PAYTABLE = {
  1:  { 1: 3.8 },
  2:  { 1: 1, 2: 9 },
  3:  { 2: 2.5, 3: 25 },
  4:  { 2: 1.5, 3: 8, 4: 60 },
  5:  { 2: 1, 3: 4, 4: 20, 5: 150 },
  6:  { 3: 2.5, 4: 8, 5: 50, 6: 300 },
  7:  { 3: 1.5, 4: 5, 5: 20, 6: 100, 7: 500 },
  8:  { 4: 3, 5: 10, 6: 50, 7: 200, 8: 1000 },
  9:  { 4: 2, 5: 6, 6: 25, 7: 100, 8: 500, 9: 2000 },
  10: { 4: 1.5, 5: 4, 6: 15, 7: 60, 8: 250, 9: 1000, 10: 5000 },
};

// ── Main Keno Component ──────────────────────────────────────────────────────
export default function Keno() {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { playClick, playWin, playLose, playStreak, soundEnabled, toggleSound } = useSounds();

  const [betAmount, setBetAmount] = useState('25');
  const [gamePhase, setGamePhase] = useState('PICKING'); // PICKING, DRAWING, COMPLETE
  const [selectedNums, setSelectedNums] = useState(new Set());
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [hits, setHits] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [multiplier, setMultiplier] = useState(0);
  const [payout, setPayout] = useState(0);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const balance = user?.balance ?? 0;
  const pickCount = selectedNums.size;

  // Toggle number selection
  const toggleNumber = (num) => {
    if (gamePhase !== 'PICKING') return;
    playClick();
    setSelectedNums((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        if (next.size >= 10) {
          toast.error('Maximum 10 picks allowed!');
          return prev;
        }
        next.add(num);
      }
      return next;
    });
  };

  // Clear / Reset all selected picks
  const clearAllPicks = () => {
    if (gamePhase !== 'PICKING') return;
    playClick();
    setSelectedNums(new Set());
  };

  // Quick pick random numbers
  const quickPick = (count) => {
    if (gamePhase !== 'PICKING') return;
    playClick();
    const nums = new Set();
    while (nums.size < count) {
      nums.add(Math.floor(Math.random() * 40) + 1);
    }
    setSelectedNums(nums);
  };

  // Animated reveal of drawn numbers
  useEffect(() => {
    if (gamePhase !== 'DRAWING' || drawnNumbers.length === 0) return;

    if (revealedCount < drawnNumbers.length) {
      const timer = setTimeout(() => {
        const currentNum = drawnNumbers[revealedCount];
        if (selectedNums.has(currentNum)) {
          playStreak();
        }
        setRevealedCount((prev) => prev + 1);
      }, 80); // 80ms per ball reveal for exciting pace
      return () => clearTimeout(timer);
    } else {
      // All revealed — finalize
      setGamePhase('COMPLETE');
      if (payout > 0) {
        playWin();
        setShowWinConfetti(true);
        toast.success(`${matchCount} HITS! Won +${payout.toLocaleString()} Credits! (${multiplier}×)`, { duration: 4000 });
      } else {
        playLose();
        toast.error(`${matchCount} hit${matchCount !== 1 ? 's' : ''} — No payout this round.`);
      }
    }
  }, [gamePhase, revealedCount, drawnNumbers.length]);

  // Play round
  const handlePlay = async () => {
    if (gamePhase === 'DRAWING' || loadingAction) return;
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet < 1) { toast.error('Minimum bet is 1 credit'); return; }
    if (bet > balance) { setShowInsufficientModal(true); return; }
    if (selectedNums.size < 1) { toast.error('Pick at least 1 number!'); return; }

    playClick();
    setLoadingAction(true);
    setShowWinConfetti(false);
    setRevealedCount(0);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/keno/play', {
        betAmount: bet,
        picks: [...selectedNums],
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDrawnNumbers(data.drawnNumbers);
      setHits(data.hits);
      setMatchCount(data.matchCount);
      setMultiplier(data.multiplier);
      setPayout(data.payout);
      updateBalance(data.balanceAfter);
      setGamePhase('DRAWING');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to play Keno.');
    } finally {
      setLoadingAction(false);
    }
  };

  // New round
  const handleNewRound = () => {
    playClick();
    setGamePhase('PICKING');
    setDrawnNumbers([]);
    setRevealedCount(0);
    setHits([]);
    setMatchCount(0);
    setMultiplier(0);
    setPayout(0);
    setShowWinConfetti(false);
  };

  // Get the current paytable row for selected pick count
  const currentPaytable = KENO_PAYTABLE[pickCount] || {};

  // Determine ball state for the grid
  const getBallState = (num) => {
    const isPicked = selectedNums.has(num);
    const revealedDrawn = drawnNumbers.slice(0, revealedCount);
    const isDrawn = revealedDrawn.includes(num);
    const isHit = isPicked && isDrawn;
    const isMiss = !isPicked && isDrawn;

    return { isPicked, isDrawn, isHit, isMiss };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-cyan-950/20 to-slate-950 text-white flex flex-col relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="absolute top-10 left-10 w-[350px] h-[350px] bg-cyan-500/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-5 relative z-10">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
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
              className="flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-3.5 py-2 rounded-xl border border-brand-500/30 hover:border-brand-400/50 transition-all"
            >
              <HelpCircle size={15} />
              Payouts
            </button>
          </div>
        </div>

        {/* Game Area Card */}
        <div className="relative card p-4 sm:p-6 md:p-8 border-2 border-cyan-600/40 bg-gradient-to-b from-cyan-950/50 via-slate-950 to-slate-950 backdrop-blur-xl rounded-3xl shadow-2xl space-y-5 overflow-hidden">

          <ConfettiCanvas active={showWinConfetti} />

          {/* Header */}
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800/80 pb-3">
            <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} className="text-cyan-400" /> Keno — Pick up to 10 Numbers
            </span>
            <div className="flex items-center gap-2">
              {gamePhase === 'PICKING' && pickCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={clearAllPicks}
                  className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm"
                  title="Reset all picked numbers"
                >
                  <RotateCcw size={11} />
                  Reset ({pickCount})
                </motion.button>
              )}
              <span className={`font-mono px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase ${
                gamePhase === 'PICKING' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                gamePhase === 'DRAWING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {gamePhase === 'PICKING' ? `${pickCount}/10 Picked` : gamePhase === 'DRAWING' ? `Drawing ${revealedCount}/20` : 'Complete'}
              </span>
            </div>
          </div>

          {/* 40-Number Grid (8 columns × 5 rows) */}
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => {
              const { isPicked, isDrawn, isHit, isMiss } = getBallState(num);

              return (
                <motion.button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  disabled={gamePhase !== 'PICKING'}
                  whileHover={gamePhase === 'PICKING' ? { scale: 1.08 } : {}}
                  whileTap={gamePhase === 'PICKING' ? { scale: 0.92 } : {}}
                  animate={isHit ? { scale: [1, 1.2, 1], transition: { duration: 0.3 } } : {}}
                  className={`relative aspect-square rounded-xl sm:rounded-2xl font-display font-black text-sm sm:text-base flex items-center justify-center border-2 transition-all duration-200 ${
                    isHit
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/30'
                      : isMiss
                      ? 'bg-red-500/10 border-red-500/30 text-red-400/60'
                      : isPicked
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                      : isDrawn
                      ? 'bg-slate-800/50 border-slate-600 text-slate-400'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300'
                  } disabled:cursor-default`}
                >
                  {num}
                  {/* Hit indicator dot */}
                  {isHit && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-emerald-300 shadow-lg"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Hits Counter & Live Paytable During Draw */}
          {(gamePhase === 'DRAWING' || gamePhase === 'COMPLETE') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-6 text-center"
            >
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Hits</span>
                <span className={`text-3xl font-black font-display ${
                  drawnNumbers.slice(0, revealedCount).filter(n => selectedNums.has(n)).length > 0
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}>
                  {drawnNumbers.slice(0, revealedCount).filter(n => selectedNums.has(n)).length}
                </span>
                <span className="text-xs text-slate-500 block">/ {pickCount}</span>
              </div>
              {gamePhase === 'COMPLETE' && (
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Multiplier</span>
                  <span className={`text-3xl font-black font-display ${
                    multiplier > 0 ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {multiplier > 0 ? `${multiplier}×` : '0×'}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Result Banner */}
          <AnimatePresence mode="wait">
            {gamePhase === 'COMPLETE' && (
              <motion.div
                key="result-banner"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`w-full py-3 px-4 rounded-2xl text-center font-display border flex items-center justify-center gap-3 ${
                  payout > 0
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'bg-red-500/20 border-red-500/50 text-red-400'
                }`}
              >
                {payout > 0 ? (
                  <>
                    <Trophy size={22} className="text-yellow-400 animate-bounce" />
                    <div>
                      <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 block">
                        {matchCount} of {pickCount} Matched!
                      </span>
                      <span className="text-2xl font-black text-white">
                        +{payout.toLocaleString()} Credits
                      </span>
                      <span className="text-xs text-emerald-300 block">
                        ({multiplier}× on {betAmount} bet)
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-extrabold text-red-400">
                    {matchCount} hit{matchCount !== 1 ? 's' : ''} — Not enough for a payout. Try again!
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inline Paytable for Current Pick Count */}
        {pickCount > 0 && gamePhase === 'PICKING' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-3 border border-slate-800/60 bg-slate-900/50 backdrop-blur-sm rounded-2xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-slate-300">
                Payouts for {pickCount} pick{pickCount !== 1 ? 's' : ''}:
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(currentPaytable).map(([matches, mult]) => (
                <div
                  key={matches}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold bg-slate-800/50 text-slate-400 border border-slate-700/50"
                >
                  <span className="text-cyan-400">{matches} hit{parseInt(matches) !== 1 ? 's' : ''}</span>
                  <span className="text-amber-400 font-black">{mult}×</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Controls & Wager Bar */}
        <div className="card p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-4 shadow-xl">

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
            {gamePhase === 'PICKING' ? (
              <>
                <motion.button
                  onClick={handlePlay}
                  disabled={loadingAction || pickCount < 1 || balance < 1}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  className="col-span-2 md:col-span-2 py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-display font-black text-base sm:text-lg tracking-wider uppercase bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-xl shadow-cyan-500/30 border border-cyan-400/40 flex items-center justify-center gap-2.5 disabled:opacity-40"
                >
                  <Play size={20} className="fill-white" />
                  PLAY — {betAmount} 🪙
                </motion.button>

                {/* Quick Pick 5 */}
                <button
                  onClick={() => quickPick(5)}
                  className="py-3 px-3 rounded-2xl font-display font-bold text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Dices size={15} className="text-cyan-400" />
                  Quick 5
                </button>

                {/* Quick Pick 10 */}
                <button
                  onClick={() => quickPick(10)}
                  className="py-3 px-3 rounded-2xl font-display font-bold text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles size={15} className="text-purple-400" />
                  Quick 10
                </button>

                {/* Reset Picks button */}
                <button
                  onClick={clearAllPicks}
                  disabled={pickCount === 0}
                  className="py-3 px-3 rounded-2xl font-display font-bold text-xs bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-800 disabled:hover:bg-transparent active:scale-95"
                >
                  <Trash2 size={15} className={pickCount > 0 ? "text-red-400" : ""} />
                  Reset
                </button>
              </>
            ) : gamePhase === 'COMPLETE' ? (
              <>
                <motion.button
                  onClick={handlePlay}
                  disabled={loadingAction || balance < 1}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  className="col-span-2 md:col-span-3 py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-display font-black text-base sm:text-lg tracking-wider uppercase bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-xl shadow-cyan-500/30 border border-cyan-400/40 flex items-center justify-center gap-2.5 disabled:opacity-40"
                >
                  <RotateCcw size={18} />
                  PLAY AGAIN — Same Picks
                </motion.button>
                <button
                  onClick={() => {
                    handleNewRound();
                    clearAllPicks();
                  }}
                  className="col-span-2 md:col-span-2 py-3 px-4 rounded-2xl font-display font-bold text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RotateCcw size={14} />
                  Reset & Pick New
                </button>
              </>
            ) : (
              <div className="col-span-2 md:col-span-5 py-4 text-center text-amber-400 font-display font-bold text-sm animate-pulse">
                🎱 Drawing numbers…
              </div>
            )}
          </div>

          {/* Wager Pill Selector */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <Coins size={20} className="text-yellow-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400 font-medium block">Bet Amount</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="1"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={gamePhase === 'DRAWING'}
                    className="input-field w-24 text-sm font-black text-center py-1.5 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                  />
                  <Coins size={14} className="text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {[10, 25, 50, 100, 250].map((v) => (
                <button
                  key={v}
                  onClick={() => { playClick(); setBetAmount(String(v)); }}
                  disabled={gamePhase === 'DRAWING'}
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
                disabled={gamePhase === 'DRAWING' || balance < 20}
                className="text-xs font-extrabold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 text-amber-400 transition-all disabled:opacity-40"
              >
                ½
              </button>
              <button
                onClick={() => { playClick(); setBetAmount(String(balance)); }}
                disabled={gamePhase === 'DRAWING' || balance < 1}
                className="text-xs font-extrabold px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500 text-red-400 transition-all disabled:opacity-40"
              >
                MAX
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Full Paytable Modal */}
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
              className="card w-full max-w-lg p-6 border border-slate-800 bg-slate-950 shadow-2xl rounded-3xl max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-cyan-400" />
                  <h2 className="font-display font-black text-lg text-white">Keno Paytable</h2>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 space-y-1">
                  <p className="font-bold text-white">How to Play Keno:</p>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Pick <strong>1 to 10 numbers</strong> from a grid of 40. The house draws <strong>20 random numbers</strong>. The more of your picks that match, the bigger the payout!
                  </p>
                </div>

                {/* Paytable grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-2 px-2 text-slate-500 font-bold">Picks</th>
                        <th className="text-center py-2 px-1 text-slate-500 font-bold" colSpan={10}>Matches → Multiplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(KENO_PAYTABLE).map(([picks, payouts]) => (
                        <tr key={picks} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                          <td className="py-2 px-2 font-black text-cyan-400">{picks}</td>
                          <td className="py-2 px-1" colSpan={10}>
                            <div className="flex items-center gap-1 flex-wrap">
                              {Object.entries(payouts).map(([matches, mult]) => (
                                <span key={matches} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                  <span className="text-emerald-400">{matches}h</span>=<span className="text-amber-400 font-black">{mult}×</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <p className="font-bold text-amber-300 text-[11px]">Tips:</p>
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                    <li>Picking fewer numbers gives better odds per hit but lower max payouts</li>
                    <li>10 picks with 10 matches = <strong>5000× payout</strong></li>
                    <li>Use Quick Pick for random selections</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <ShieldAlert size={11} className="text-slate-500" /> 20 of 40 numbers drawn cryptographically per round. ~96% RTP.
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
