import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Zap, Volume2, VolumeX, ShieldAlert, Sparkles, Trophy, Play, Plus, Hand, Layers, RotateCcw, Award } from 'lucide-react';
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

    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#ef4444', '#a855f7'];
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

// ── Playing Card Graphic Component ───────────────────────────────────────────
function PlayingCard({ card, index }) {
  if (card?.hidden) {
    return (
      <motion.div
        initial={{ scale: 0.8, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ delay: index * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="w-16 h-24 md:w-20 md:h-28 rounded-xl border-2 border-yellow-500/50 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 shadow-xl flex items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-1 rounded-lg border border-amber-500/30 bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:8px_8px] opacity-40" />
        <span className="font-display font-black text-xs text-amber-400 z-10 uppercase tracking-widest">7W</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, y: -20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
      className={`w-16 h-24 md:w-20 md:h-28 rounded-xl border-2 bg-slate-950 p-2 shadow-2xl flex flex-col justify-between select-none relative ${
        card.isRed ? 'border-red-500/60 text-red-400' : 'border-slate-700 text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between font-display font-black text-sm md:text-base leading-none">
        <span>{card.rank}</span>
        <span className="text-xs">{card.suit}</span>
      </div>

      <div className="text-center font-black text-2xl md:text-3xl font-display my-auto">
        {card.suit}
      </div>

      <div className="flex items-center justify-between font-display font-black text-sm md:text-base leading-none rotate-180">
        <span>{card.rank}</span>
        <span className="text-xs">{card.suit}</span>
      </div>
    </motion.div>
  );
}

// ── Main Blackjack Component ─────────────────────────────────────────────────
export default function Blackjack() {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { playClick, playWin, playLose, playStreak, soundEnabled, toggleSound } = useSounds();

  const [betAmount, setBetAmount] = useState('25');
  const [gameState, setGameState] = useState('IDLE'); // IDLE, IN_PROGRESS, WON, LOST, PUSH, BUSTED, BLACKJACK
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerEval, setPlayerEval] = useState(null);
  const [dealerEval, setDealerEval] = useState(null);
  const [payout, setPayout] = useState(0);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const [bjGamesPlayed, setBjGamesPlayed] = useState(() => {
    return parseInt(localStorage.getItem('7wheel_bj_games_played') || '0', 10);
  });

  const recordGameFinished = () => {
    setBjGamesPlayed((prev) => {
      const next = prev + 1;
      localStorage.setItem('7wheel_bj_games_played', String(next));
      return next;
    });
  };

  const balance = user?.balance ?? 0;

  // Beginner strategy advice generator
  const getProTip = () => {
    if (!playerEval || gameState !== 'IN_PROGRESS') return null;
    const score = playerEval.total;

    if (score <= 11) {
      return {
        text: "Beginner Tip: Safe to HIT! You cannot bust on scores 11 or lower.",
        color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
      };
    }
    if (score === 21) {
      return {
        text: "Perfect 21! Click STAND to finish your hand.",
        color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      };
    }
    if (score >= 17) {
      return {
        text: "Strong Score! You have a high risk of busting if you Hit. STAND recommended.",
        color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      };
    }
    return {
      text: "Caution Zone (12-16): High bust risk. Hit if Dealer has 7+, Stand if Dealer has 2-6.",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-300"
    };
  };

  // Deal / Start new hand
  const handleDeal = async () => {
    if (gameState === 'IN_PROGRESS' || loadingAction) return;
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet < 1) { toast.error('Minimum bet is 1 credit'); return; }
    if (bet > balance) { setShowInsufficientModal(true); return; }

    playClick();
    setLoadingAction(true);
    setShowWinConfetti(false);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/blackjack/start', { betAmount: bet }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGameState(data.status);
      setPlayerCards(data.playerCards);
      setDealerCards(data.dealerCards);
      setPlayerEval(data.playerEval);
      setDealerEval(data.dealerEval);

      if (data.status === 'BLACKJACK') {
        playWin();
        setShowWinConfetti(true);
        setPayout(data.payout);
        updateBalance(data.balanceAfter);
        recordGameFinished();
        toast.success(`NATURAL BLACKJACK! Won +${data.payout.toLocaleString()} Credits!`, { duration: 4000 });
      } else if (data.status === 'PUSH') {
        setPayout(data.payout);
        updateBalance(data.balanceAfter);
        recordGameFinished();
        toast('Push / Tie — Wager returned!');
      } else {
        updateBalance(data.balanceAfter);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deal cards.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Hit
  const handleHit = async () => {
    if (gameState !== 'IN_PROGRESS' || loadingAction) return;
    playClick();
    setLoadingAction(true);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/blackjack/hit', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGameState(data.status);
      setPlayerCards(data.playerCards);
      setPlayerEval(data.playerEval);

      if (data.status === 'BUSTED') {
        playLose();
        setDealerCards(data.dealerCards);
        setDealerEval(data.dealerEval);
        recordGameFinished();
        toast.error('BUST! Total exceeded 21.');
      } else {
        playStreak();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hit failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Stand
  const handleStand = async () => {
    if (gameState !== 'IN_PROGRESS' || loadingAction) return;
    playClick();
    setLoadingAction(true);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/blackjack/stand', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGameState(data.status);
      setDealerCards(data.dealerCards);
      setDealerEval(data.dealerEval);
      setPayout(data.payout);

      if (data.status === 'WON') {
        playWin();
        setShowWinConfetti(true);
        updateBalance(data.balanceAfter);
        recordGameFinished();
        toast.success(`Won +${data.payout.toLocaleString()} Credits!`, { duration: 3500 });
      } else if (data.status === 'PUSH') {
        updateBalance(data.balanceAfter);
        recordGameFinished();
        toast('Push / Tie — Wager returned!');
      } else {
        playLose();
        recordGameFinished();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stand failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Double Down
  const handleDouble = async () => {
    if (gameState !== 'IN_PROGRESS' || playerCards.length !== 2 || loadingAction) return;
    const bet = parseInt(betAmount, 10);
    if (bet > balance) { toast.error('Insufficient balance to Double Down'); return; }

    playClick();
    setLoadingAction(true);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/blackjack/double', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGameState(data.status);
      setPlayerCards(data.playerCards);
      setDealerCards(data.dealerCards);
      setPlayerEval(data.playerEval);
      setDealerEval(data.dealerEval);
      setPayout(data.payout);

      if (data.status === 'WON') {
        playWin();
        setShowWinConfetti(true);
        updateBalance(data.balanceAfter);
        toast.success(`Double Down WIN! Won +${data.payout.toLocaleString()} Credits!`, { duration: 4000 });
      } else if (data.status === 'PUSH') {
        updateBalance(data.balanceAfter);
        toast('Push / Tie — Doubled wager returned!');
      } else {
        playLose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Double Down failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute top-10 left-1/3 w-[600px] h-[350px] bg-emerald-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

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
              onClick={() => { playClick(); setShowPaytable(true); }}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-3.5 py-2 rounded-xl border border-brand-500/30 hover:border-brand-400/50 transition-all"
            >
              <HelpCircle size={15} />
              Rules & Payouts
            </button>
          </div>
        </div>

        {/* Felt Table Card */}
        <div className="relative card p-6 md:p-8 border-2 border-emerald-600/40 bg-gradient-to-b from-emerald-950/70 via-slate-950 to-slate-950 backdrop-blur-xl rounded-3xl shadow-2xl space-y-8 overflow-hidden min-h-[420px] flex flex-col justify-between">
          
          <ConfettiCanvas active={showWinConfetti} />

          {/* Top: Dealer Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={14} className="text-amber-400" /> House Dealer
              </span>
              <span className="font-mono text-amber-400">
                {dealerEval ? (dealerEval.isHidden ? `Score: ${dealerEval.total}` : `Score: ${dealerEval.total}`) : 'Waiting…'}
              </span>
            </div>

            <div className="flex items-center gap-3 min-h-[110px]">
              {dealerCards.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-6">Cards will appear here once dealt.</div>
              ) : (
                dealerCards.map((card, i) => <PlayingCard key={i} card={card} index={i} />)
              )}
            </div>
          </div>

          {/* Center Result Overlay Banner */}
          <div className="h-14 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {gameState !== 'IDLE' && gameState !== 'IN_PROGRESS' ? (
                <motion.div
                  key="result-banner"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`w-full py-3 px-4 rounded-2xl text-center font-display border flex items-center justify-center gap-3 ${
                    gameState === 'BLACKJACK' || gameState === 'WON'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : gameState === 'PUSH'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-red-500/20 border-red-500/50 text-red-400'
                  }`}
                >
                  {gameState === 'BLACKJACK' && (
                    <>
                      <Trophy size={22} className="text-yellow-400 animate-bounce" />
                      <div>
                        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 block">NATURAL BLACKJACK!</span>
                        <span className="text-2xl font-black text-white">+{payout.toLocaleString()} Credits</span>
                      </div>
                    </>
                  )}

                  {gameState === 'WON' && (
                    <>
                      <Trophy size={22} className="text-yellow-400 animate-bounce" />
                      <div>
                        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 block">YOU WON THE HAND!</span>
                        <span className="text-2xl font-black text-white">+{payout.toLocaleString()} Credits</span>
                      </div>
                    </>
                  )}

                  {gameState === 'PUSH' && (
                    <span className="text-sm font-extrabold text-amber-300">PUSH / TIE — Wager returned ({payout} Credits)</span>
                  )}

                  {(gameState === 'LOST' || gameState === 'BUSTED') && (
                    <span className="text-sm font-extrabold text-red-400">
                      {gameState === 'BUSTED' ? 'BUSTED! Total Exceeded 21' : 'Dealer Won — Hand Complete'}
                    </span>
                  )}
                </motion.div>
              ) : (
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                  {gameState === 'IN_PROGRESS' ? 'Hit, Stand, or Double Down!' : 'Set Wager and Click Deal to Play'}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: Player Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold border-t border-slate-800/80 pt-3">
              <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                Player Hand ({user?.username})
              </span>
              <span className="font-mono text-emerald-400">
                {playerEval ? `${playerEval.isSoft ? 'Soft ' : ''}${playerEval.total}` : 'Score: 0'}
              </span>
            </div>

            <div className="flex items-center gap-3 min-h-[110px]">
              {playerCards.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-6">Your cards will appear here.</div>
              ) : (
                playerCards.map((card, i) => <PlayingCard key={i} card={card} index={i} />)
              )}
            </div>
          </div>
        </div>

        {/* Live Beginner Strategy Pro Tip Banner (Active for First 5 Games) */}
        {gameState === 'IN_PROGRESS' && bjGamesPlayed < 5 && getProTip() && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg ${getProTip().color}`}
          >
            <span>{getProTip().text}</span>
            <span className="text-[10px] opacity-75 font-mono ml-2 shrink-0">
              Guide ({bjGamesPlayed + 1}/5)
            </span>
          </motion.div>
        )}

        {/* Action Controls & Wager Bar */}
        <div className="card p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-4 shadow-xl">
          
          {/* Action Control Buttons (Hit / Stand / Double / Deal) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {gameState === 'IN_PROGRESS' ? (
              <>
                <motion.button
                  onClick={handleHit}
                  disabled={loadingAction}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="py-3.5 px-4 rounded-2xl font-display font-black text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 flex flex-col items-center justify-center gap-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Plus size={16} />
                    <span>HIT</span>
                  </div>
                  <span className="text-[10px] text-cyan-200 font-normal">Take 1 More Card</span>
                </motion.button>

                <motion.button
                  onClick={handleStand}
                  disabled={loadingAction}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="py-3.5 px-4 rounded-2xl font-display font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Hand size={16} />
                    <span>STAND</span>
                  </div>
                  <span className="text-[10px] text-emerald-200 font-normal">Keep Hand & Finish</span>
                </motion.button>

                <motion.button
                  onClick={handleDouble}
                  disabled={playerCards.length !== 2 || loadingAction || balance < parseInt(betAmount, 10)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="py-3.5 px-4 rounded-2xl font-display font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center gap-0.5 disabled:opacity-40"
                >
                  <div className="flex items-center gap-1.5">
                    <Layers size={16} />
                    <span>DOUBLE DOWN</span>
                  </div>
                  <span className="text-[10px] text-slate-900 font-medium">2× Bet + 1 Final Card</span>
                </motion.button>

                <button
                  onClick={handleDeal}
                  disabled={loadingAction}
                  className="py-3.5 px-4 rounded-2xl font-display font-bold text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
                >
                  <div className="flex items-center gap-1">
                    <RotateCcw size={14} />
                    <span>FORFEIT</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Reset Hand</span>
                </button>
              </>
            ) : (
              <motion.button
                onClick={handleDeal}
                disabled={loadingAction || balance < 10}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className="md:col-span-4 py-4 px-6 rounded-2xl font-display font-black text-xl tracking-wider uppercase bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40 flex items-center justify-center gap-3"
              >
                <Play size={22} className="fill-white" />
                DEAL HAND — {betAmount} Credits
              </motion.button>
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
                    disabled={gameState === 'IN_PROGRESS'}
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
                  disabled={gameState === 'IN_PROGRESS'}
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
                disabled={gameState === 'IN_PROGRESS' || balance < 20}
                className="text-xs font-extrabold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 text-amber-400 transition-all disabled:opacity-40"
              >
                ½
              </button>
              <button
                onClick={() => { playClick(); setBetAmount(String(balance)); }}
                disabled={gameState === 'IN_PROGRESS' || balance < 1}
                className="text-xs font-extrabold px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500 text-red-400 transition-all disabled:opacity-40"
              >
                MAX
              </button>
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
                  <Award size={18} className="text-amber-400" />
                  <h2 className="font-display font-black text-lg text-white">Blackjack Rules & Payouts</h2>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-white">
                    Objective of Blackjack:
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Get your hand total as close to <strong>21</strong> as possible without exceeding 21 (Busting). Beat the House Dealer's final score to win!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-white block">Ace (A):</span>
                    <span className="text-slate-400">Counts as 1 or 11 automatically</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-white block">J, Q, K, 10:</span>
                    <span className="text-slate-400">Every face card is worth 10</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span>Natural Blackjack (Ace + 10 on deal)</span>
                    <span className="font-black text-yellow-400">3:2 Payout (2.5×)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span>Standard Hand Win</span>
                    <span className="font-black text-yellow-400">1:1 Payout (2.0×)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span>Double Down</span>
                    <span className="font-black text-yellow-400">Double wager for 1 final card</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
                🛡️ House Dealer hits on 16 or lower and stands on soft 17. 52-card deck shuffled cryptographically.
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
