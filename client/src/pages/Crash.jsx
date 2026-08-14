import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Zap, Volume2, VolumeX, Rocket, Flame, Users, Trophy, CheckCircle2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import toast from 'react-hot-toast';

// ── Particle Canvas Overlay for Win Confetti ─────────────────────────────────
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

    const colors = ['#38bdf8', '#c084fc', '#f472b6', '#4ade80', '#fbbf24'];
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

// ── Live Rocket Canvas Flight Graph ──────────────────────────────────────────
function RocketGraph({ status, multiplier, crashPoint }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;

    // Grid lines
    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (status === 'FLYING' || status === 'CRASHED') {
      const progress = Math.min(1.0, (multiplier - 1.0) / 10.0); // scale up to 10x
      const startX = 40;
      const startY = height - 40;
      const endX = startX + progress * (width - 100);
      const endY = startY - Math.pow(progress, 0.7) * (height - 100);

      // Gradient under trajectory curve
      const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
      fillGradient.addColorStop(0, status === 'CRASHED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(168, 85, 247, 0.25)');
      fillGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
      ctx.lineTo(endX, startY);
      ctx.closePath();
      ctx.fillStyle = fillGradient;
      ctx.fill();

      // Curved rocket line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
      ctx.strokeStyle = status === 'CRASHED' ? '#ef4444' : '#a855f7';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Rocket glow head
      ctx.save();
      ctx.shadowColor = status === 'CRASHED' ? '#ef4444' : '#c084fc';
      ctx.shadowBlur = 15;
      ctx.fillStyle = status === 'CRASHED' ? '#ef4444' : '#ffffff';
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [status, multiplier]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl z-0"
    />
  );
}

// ── Main Crash Page Component ────────────────────────────────────────────────
export default function Crash() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, updateBalance } = useAuth();
  const { playSpin, playWin, playLose, playClick, soundEnabled, toggleSound } = useSounds();

  const [gameState, setGameState] = useState({
    status: 'COUNTDOWN',
    roundNumber: 1,
    timeLeft: 5,
    multiplier: 1.00,
    history: [],
    bets: [],
    totalPlayers: 0,
  });

  const [betAmount, setBetAmount] = useState('25');
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [myBet, setMyBet] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [cashedOutMsg, setCashedOutMsg] = useState(null);

  const balance = user?.balance ?? 0;

  useEffect(() => {
    if (!socket) return;

    const token = localStorage.getItem('7wheel_token');
    socket.emit('crash:join', token);

    socket.on('crash:init', (data) => {
      setGameState((prev) => ({ ...prev, ...data }));
    });

    socket.on('crash:state', (data) => {
      setGameState(data);

      if (data.status === 'COUNTDOWN' && data.timeLeft === 5) {
        setMyBet(null);
        setCashedOutMsg(null);
        setShowWinConfetti(false);
      }
    });

    socket.on('crash:betConfirmed', (bet) => {
      setMyBet(bet);
      playClick();
      toast.success(`Rocket bet locked in: ${bet.amount} 🪙`);
    });

    socket.on('crash:cashoutConfirmed', ({ multiplier, payout }) => {
      playWin();
      setShowWinConfetti(true);
      setCashedOutMsg({ multiplier, payout });
      toast.success(`🚀 Cashed Out at ${multiplier}×! (+${payout.toLocaleString()} 🪙)`, { icon: '🏆', duration: 3500 });
    });

    socket.on('crash:exploded', ({ crashPoint }) => {
      playLose();
    });

    socket.on('crash:error', (msg) => {
      toast.error(msg);
    });

    socket.on('balance:update', ({ credits }) => {
      updateBalance(credits);
    });

    return () => {
      socket.off('crash:init');
      socket.off('crash:state');
      socket.off('crash:betConfirmed');
      socket.off('crash:cashoutConfirmed');
      socket.off('crash:exploded');
      socket.off('crash:error');
      socket.off('balance:update');
    };
  }, [socket, updateBalance, playWin, playLose, playClick]);

  const handlePlaceBet = () => {
    if (gameState.status !== 'COUNTDOWN' || myBet) return;
    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount < 10) { toast.error('Minimum bet is 10 credits'); return; }
    if (amount > balance) { toast.error('Insufficient balance'); return; }

    const token = localStorage.getItem('7wheel_token');
    socket.emit('crash:bet', { amount, autoCashout, token });
  };

  const handleCashout = () => {
    if (gameState.status !== 'FLYING' || !myBet || cashedOutMsg) return;
    socket.emit('crash:cashout');
  };

  const canBet = gameState.status === 'COUNTDOWN' && !myBet;
  const currentPayout = myBet ? Math.round(myBet.amount * gameState.multiplier) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/3 w-[600px] h-[350px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-pink-500/10 blur-[120px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6 relative z-10">

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
              onClick={() => { playClick(); setShowRules(!showRules); }}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-3.5 py-2 rounded-xl border border-brand-500/30 hover:border-brand-400/50 transition-all"
            >
              <HelpCircle size={15} />
              How to Play
            </button>
          </div>
        </div>

        {/* How to Play Rules */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card p-5 border border-purple-500/30 bg-slate-950/90 text-xs text-slate-300 space-y-3 rounded-2xl shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-display font-black text-sm text-white flex items-center gap-2">
                  🚀 Crash / Rocket — How It Works
                </span>
                <button onClick={() => setShowRules(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <p>Place your wager during the 5-second countdown. Once launched, the rocket's multiplier climbs exponentially ($1.00\times \to 100\times+$).</p>
              <p>Click <strong>CASH OUT</strong> before the rocket explodes to win your current multiplier. If it crashes first, your wager is lost!</p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>🛡️ <strong>Provably Fair RTP:</strong> 97% Return to Player (3% house edge).</span>
                <span>⚡ Set <strong>Auto Cashout</strong> to lock in payouts automatically.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Graph Arena */}
        <div className="relative card p-6 md:p-8 border-2 border-slate-800 bg-slate-950/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between min-h-[380px]">
          
          <ConfettiCanvas active={showWinConfetti} />
          <RocketGraph status={gameState.status} multiplier={gameState.multiplier} crashPoint={gameState.multiplier} />

          {/* Top Status & Room Count */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3 relative z-10">
            <span className="font-mono font-bold text-slate-300 flex items-center gap-2">
              <Rocket size={16} className="text-purple-400" /> Launch #{gameState.roundNumber}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users size={14} className="text-brand-400" /> {gameState.totalPlayers} in room
            </span>
          </div>

          {/* Center Dynamic Display (Multiplier / Countdown / Crash) */}
          <div className="my-auto text-center relative z-10 py-6">
            {gameState.status === 'COUNTDOWN' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold animate-pulse block">
                  {gameState.roundStarted ? 'Preparing for Launch' : 'Waiting for Bets…'}
                </span>
                <span className="font-display font-black text-6xl md:text-7xl text-white font-mono block">
                  {gameState.roundStarted ? `${gameState.timeLeft}s` : 'READY'}
                </span>
                <span className="text-xs text-slate-400 block">
                  {gameState.roundStarted ? 'Countdown in progress — Lock in your bet!' : 'Place a bet to start the launch countdown!'}
                </span>
              </motion.div>
            )}

            {gameState.status === 'FLYING' && (
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-purple-400 font-bold block animate-pulse">
                  IN FLIGHT
                </span>
                <motion.span
                  key={gameState.multiplier}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="font-display font-black text-6xl md:text-8xl text-purple-300 font-mono tracking-tight block drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                >
                  {gameState.multiplier.toFixed(2)}×
                </motion.span>
              </div>
            )}

            {gameState.status === 'CRASHED' && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-red-400 font-bold block">
                  💥 ROCKET CRASHED AT
                </span>
                <span className="font-display font-black text-6xl md:text-7xl text-red-500 font-mono block drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                  {gameState.multiplier.toFixed(2)}×
                </span>
                <span className="text-xs text-slate-400 block">Next flight launching soon…</span>
              </motion.div>
            )}
          </div>

          {/* History Pill Bar */}
          {gameState.history?.length > 0 && (
            <div className="flex items-center justify-start gap-1.5 pt-4 border-t border-slate-800/80 overflow-x-auto relative z-10">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1 shrink-0">Recent:</span>
              {gameState.history.map((mult, idx) => {
                const isHigh = mult >= 10.0;
                const isMid = mult >= 2.0;

                return (
                  <span
                    key={idx}
                    className={`text-[11px] font-mono font-extrabold px-2.5 py-1 rounded-lg shrink-0 border ${
                      isHigh
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : isMid
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {mult.toFixed(2)}×
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Controls & Bet Sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left: Bet Inputs & Main Action Button */}
          <div className="md:col-span-6 card p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-display font-extrabold text-sm text-white flex items-center gap-2">
                <Coins size={16} className="text-yellow-400" /> Wager & Auto Cashout
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bet Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold">Bet Amount (🪙)</label>
                <input
                  type="number"
                  min="10"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={!canBet}
                  className="input-field w-full text-sm font-black text-center py-2 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                />
              </div>

              {/* Auto Cashout Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold">Auto Cashout Target (×)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.01"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  disabled={!canBet}
                  className="input-field w-full text-sm font-black text-center py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-white"
                  placeholder="2.00"
                />
              </div>
            </div>

            {/* Quick Bet Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 25, 50, 100, 250].map((v) => (
                <button
                  key={v}
                  onClick={() => { playClick(); setBetAmount(String(v)); }}
                  disabled={!canBet}
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
                onClick={() => { playClick(); setBetAmount(String(Math.floor(balance / 2))); }}
                disabled={!canBet || balance < 20}
                className="py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:border-amber-500 transition-all disabled:opacity-40"
              >
                ½
              </button>
            </div>

            {/* Primary Action Button: PLACE BET or CASH OUT */}
            {gameState.status === 'FLYING' && myBet && !cashedOutMsg ? (
              <motion.button
                onClick={handleCashout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-display font-black text-xl tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/30 border border-emerald-400/40 flex items-center justify-center gap-2"
              >
                <Trophy size={22} />
                CASH OUT {currentPayout.toLocaleString()} 🪙 ({gameState.multiplier.toFixed(2)}×)
              </motion.button>
            ) : (
              <motion.button
                onClick={handlePlaceBet}
                disabled={!canBet}
                whileHover={canBet ? { scale: 1.02 } : {}}
                whileTap={canBet ? { scale: 0.97 } : {}}
                className={`w-full py-4 rounded-2xl font-display font-black text-xl tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${
                  canBet
                    ? 'bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {myBet ? (
                  <>
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <span>Wager Locked ({myBet.amount} 🪙)</span>
                  </>
                ) : (
                  <>
                    <Rocket size={20} />
                    <span>Place Bet — {betAmount} 🪙</span>
                  </>
                )}
              </motion.button>
            )}

            {/* My Cashed Out Banner */}
            {cashedOutMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center font-bold text-xs flex items-center justify-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                Cashed Out at {cashedOutMsg.multiplier}×! (+{cashedOutMsg.payout.toLocaleString()} 🪙)
              </div>
            )}
          </div>

          {/* Right: Live Flight Players Roster */}
          <div className="md:col-span-6 card p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-display font-extrabold text-sm text-white flex items-center gap-2">
                <Users size={16} className="text-brand-400" /> Live Flight Bets ({gameState.bets?.length || 0})
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {gameState.bets?.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">
                  No bets placed for this flight yet.
                </div>
              ) : (
                gameState.bets.map((b, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs border ${
                      b.cashedOut
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">{b.username}</span>
                    <span>
                      {b.amount} 🪙
                      {b.cashedOut && (
                        <span className="text-emerald-400 font-extrabold ml-1">
                          → {b.cashoutMult}× (+{b.payout?.toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
