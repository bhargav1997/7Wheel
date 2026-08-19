import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Volume2, VolumeX, Bomb, Gem, Trophy, Sparkles, Dices, Play, Crosshair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import axios from 'axios';
import toast from 'react-hot-toast';

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

    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
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
        p.vy += 0.35;
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

export default function Mines() {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { playClick, playWin, playLose, playStreak, soundEnabled, toggleSound } = useSounds();

  const [betAmount, setBetAmount] = useState('25');
  const [mineCount, setMineCount] = useState(3);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, IN_PROGRESS, CASHOUT, BUSTED
  const [revealedTiles, setRevealedTiles] = useState([]);
  const [minePositions, setMinePositions] = useState([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [nextMultiplier, setNextMultiplier] = useState(1.0);
  const [currentPayout, setCurrentPayout] = useState(0);
  const [hitTile, setHitTile] = useState(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const balance = user?.balance ?? 0;

  // Calculate 1st tile multiplier preview based on mine count
  const getStartingMultiplier = (mines) => {
    const safeCount = 25 - mines;
    const prob = safeCount / 25;
    const raw = (1 / prob) * 0.97;
    return Math.max(1.01, parseFloat(raw.toFixed(2)));
  };

  // Start new Mines game
  const handleStartGame = async () => {
    if (gameState === 'IN_PROGRESS') return;
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet < 1) { toast.error('Minimum bet is 1 credit'); return; }
    if (bet > balance) { setShowInsufficientModal(true); return; }

    playClick();
    setLoadingAction(true);
    setHitTile(null);
    setMinePositions([]);
    setShowWinConfetti(false);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/mines/start', { betAmount: bet, mineCount }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGameState('IN_PROGRESS');
      setRevealedTiles([]);
      setCurrentMultiplier(1.0);
      setNextMultiplier(data.nextMultiplier);
      setCurrentPayout(bet);
      updateBalance(data.balanceAfter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start game.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Reveal a tile
  const handleRevealTile = async (index) => {
    if (gameState !== 'IN_PROGRESS' || revealedTiles.includes(index) || loadingAction) return;

    setLoadingAction(true);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/mines/reveal', { tileIndex: index }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.status === 'BUSTED') {
        playLose();
        setHitTile(data.hitTile);
        setMinePositions(data.minePositions);
        setRevealedTiles(data.minePositions.concat(revealedTiles));
        setGameState('BUSTED');
      } else if (data.status === 'CASHOUT') {
        playWin();
        setShowWinConfetti(true);
        setMinePositions(data.minePositions);
        setRevealedTiles(data.revealedTiles);
        setCurrentMultiplier(data.currentMultiplier);
        setCurrentPayout(data.payout);
        setGameState('CASHOUT');
        updateBalance(data.balanceAfter);
        toast.success(`Board Cleared! Won +${data.payout.toLocaleString()} Credits!`, { duration: 4000 });
      } else {
        playStreak();
        setRevealedTiles(data.revealedTiles);
        setCurrentMultiplier(data.currentMultiplier);
        setNextMultiplier(data.nextMultiplier);
        setCurrentPayout(data.payout);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tile reveal failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Cash out
  const handleCashout = async () => {
    if (gameState !== 'IN_PROGRESS' || revealedTiles.length === 0 || loadingAction) return;

    setLoadingAction(true);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/mines/cashout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      playWin();
      setShowWinConfetti(true);
      setGameState('CASHOUT');
      setMinePositions(data.minePositions);
      setCurrentMultiplier(data.currentMultiplier);
      setCurrentPayout(data.payout);
      updateBalance(data.balanceAfter);
      toast.success(`Cashed Out +${data.payout.toLocaleString()} Credits (${data.currentMultiplier}×)!`, { duration: 3500 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cashout failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Auto Pick a random unrevealed tile
  const handlePickRandom = () => {
    if (gameState !== 'IN_PROGRESS' || loadingAction) return;
    const unrevealed = Array.from({ length: 25 }, (_, i) => i).filter((i) => !revealedTiles.includes(i));
    if (unrevealed.length === 0) return;
    const randomChoice = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    handleRevealTile(randomChoice);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Header Bar */}
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
              className="flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-3.5 py-2 rounded-xl border border-brand-500/30 hover:border-brand-400/50 transition-all"
            >
              <HelpCircle size={15} />
              Rules & Multipliers
            </button>
          </div>
        </div>

        {/* Main Grid & Control Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left: Control Sidebar */}
          <div className="md:col-span-5 space-y-4">
            
            <div className="card p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-5 shadow-2xl">
              
              {/* Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <Crosshair size={20} className="text-red-400" />
                </div>
                <div>
                  <h1 className="font-display font-black text-xl text-white tracking-wide leading-none">Mines Sweeper</h1>
                  <p className="text-[11px] text-slate-400 mt-1 leading-none">Uncover Safe Gems · Avoid Hidden Mines</p>
                </div>
              </div>

              {/* Mine Count Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Bomb size={14} className="text-red-400" /> Mine Count
                  </span>
                  <span className="text-emerald-400 font-mono font-extrabold">
                    {mineCount} {mineCount === 1 ? 'Mine' : 'Mines'} ({getStartingMultiplier(mineCount)}× 1st Gem)
                  </span>
                </label>

                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 3, 5, 10, 24].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => { playClick(); setMineCount(cnt); }}
                      disabled={gameState === 'IN_PROGRESS'}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        mineCount === cnt
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      } disabled:opacity-50`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wager Selection */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold flex items-center gap-1.5 text-slate-300">
                  <Coins size={14} className="text-yellow-400" /> Bet Amount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={gameState === 'IN_PROGRESS'}
                    className="input-field flex-1 text-sm font-black text-center py-2 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                  />
                  <Coins size={14} className="text-yellow-400" />
                </div>

                {/* Quick Bet Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 5, 10, 25, 50, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => { playClick(); setBetAmount(String(v)); }}
                      disabled={gameState === 'IN_PROGRESS'}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        betAmount === String(v)
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                      } disabled:opacity-40`}
                    >
                      {v}
                    </button>
                  ))}
                  <button
                    onClick={() => { playClick(); setBetAmount(String(Math.max(1, Math.floor(balance / 2)))); }}
                    disabled={gameState === 'IN_PROGRESS' || balance < 2}
                    className="py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:border-amber-500 transition-all disabled:opacity-40"
                  >
                    ½
                  </button>
                  <button
                    onClick={() => { playClick(); setBetAmount(String(Math.floor(balance))); }}
                    disabled={gameState === 'IN_PROGRESS' || balance < 1}
                    className="py-1.5 px-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:border-red-500 transition-all disabled:opacity-40"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Primary Action Button (BET / CASHOUT) */}
              <div className="pt-2">
                {gameState === 'IN_PROGRESS' ? (
                  <div className="space-y-2">
                    <motion.button
                      onClick={handleCashout}
                      disabled={revealedTiles.length === 0 || loadingAction}
                      whileHover={revealedTiles.length > 0 ? { scale: 1.02 } : {}}
                      whileTap={revealedTiles.length > 0 ? { scale: 0.97 } : {}}
                      className={`w-full py-4 rounded-2xl font-display font-black text-lg tracking-wider flex items-center justify-center gap-2 uppercase transition-all shadow-xl ${
                        revealedTiles.length > 0
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Trophy size={20} />
                      Cash Out {currentPayout.toLocaleString()} Credits ({currentMultiplier}×)
                    </motion.button>

                    <button
                      onClick={handlePickRandom}
                      disabled={loadingAction}
                      className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Dices size={15} className="text-cyan-400" />
                      Pick Random Tile
                    </button>
                  </div>
                ) : (
                  <motion.button
                    onClick={handleStartGame}
                    disabled={loadingAction || balance < 1}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-2xl font-display font-black text-lg tracking-wider bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40 flex items-center justify-center gap-2 uppercase transition-all"
                  >
                    <Play size={20} className="fill-white" />
                    Place Bet — {betAmount} Credits
                  </motion.button>
                )}
              </div>
            </div>

            {/* Live Session Multiplier Card */}
            <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Next Multiplier</span>
                <span className="font-display font-black text-xl text-emerald-400 mt-0.5 block">
                  {gameState === 'IN_PROGRESS' ? `${nextMultiplier}×` : '1.00×'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Gems Cleared</span>
                <span className="font-display font-black text-xl text-cyan-400 mt-0.5 block">
                  {revealedTiles.filter((t) => !minePositions.includes(t)).length} / {25 - mineCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right: 5x5 Mines Tile Grid */}
          <div className="md:col-span-7">
            <div className="relative card p-4 md:p-6 border-2 border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between min-h-[420px]">
              
              <ConfettiCanvas active={showWinConfetti} />

              {/* Top Grid Status Bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-yellow-400" />
                  {gameState === 'IN_PROGRESS' ? 'Pick a Tile…' : gameState === 'CASHOUT' ? '🎉 CASHOUT SUCCESS!' : gameState === 'BUSTED' ? '💥 BUSTED!' : 'Click Bet to Start'}
                </span>
                <span className="font-mono text-emerald-400">
                  {gameState === 'IN_PROGRESS' ? `${currentMultiplier}×` : ''}
                </span>
              </div>

              {/* 5x5 Grid */}
              <div className="grid grid-cols-5 gap-2 md:gap-3 my-auto">
                {Array.from({ length: 25 }, (_, idx) => {
                  const isRevealed = revealedTiles.includes(idx);
                  const isMine = minePositions.includes(idx);
                  const isHitMine = hitTile === idx;

                  return (
                    <motion.button
                      key={idx}
                      onClick={() => handleRevealTile(idx)}
                      disabled={gameState !== 'IN_PROGRESS' || isRevealed || loadingAction}
                      whileHover={gameState === 'IN_PROGRESS' && !isRevealed ? { scale: 1.05 } : {}}
                      whileTap={gameState === 'IN_PROGRESS' && !isRevealed ? { scale: 0.95 } : {}}
                      className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-2xl md:text-3xl font-black transition-all relative overflow-hidden ${
                        isHitMine
                          ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-bounce'
                          : isMine
                          ? 'bg-slate-900/90 border-red-500/40 text-red-400 opacity-70'
                          : isRevealed
                          ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-600 shadow-inner'
                      } ${gameState === 'IN_PROGRESS' && !isRevealed ? 'cursor-pointer hover:bg-slate-800/80' : 'cursor-default'}`}
                    >
                      {/* Tile Contents */}
                      <AnimatePresence mode="wait">
                        {isRevealed ? (
                          <motion.span
                            key="revealed"
                            initial={{ scale: 0, rotate: -40 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            {isMine ? (
                              <Crosshair size={26} className="text-red-400 animate-pulse" />
                            ) : (
                              <Gem size={26} className="text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                            )}
                          </motion.span>
                        ) : (
                          <span className="text-xs text-slate-700 font-mono select-none">
                            {idx + 1}
                          </span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              {/* Bottom Result Overlay Banner */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 h-14 flex items-center justify-center">
                {gameState === 'CASHOUT' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center font-display"
                  >
                    <span className="text-xs uppercase font-extrabold text-emerald-400 tracking-widest block">CASHOUT SUCCESSFUL!</span>
                    <span className="text-xl font-black text-white">+{currentPayout.toLocaleString()} Credits ({currentMultiplier}×)</span>
                  </motion.div>
                )}

                {gameState === 'BUSTED' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center font-display text-red-400"
                  >
                    <span className="text-xs uppercase font-extrabold tracking-widest block">BOOM! You Hit a Mine</span>
                    <span className="text-sm font-bold text-slate-400">Better luck next round!</span>
                  </motion.div>
                )}

                {gameState === 'IN_PROGRESS' && (
                  <div className="text-xs text-slate-500 font-medium">
                    Revealed {revealedTiles.length} safe gems · Current Multiplier: <strong className="text-emerald-400">{currentMultiplier}×</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rules Modal */}
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
                  <Crosshair size={18} className="text-red-400" />
                  <h2 className="font-display font-black text-lg text-white">Mines Mechanics & RTP</h2>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <p><strong>Objective:</strong> Uncover as many safe Gems as possible without hitting a hidden Mine.</p>
                <p><strong>Multiplier:</strong> Every revealed Gem increases your cashout payout based on exact probability theory.</p>
                <p><strong>Cash Out Anytime:</strong> Lock in your winnings at any point before hitting a Mine.</p>
                <p><strong>Fair RTP:</strong> 97.0% Return to Player (3.0% house edge). Cryptographically randomized mine placement.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <InsufficientCreditsModal
        open={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        onOpenBuyCredits={() => setShowBuyModal(true)}
        onOpenDailyStreak={() => setShowStreakModal(true)}
      />
      <BuyCreditsModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} />
    </div>
  );
}
