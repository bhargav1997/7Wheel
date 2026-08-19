import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, HelpCircle, Users, Coins, Clock, CheckCircle2, Trophy, Volume2, VolumeX, Sparkles, Zap, TrendingUp, ShieldCheck, Dices, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
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

    const colors = ['#06b6d4', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    const particles = Array.from({ length: 50 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.8) * 12,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 8,
    }));

    let startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.alpha -= 0.018;
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

      if (alive && Date.now() - startTime < 2200) {
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

// ── Main Flip or Flop Component ──────────────────────────────────────────────
export default function FlipOrFlop() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, updateBalance } = useAuth();
  const { playSpin, playWin, playLose, playClick, soundEnabled, toggleSound } = useSounds();

  const [gameState, setGameState] = useState({
    status: 'WAITING',
    roundNumber: 1,
    timeLeft: 5,
    result: null,
    winningChoice: null,
    winners: [],
    bettorCount: 0,
    totalPlayers: 0,
    roundStarted: false,
  });

  const [userStreak, setUserStreak] = useState(0);
  const [betAmount, setBetAmount] = useState('25');
  const [myBet, setMyBet] = useState(null);
  const [history, setHistory] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [roundStartMsg, setRoundStartMsg] = useState(null);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  
  const toastedRoundRef = useRef(null);
  const spinningSoundRef = useRef(false);

  const balance = user?.balance ?? 0;

  useEffect(() => {
    if (!socket) return;

    const token = localStorage.getItem('7wheel_token');
    socket.emit('flip:join', token);

    socket.on('flip:init', (data) => {
      setGameState(data);
      if (data.userStreak !== undefined) setUserStreak(data.userStreak);
    });

    socket.on('flip:state', (data) => {
      setGameState(data);

      // Audio trigger for spinning state
      if (data.status === 'SPINNING' && !spinningSoundRef.current) {
        spinningSoundRef.current = true;
        playSpin();
      }

      if (data.status !== 'SPINNING') {
        spinningSoundRef.current = false;
      }

      // Clear myBet when a new WAITING phase starts
      if (data.status === 'WAITING' && !data.roundStarted) {
        setMyBet(null);
        setRoundStartMsg(null);
        setShowWinConfetti(false);
      }

      if (data.status === 'RESULT' && data.winningChoice) {
        if (toastedRoundRef.current !== data.roundNumber) {
          toastedRoundRef.current = data.roundNumber;

          setHistory((prev) => [
            { round: data.roundNumber, result: data.result, choice: data.winningChoice },
            ...prev.slice(0, 14),
          ]);

          const myResult = data.winners?.find((w) => w.username === user?.username);
          if (myResult) {
            setUserStreak(myResult.streak);
            if (myResult.won) {
              playWin();
              setShowWinConfetti(true);
              toast.success(`🔥 Won +${myResult.payout.toLocaleString()} Credits! Streak: ${myResult.streak}`, {
                duration: 3000,
                icon: '🎉',
              });
            } else {
              playLose();
              toast.error(`Lost ${myResult.amount} Credits — better luck next round!`, { duration: 2500 });
            }
          }
        }
      }
    });

    socket.on('flip:betConfirmed', (bet) => {
      setMyBet(bet);
      playClick();
      toast.success(`Bet locked in: ${bet.amount} Credits on ${bet.choice}`);
    });

    socket.on('flip:roundStarting', ({ by, timeLeft }) => {
      setRoundStartMsg(`${by} started the round! ${timeLeft}s countdown begins…`);
    });

    socket.on('flip:error', (msg) => {
      toast.error(msg);
    });

    socket.on('balance:update', ({ credits }) => {
      updateBalance(credits);
    });

    return () => {
      socket.off('flip:init');
      socket.off('flip:state');
      socket.off('flip:betConfirmed');
      socket.off('flip:roundStarting');
      socket.off('flip:error');
      socket.off('balance:update');
    };
  }, [socket, user, updateBalance, playSpin, playWin, playLose, playClick]);

  const handlePlaceBet = (choice) => {
    if ((gameState.status !== 'WAITING' && gameState.status !== 'BETTING') || myBet) return;
    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount < 1) {
      toast.error('Minimum bet is 1 credit');
      return;
    }
    if (amount > balance) {
      setShowInsufficientModal(true);
      return;
    }
    const token = localStorage.getItem('7wheel_token');
    socket.emit('flip:bet', { amount, choice, token });
  };

  const getMultiplierNum = (streak) => {
    if (streak >= 10) return 3.0;
    if (streak >= 5) return 2.25;
    if (streak >= 3) return 2.0;
    return 1.85;
  };

  const canBet = (gameState.status === 'WAITING' || gameState.status === 'BETTING') && !myBet;

  // Ratio stats for FLIP vs FLOP
  const flipCount = history.filter((h) => h.choice === 'FLIP').length;
  const flopCount = history.filter((h) => h.choice === 'FLOP').length;
  const totalHistory = history.length || 1;
  const flipPercent = Math.round((flipCount / totalHistory) * 100);
  const flopPercent = 100 - flipPercent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[300px] bg-cyan-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[300px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

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

            {/* Win Streak Badge */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl">
              <Flame size={16} className="text-amber-400 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-amber-300">Streak:</span>
              <span className="text-xs font-black text-amber-400 font-display">
                {userStreak} {userStreak > 0 ? `(${getMultiplierNum(userStreak)}×)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* How to Play Collapse */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card p-5 border border-brand-500/30 bg-slate-950/90 text-xs text-slate-300 space-y-3 rounded-2xl shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-display font-black text-sm text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-400" /> Rapid Flip or Flop Mechanics
                </span>
                <button onClick={() => setShowRules(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-cyan-400">FLIP (1 – 6)</p>
                  <p className="text-slate-400">Wins if the random 1-12 wheel lands on the lower half (1, 2, 3, 4, 5, 6).</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-purple-400">FLOP (7 – 12)</p>
                  <p className="text-slate-400">Wins if the random 1-12 wheel lands on the upper half (7, 8, 9, 10, 11, 12).</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span><ShieldCheck size={12} className="inline mr-1 text-slate-400" /><strong>Cryptographically Fair:</strong> Powered by Node <code>crypto.randomInt</code>.</span>
                <span><TrendingUp size={12} className="inline mr-1 text-amber-400" />Streaks boost payout from <strong>1.85× up to 3.0×</strong>!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streak Multiplier Ladder Bar */}
        <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-amber-400" /> Streak Multiplier Boost Ladder
            </span>
            <span className="text-[11px] text-amber-400 font-extrabold font-mono">
              Current: {getMultiplierNum(userStreak)}×
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { level: '1-2 Wins', mult: '1.85×', min: 0, max: 2 },
              { level: '3-4 Wins', mult: '2.00×', min: 3, max: 4 },
              { level: '5-9 Wins', mult: '2.25×', min: 5, max: 9 },
              { level: '10+ Wins', mult: '3.00×', min: 10, max: 99 },
            ].map((step) => {
              const active = userStreak >= step.min;
              const isCurrent = userStreak >= step.min && userStreak <= step.max;

              return (
                <div
                  key={step.level}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : active
                      ? 'bg-slate-900 border-amber-500/40 text-amber-400/80'
                      : 'bg-slate-950 border-slate-800/80 text-slate-600'
                  }`}
                >
                  <span className="text-[10px] font-bold block uppercase tracking-wider">{step.level}</span>
                  <span className="font-display font-black text-sm block mt-0.5">{step.mult}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Central Interactive Round Arena & Coin Wheel */}
        <div className="relative card p-6 md:p-8 border-2 border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl text-center space-y-6 shadow-2xl overflow-hidden">
          
          <ConfettiCanvas active={showWinConfetti} />

          {/* Top Status & Player Count */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
            <span className="font-mono font-bold text-slate-300">Round #{gameState.roundNumber}</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users size={14} className="text-brand-400" /> {gameState.totalPlayers} in lobby
            </span>
          </div>

          {/* Center 3D Animated Coin / Result Display */}
          <div className="py-4 flex flex-col items-center justify-center min-h-[160px] relative">
            {gameState.status === 'WAITING' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 via-purple-600 to-pink-500 p-1 shadow-lg shadow-purple-500/20 mx-auto flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                    <Dices size={36} className="text-white" />
                  </div>
                </div>
                <p className="text-sm font-extrabold text-white mt-2">Waiting for Bets…</p>
                <p className="text-xs text-slate-400">First bet starts the 5-second countdown!</p>
              </motion.div>
            )}

            {gameState.status === 'BETTING' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-lg shadow-emerald-500/30 mx-auto flex items-center justify-center animate-pulse">
                  <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Ends In</span>
                    <span className="font-display font-black text-4xl text-white font-mono">{gameState.timeLeft}s</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-pulse mt-2">
                  Betting Open — {gameState.bettorCount} Bet{gameState.bettorCount !== 1 ? 's' : ''} Placed
                </p>
              </motion.div>
            )}

            {gameState.status === 'SPINNING' && (
              <div className="space-y-3">
                <motion.div
                  className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-1 shadow-2xl shadow-purple-500/40 mx-auto flex items-center justify-center"
                  animate={{ rotateY: [0, 360, 720, 1080] }}
                  transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity }}
                >
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                    <Zap size={40} className="text-yellow-400 fill-yellow-400" />
                  </div>
                </motion.div>
                <p className="text-sm font-bold text-brand-300 animate-pulse">Flipping Outcome…</p>
              </div>
            )}

            {gameState.status === 'RESULT' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-3"
              >
                <div
                  className={`w-28 h-28 rounded-full p-1 shadow-2xl mx-auto flex items-center justify-center ${
                    gameState.winningChoice === 'FLIP'
                      ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-cyan-500/40'
                      : 'bg-gradient-to-tr from-purple-400 to-pink-600 shadow-purple-500/40'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-yellow-400 font-display">{gameState.result}</span>
                    <span className={`text-[10px] font-extrabold uppercase ${gameState.winningChoice === 'FLIP' ? 'text-cyan-400' : 'text-purple-400'}`}>
                      {gameState.winningChoice}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Winning Outcome</p>
                  <p className={`text-2xl font-black font-display ${gameState.winningChoice === 'FLIP' ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {gameState.winningChoice} LANDED ({gameState.result})
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* History & Distribution Ratio Bar */}
          {history.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-cyan-400">FLIP {flipPercent}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Last {history.length} Spins</span>
                <span className="font-bold text-purple-400">FLOP {flopPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" style={{ width: `${flipPercent}%` }} />
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${flopPercent}%` }} />
              </div>

              {/* History Pills */}
              <div className="flex items-center justify-center gap-1.5 pt-2 overflow-x-auto">
                {history.map((h, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                      h.choice === 'FLIP'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {h.result} ({h.choice[0]})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Bet Confirmation Status Panel */}
        {myBet && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-5 border-2 rounded-2xl ${
              gameState.status === 'RESULT'
                ? gameState.winners?.find((w) => w.username === user?.username)?.won
                  ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'border-red-500/40 bg-red-950/10'
                : myBet.choice === 'FLIP'
                ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'border-purple-500/50 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={26}
                className={
                  myBet.choice === 'FLIP' ? 'text-cyan-400' : 'text-purple-400'
                }
              />
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                  Bet Locked In
                </p>
                <p className={`text-xl font-black font-display ${myBet.choice === 'FLIP' ? 'text-cyan-300' : 'text-purple-300'}`}>
                  {myBet.amount.toLocaleString()} Credits on {myBet.choice}
                </p>
              </div>

              {(gameState.status === 'BETTING' || gameState.status === 'SPINNING') && (
                <motion.div
                  className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Dual Betting Cards (FLIP vs FLOP) */}
        <AnimatePresence>
          {canBet && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* FLIP (1-6) */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePlaceBet('FLIP')}
                className="card p-6 text-left border-2 border-slate-800 hover:border-cyan-500/60 bg-slate-950/80 hover:bg-cyan-950/20 transition-all rounded-3xl group relative overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-black text-cyan-400 font-display tracking-tight">FLIP</span>
                  <span className="text-xs font-extrabold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/20">
                    Numbers 1 – 6
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">Lower half of wheel · Payout up to {getMultiplierNum(userStreak)}×!</p>
                <div className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 group-hover:from-cyan-500 group-hover:to-blue-500 text-center font-display font-black text-base text-white shadow-lg shadow-cyan-500/20">
                  BET FLIP — {betAmount} Credits
                </div>
              </motion.button>

              {/* FLOP (7-12) */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePlaceBet('FLOP')}
                className="card p-6 text-left border-2 border-slate-800 hover:border-purple-500/60 bg-slate-950/80 hover:bg-purple-950/20 transition-all rounded-3xl group relative overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-black text-purple-400 font-display tracking-tight">FLOP</span>
                  <span className="text-xs font-extrabold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
                    Numbers 7 – 12
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">Upper half of wheel · Payout up to {getMultiplierNum(userStreak)}×!</p>
                <div className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 group-hover:from-purple-500 group-hover:to-pink-500 text-center font-display font-black text-base text-white shadow-lg shadow-purple-500/20">
                  BET FLOP — {betAmount} Credits
                </div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wager Selection Bar */}
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
                  disabled={!canBet}
                  className="input-field w-24 text-sm font-black text-center py-1.5 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                />
                <Coins size={14} className="text-amber-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
            {[10, 25, 50, 100, 250].map((v) => (
              <button
                key={v}
                onClick={() => { playClick(); setBetAmount(String(v)); }}
                disabled={!canBet}
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
              disabled={!canBet || balance < 20}
              className="text-xs font-extrabold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 text-amber-400 transition-all disabled:opacity-40"
            >
              ½
            </button>
            <button
              onClick={() => { playClick(); setBetAmount(String(balance)); }}
              disabled={!canBet || balance < 1}
              className="text-xs font-extrabold px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500 text-red-400 transition-all disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Round Winners Table */}
        {gameState.status === 'RESULT' && gameState.winners?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5 border border-slate-800 bg-slate-950/80 rounded-2xl space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-extrabold text-white">
              <Trophy size={16} className="text-yellow-400" />
              Round #{gameState.roundNumber} Payouts
            </div>
            <div className="space-y-2">
              {gameState.winners.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl border ${
                    w.won
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-semibold">{w.username}</span>
                  <span>
                    {w.choice} · {w.amount} Credits
                    {w.won && ` → +${w.payout.toLocaleString()} Credits (${w.streak} streak)`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <InsufficientCreditsModal
        open={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        onOpenBuyCredits={() => setShowBuyModal(true)}
      />
      <BuyCreditsModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} />
    </div>
  );
}
