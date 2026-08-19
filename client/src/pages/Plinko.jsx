import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Zap, Volume2, VolumeX, ShieldAlert, Sparkles, Trophy, Play, Layers, Flame, Dices, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import axios from 'axios';
import toast from 'react-hot-toast';

const MULTIPLIER_TABLES = {
  8: {
    LOW: [5.6, 2.1, 1.1, 1.0, 0.0, 1.0, 1.1, 2.1, 5.6],
    MEDIUM: [13, 3.0, 1.3, 0.7, 0.0, 0.7, 1.3, 3.0, 13],
    HIGH: [29, 4.0, 1.5, 0.2, 0.0, 0.2, 1.5, 4.0, 29],
  },
  10: {
    LOW: [8.9, 3.0, 1.4, 1.1, 1.0, 0.0, 1.0, 1.1, 1.4, 3.0, 8.9],
    MEDIUM: [22, 5.0, 2.0, 1.4, 0.5, 0.0, 0.5, 1.4, 2.0, 5.0, 22],
    HIGH: [76, 10, 3.0, 0.9, 0.2, 0.0, 0.2, 0.9, 3.0, 10, 76],
  },
  12: {
    LOW: [10, 3.0, 1.6, 1.4, 1.1, 1.0, 0.0, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    MEDIUM: [33, 11, 4.0, 2.0, 1.1, 0.5, 0.0, 0.5, 1.1, 2.0, 4.0, 11, 33],
    HIGH: [170, 24, 8.1, 2.0, 0.7, 0.0, 0.0, 0.7, 2.0, 8.1, 24, 170],
  },
  14: {
    LOW: [15, 4.0, 1.9, 1.4, 1.2, 1.1, 1.0, 0.0, 1.0, 1.1, 1.2, 1.4, 1.9, 4.0, 15],
    MEDIUM: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.4, 0.0, 0.4, 1.0, 1.9, 4.0, 7.0, 15, 58],
    HIGH: [420, 56, 18, 5.0, 1.9, 0.3, 0.0, 0.0, 0.0, 0.3, 1.9, 5.0, 18, 56, 420],
  },
  16: {
    LOW: [16, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.0, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
    MEDIUM: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.4, 0.0, 0.4, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
    HIGH: [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.0, 0.0, 0.0, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000],
  },
};

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

// ── Interactive 2D Canvas Plinko Engine Component ─────────────────────────────
function PlinkoCanvas({ rows, activeBallDrops, onBallLanded, playClick }) {
  const canvasRef = useRef(null);
  const ballsRef = useRef([]); // Active animated balls
  const litPegsRef = useRef(new Map()); // pegKey -> intensity (1.0 to 0.0)

  // Track active ball drops
  useEffect(() => {
    if (activeBallDrops.length === 0) return;

    // Add new drops to internal animation queue
    activeBallDrops.forEach((drop) => {
      const exists = ballsRef.current.some((b) => b.id === drop.id);
      if (!exists) {
        ballsRef.current.push({
          id: drop.id,
          path: drop.path,
          bucketIndex: drop.bucketIndex,
          multiplier: drop.multiplier,
          payout: drop.payout,
          step: 0, // step 0 to rows
          progress: 0, // 0 to 1 between steps
          color: drop.multiplier >= 10 ? '#f59e0b' : drop.multiplier >= 2 ? '#10b981' : '#ec4899',
        });
      }
    });
  }, [activeBallDrops]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Board Geometry Math
      const paddingTop = 40;
      const paddingBottom = 60;
      const boardHeight = height - paddingTop - paddingBottom;
      const rowSpacing = boardHeight / (rows + 1);

      // Compute Peg Locations for each row
      const pegLocations = [];
      for (let r = 0; r <= rows; r++) {
        const numPegs = r + 3;
        const rowY = paddingTop + r * rowSpacing;
        const colSpacing = Math.min(36, (width - 40) / (rows + 3));
        const rowWidth = (numPegs - 1) * colSpacing;
        const startX = (width - rowWidth) / 2;

        const rowPegs = [];
        for (let p = 0; p < numPegs; p++) {
          rowPegs.push({ x: startX + p * colSpacing, y: rowY, key: `${r}-${p}` });
        }
        pegLocations.push(rowPegs);
      }

      // Update Lit Peg intensity
      litPegsRef.current.forEach((val, key) => {
        const nextVal = val - 0.05;
        if (nextVal <= 0) litPegsRef.current.delete(key);
        else litPegsRef.current.set(key, nextVal);
      });

      // Render Pegs Grid
      for (let r = 0; r < pegLocations.length - 1; r++) {
        const rowPegs = pegLocations[r];
        for (let p = 0; p < rowPegs.length; p++) {
          const peg = rowPegs[p];
          const hitGlow = litPegsRef.current.get(peg.key) || 0;

          ctx.save();
          if (hitGlow > 0) {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 12 * hitGlow;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, 5 + 2 * hitGlow, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Update & Render Animated Balls
      const remainingBalls = [];

      for (let i = 0; i < ballsRef.current.length; i++) {
        const b = ballsRef.current[i];

        b.progress += 0.12; // Speed of bounce
        if (b.progress >= 1.0) {
          b.progress = 0;
          b.step++;

          // Peg collision hit
          if (b.step <= rows) {
            const currentPegRow = pegLocations[b.step - 1];
            // Calculate col index based on 0s and 1s sum
            let colIdx = 0;
            for (let k = 0; k < b.step; k++) {
              colIdx += b.path[k];
            }
            if (currentPegRow && currentPegRow[colIdx]) {
              litPegsRef.current.set(currentPegRow[colIdx].key, 1.0);
              playClick?.();
            }
          }
        }

        if (b.step >= rows) {
          // Ball finished path and landed in bucket!
          onBallLanded?.(b);
        } else {
          remainingBalls.push(b);

          // Calculate current 2D interpolated position (x, y)
          const stepIndex = b.step;
          let currentCol = 0;
          for (let k = 0; k < stepIndex; k++) {
            currentCol += b.path[k];
          }

          const startPeg = pegLocations[stepIndex][currentCol + 1];
          const nextDir = b.path[stepIndex];
          const nextCol = currentCol + nextDir;
          const endPeg = pegLocations[stepIndex + 1][nextCol + 1];

          if (startPeg && endPeg) {
            const t = b.progress;
            // Parabolic arc bounce: y offset
            const arcY = Math.sin(t * Math.PI) * -12;
            const ballX = startPeg.x + (endPeg.x - startPeg.x) * t;
            const ballY = startPeg.y + (endPeg.y - startPeg.y) * t + arcY;

            // Render glowing 3D ball
            ctx.save();
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
            ctx.fill();

            // Inner white shine dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ballX - 2.5, ballY - 2.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      ballsRef.current = remainingBalls;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [rows, playClick, onBallLanded]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full min-h-[380px] pointer-events-none rounded-3xl relative z-10"
    />
  );
}

// ── Main Plinko Page Component ───────────────────────────────────────────────
export default function Plinko() {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { playClick, playWin, playLose, soundEnabled, toggleSound } = useSounds();

  const [betAmount, setBetAmount] = useState('25');
  const [riskLevel, setRiskLevel] = useState('MEDIUM');
  const [rows, setRows] = useState(12);
  const [activeBallDrops, setActiveBallDrops] = useState([]);
  const [lastWin, setLastWin] = useState(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [history, setHistory] = useState([1.1, 0.6, 4.0, 11, 0.3, 2.0, 33]);

  const balance = user?.balance ?? 0;
  const multipliers = MULTIPLIER_TABLES[rows][riskLevel];

  // Trigger 1 Ball Drop
  const handleDropBall = async () => {
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet < 1) { toast.error('Minimum bet is 1 credit'); return; }
    if (bet > balance) { setShowInsufficientModal(true); return; }

    // 1) Immediately deduct wager upfront from local balance when dropping ball
    updateBalance((prev) => Math.max(0, prev - bet));

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/plinko/drop', { betAmount: bet, riskLevel, rows }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const dropId = Date.now() + '-' + Math.random();
      const dropData = {
        id: dropId,
        path: data.path,
        bucketIndex: data.bucketIndex,
        multiplier: data.multiplier,
        payout: data.payout,
        balanceAfter: data.balanceAfter,
      };

      setActiveBallDrops((prev) => [...prev, dropData]);
    } catch (err) {
      // Refund wager if API drop fails
      updateBalance((prev) => prev + bet);
      toast.error(err.response?.data?.message || 'Drop failed.');
    }
  };

  // Trigger 5 Balls Drop
  const handleMultiDrop = async (count = 5) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        handleDropBall();
      }, i * 220);
    }
  };

  // Called when canvas ball lands in bucket
  const handleBallLanded = useCallback((ball) => {
    setLastWin(ball);
    setHistory((prev) => [ball.multiplier, ...prev.slice(0, 9)]);

    // 2) Update balance with ball's earned payout only when it physically lands in bucket!
    if (ball.payout > 0) {
      updateBalance((prev) => prev + ball.payout);
    }

    if (ball.multiplier >= 1.0) {
      playWin();
      if (ball.multiplier >= 10.0) setShowWinConfetti(true);
    } else {
      playLose();
    }

    setActiveBallDrops((prev) => prev.filter((b) => b.id !== ball.id));
  }, [playWin, playLose, updateBalance]);

  const getBucketColor = (mult) => {
    if (mult === 0) return 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)] font-black';
    if (mult >= 100) return 'bg-amber-400 text-slate-950 shadow-[0_0_15px_#f59e0b] font-black border-amber-300';
    if (mult >= 10) return 'bg-purple-600 text-white shadow-[0_0_12px_#a855f7] font-black border-purple-400';
    if (mult >= 2) return 'bg-emerald-500 text-slate-950 font-black border-emerald-300';
    if (mult >= 1) return 'bg-teal-700/80 text-white border-teal-500/50';
    return 'bg-slate-900 text-slate-400 border-slate-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/3 w-[600px] h-[350px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6 relative z-10">

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
              Plinko Multipliers
            </button>
          </div>
        </div>

        {/* Main Arena: Control Sidebar & Plinko Peg Board */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Control Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="card p-5 border border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-5 shadow-2xl">
              
              {/* Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Layers size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="font-display font-black text-xl text-white tracking-wide">PLINKO PYRAMID</h1>
                  <p className="text-[11px] text-slate-400">Physics Bounces · Multipliers up to 1000×</p>
                </div>
              </div>

              {/* Risk Level Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold flex items-center justify-between">
                  <span className="text-slate-300">Risk Profile</span>
                  <span className="text-purple-400 font-mono font-extrabold">{riskLevel} RISK</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => { playClick(); setRiskLevel(lvl); }}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        riskLevel === lvl
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row Count Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold flex items-center justify-between">
                  <span className="text-slate-300">Pyramid Rows</span>
                  <span className="text-emerald-400 font-mono font-extrabold">{rows} Rows</span>
                </label>

                <div className="grid grid-cols-5 gap-1.5">
                  {[8, 10, 12, 14, 16].map((r) => (
                    <button
                      key={r}
                      onClick={() => { playClick(); setRows(r); }}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        rows === r
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}
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
                    className="input-field flex-1 text-sm font-black text-center py-2 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                  />
                  <Coins size={14} className="text-yellow-400" />
                </div>

                {/* Quick Bet Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[10, 25, 50, 100, 250].map((v) => (
                    <button
                      key={v}
                      onClick={() => { playClick(); setBetAmount(String(v)); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        betAmount === String(v)
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                  <button
                    onClick={() => { playClick(); setBetAmount(String(Math.floor(balance / 2))); }}
                    disabled={balance < 20}
                    className="py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:border-amber-500 transition-all disabled:opacity-40"
                  >
                    ½
                  </button>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-2 pt-2">
                <motion.button
                  onClick={handleDropBall}
                  disabled={balance < 1}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-display font-black text-lg tracking-wider bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40 flex items-center justify-center gap-2 uppercase transition-all"
                >
                  <Play size={20} className="fill-white" />
                  DROP BALL — {betAmount} Credits
                </motion.button>

                <button
                  onClick={() => handleMultiDrop(5)}
                  disabled={balance < parseInt(betAmount, 10) * 5}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} className="text-cyan-400" />
                  Drop 5 Balls ({(parseInt(betAmount, 10) * 5).toLocaleString()} Credits)
                </button>
              </div>
            </div>

            {/* Last Win Overview Card */}
            {lastWin && (
              <div className="card p-4 border border-slate-800 bg-slate-950/60 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Last Landing</span>
                  <span className="font-display font-black text-xl text-emerald-400 mt-0.5 block">
                    +{lastWin.payout.toLocaleString()} Credits ({lastWin.multiplier}×)
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Trophy size={18} />
                </div>
              </div>
            )}
          </div>

          {/* Right: 2D Canvas Plinko Board & Multipliers Bar */}
          <div className="lg:col-span-7">
            <div className="relative card p-6 border-2 border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col justify-between items-center text-center overflow-hidden min-h-[460px]">
              
              <ConfettiCanvas active={showWinConfetti} />

              {/* 2D Canvas Interactive Peg Engine */}
              <div className="w-full h-full min-h-[380px] relative flex items-center justify-center">
                <PlinkoCanvas
                  rows={rows}
                  activeBallDrops={activeBallDrops}
                  onBallLanded={handleBallLanded}
                  playClick={playClick}
                />
              </div>

              {/* Multipliers Bucket Bar at Bottom */}
              <div className="w-full border-t border-slate-800/80 pt-4">
                <div className="flex items-center justify-center gap-1 overflow-x-auto">
                  {multipliers.map((mult, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 min-w-[36px] py-2 px-1 rounded-xl text-[10px] md:text-xs font-mono font-black border transition-all ${getBucketColor(mult)}`}
                    >
                      {mult}×
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Landing Multipliers History */}
              {history.length > 0 && (
                <div className="w-full pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500">History:</span>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {history.map((m, i) => (
                      <span
                        key={i}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBucketColor(m)}`}
                      >
                        {m}×
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                  <Layers size={22} className="text-purple-400" />
                  <h1 className="font-display font-black text-xl text-white">Plinko Peg Board</h1>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <p><strong>Pyramid Rows:</strong> Choose between 8, 10, 12, 14, or 16 rows of pegs.</p>
                <p><strong>Risk Profiles:</strong> High Risk features edge multipliers up to <strong>1000×</strong>!</p>
                <p><strong>Fair RTP:</strong> 97.0% Return to Player. Binary peg bounce choices are generated using Node <code>crypto.randomInt</code>.</p>
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
