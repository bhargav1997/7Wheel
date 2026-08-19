import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Zap, Volume2, VolumeX, RotateCcw, Trophy, Sparkles, Disc, Play, Trash2, Flame, Undo2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import axios from 'axios';
import toast from 'react-hot-toast';

// Official European Roulette wheel pocket sequence (0 to 36)
const EUROPEAN_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const CHIP_VALUES = [
  { value: 10,  label: '10',  color: '#3b82f6', bg: 'bg-blue-600 border-blue-300 text-white' },
  { value: 25,  label: '25',  color: '#10b981', bg: 'bg-emerald-600 border-emerald-300 text-white' },
  { value: 50,  label: '50',  color: '#f59e0b', bg: 'bg-amber-600 border-amber-300 text-white' },
  { value: 100, label: '100', color: '#8b5cf6', bg: 'bg-purple-600 border-purple-300 text-white' },
  { value: 250, label: '250', color: '#ef4444', bg: 'bg-red-600 border-red-300 text-white' },
];

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

// ── Realistic SVG European Roulette Wheel ────────────────────────────────────
function SVGWheel({ rotation, landedPocket, spinning }) {
  const numPockets = EUROPEAN_NUMBERS.length; // 37
  const sliceAngle = 360 / numPockets;

  return (
    <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center select-none">
      {/* Outer Mahogany Wood Bezel */}
      <div className="absolute inset-0 rounded-full border-8 border-amber-950/80 bg-gradient-to-br from-amber-900 via-amber-950 to-amber-900 shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-center p-2">
        
        {/* Brass Ring Divider */}
        <div className="w-full h-full rounded-full border-4 border-yellow-600/60 bg-slate-950 relative overflow-hidden flex items-center justify-center shadow-inner">
          
          {/* Animated Wheel Body */}
          <motion.div
            className="w-full h-full rounded-full relative flex items-center justify-center"
            animate={{ rotate: rotation }}
            transition={{ duration: spinning ? 3.2 : 0, ease: [0.15, 0.85, 0.35, 1.0] }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <defs>
                <radialGradient id="brassHub" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#eab308" />
                  <stop offset="85%" stopColor="#854d0e" />
                  <stop offset="100%" stopColor="#451a03" />
                </radialGradient>
              </defs>

              {/* Pockets Wedges */}
              {EUROPEAN_NUMBERS.map((num, i) => {
                const startAngle = i * sliceAngle - 90;
                const endAngle = (i + 1) * sliceAngle - 90;
                const radStart = (startAngle * Math.PI) / 180;
                const radEnd = (endAngle * Math.PI) / 180;

                const rOuter = 195;
                const rInner = 110;

                const x1 = 200 + rOuter * Math.cos(radStart);
                const y1 = 200 + rOuter * Math.sin(radStart);
                const x2 = 200 + rOuter * Math.cos(radEnd);
                const y2 = 200 + rOuter * Math.sin(radEnd);

                const x3 = 200 + rInner * Math.cos(radEnd);
                const y3 = 200 + rInner * Math.sin(radEnd);
                const x4 = 200 + rInner * Math.cos(radStart);
                const y4 = 200 + rInner * Math.sin(radStart);

                const d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;

                let fillColor = '#1e293b'; // black
                if (num === 0) fillColor = '#16a34a'; // green 0
                else if (RED_NUMBERS.includes(num)) fillColor = '#dc2626'; // red

                // Number text position
                const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
                const textR = 152;
                const textX = 200 + textR * Math.cos(midAngle);
                const textY = 200 + textR * Math.sin(midAngle);
                const isSelected = landedPocket === num && !spinning;

                return (
                  <g key={num}>
                    <path
                      d={d}
                      fill={fillColor}
                      stroke="#ca8a04"
                      strokeWidth="1.2"
                      className={isSelected ? 'filter drop-shadow-[0_0_8px_#f59e0b]' : ''}
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${i * sliceAngle + 90}, ${textX}, ${textY})`}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

              {/* Inner Brass Rim */}
              <circle cx="200" cy="200" r="110" fill="none" stroke="#eab308" strokeWidth="4" />
              
              {/* Central Brass Spindle Turret */}
              <circle cx="200" cy="200" r="55" fill="url(#brassHub)" stroke="#fef08a" strokeWidth="3" />
              
              {/* 4-Arm Turret Handles */}
              <rect x="194" y="125" width="12" height="150" rx="4" fill="#ca8a04" />
              <rect x="125" y="194" width="150" height="12" rx="4" fill="#ca8a04" />
              <circle cx="200" cy="200" r="22" fill="#78350f" stroke="#fef08a" strokeWidth="2" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Top Fixed Needle Pointer */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-yellow-400 z-30 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

// ── Main European Roulette Component ─────────────────────────────────────────
export default function Roulette() {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { playClick, playWin, playLose, playSpin, soundEnabled, toggleSound } = useSounds();

  const [selectedChip, setSelectedChip] = useState(25);
  const [placedBets, setPlacedBets] = useState([]); // { key, betType, target, amount }
  const [betHistoryStack, setBetHistoryStack] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [history, setHistory] = useState([17, 0, 32, 15, 23, 10, 5, 24, 16]);

  const balance = user?.balance ?? 0;
  const totalWager = placedBets.reduce((sum, b) => sum + b.amount, 0);

  // Add chip to table location
  const handlePlaceChip = (betType, target, key) => {
    if (spinning) return;
    playClick();

    // If previous spin result is showing, clear result banner
    if (spinResult) setSpinResult(null);

    setBetHistoryStack((prev) => [...prev, placedBets]);

    setPlacedBets((prev) => {
      const existing = prev.find((b) => b.key === key);
      if (existing) {
        return prev.map((b) => (b.key === key ? { ...b, amount: b.amount + selectedChip } : b));
      }
      return [...prev, { key, betType, target, amount: selectedChip }];
    });
  };

  const handleResetTable = () => {
    if (spinning) return;
    playClick();
    setPlacedBets([]);
    setSpinResult(null);
    setBetHistoryStack([]);
  };

  const handleUndo = () => {
    if (spinning || betHistoryStack.length === 0) return;
    playClick();
    const lastState = betHistoryStack[betHistoryStack.length - 1];
    setPlacedBets(lastState);
    setBetHistoryStack((prev) => prev.slice(0, -1));
  };

  const handleClearBets = () => {
    if (spinning) return;
    playClick();
    setBetHistoryStack((prev) => [...prev, placedBets]);
    setPlacedBets([]);
  };

  const handleDoubleBets = () => {
    if (spinning || placedBets.length === 0) return;
    playClick();
    setBetHistoryStack((prev) => [...prev, placedBets]);
    setPlacedBets((prev) => prev.map((b) => ({ ...b, amount: b.amount * 2 })));
  };

  // Trigger Spin
  const handleSpin = async () => {
    if (spinning || placedBets.length === 0) return;
    if (totalWager > balance) { setShowInsufficientModal(true); return; }

    playSpin();
    setSpinning(true);
    setSpinResult(null);
    setShowWinConfetti(false);

    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post('/api/roulette/spin', { bets: placedBets }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Calculate exact SVG wedge angle
      const pocketIdx = EUROPEAN_NUMBERS.indexOf(data.pocket);
      const sliceAngle = 360 / 37;
      const targetAngle = 360 - pocketIdx * sliceAngle;

      // Spin 5 full turns + alignment offset
      const newWheelRot = wheelRotation + 360 * 5 + targetAngle;
      setWheelRotation(newWheelRot);

      // Snap & show result after 3.2 seconds of spinning
      setTimeout(() => {
        setSpinning(false);
        setSpinResult(data);
        updateBalance(data.balanceAfter);
        setHistory((prev) => [data.pocket, ...prev.slice(0, 9)]);

        if (data.totalPayout > 0) {
          playWin();
          setShowWinConfetti(true);
          toast.success(`🎉 Winning Pocket ${data.pocket} (${data.color})! Won +${data.totalPayout.toLocaleString()} Credits`, { duration: 3500 });
        } else {
          playLose();
        }

        // Auto-reset table chips for the next round after 3 seconds
        setTimeout(() => {
          setPlacedBets([]);
          setBetHistoryStack([]);
          setSpinResult(null);
          setShowWinConfetti(false);
        }, 3000);
      }, 3200);
    } catch (err) {
      setSpinning(false);
      toast.error(err.response?.data?.message || 'Spin failed. Try again.');
    }
  };

  const getNumberColor = (num) => {
    if (num === 0) return 'bg-emerald-600 border-emerald-400 text-white';
    return RED_NUMBERS.includes(num)
      ? 'bg-red-600 border-red-400 text-white'
      : 'bg-slate-900 border-slate-700 text-white';
  };

  // Stats: Hot/Cold & Red/Black percentages
  const redHits = history.filter((n) => RED_NUMBERS.includes(n)).length;
  const blackHits = history.filter((n) => BLACK_NUMBERS.includes(n)).length;
  const totalHits = history.length || 1;
  const redPct = Math.round((redHits / totalHits) * 100);
  const blackPct = 100 - redPct;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-casino-dark to-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/3 w-[600px] h-[350px] bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />
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
              Roulette Payouts
            </button>
          </div>
        </div>

        {/* Main Arena: SVG Wheel & Felt Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: 3D SVG European Roulette Wheel */}
          <div className="lg:col-span-5 card p-6 border-2 border-amber-500/30 bg-slate-950/90 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[420px]">
            <ConfettiCanvas active={showWinConfetti} />

            {/* Title Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎡</span>
              <div>
                <h2 className="font-display font-black text-lg text-white tracking-wide">EUROPEAN ROULETTE</h2>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold block">37-Pocket Single Zero</span>
              </div>
            </div>

            {/* Realistic Wheel Component */}
            <div className="my-auto py-2">
              <SVGWheel rotation={wheelRotation} landedPocket={spinResult?.pocket} spinning={spinning} />
            </div>

            {/* Win Display Banner */}
            <div className="h-14 flex items-center justify-center w-full">
              {spinResult && !spinning ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-full py-2 px-3 rounded-2xl border flex items-center justify-between ${
                    spinResult.totalPayout > 0
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white ${getNumberColor(spinResult.pocket)}`}>
                      {spinResult.pocket}
                    </span>
                    <span className="text-xs font-bold uppercase">{spinResult.color}</span>
                  </div>

                  <span className="font-display font-black text-base text-white">
                    {spinResult.totalPayout > 0 ? `+${spinResult.totalPayout.toLocaleString()} Credits` : 'No Match'}
                  </span>
                </motion.div>
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  {spinning ? 'Wheel is spinning… Good luck!' : 'Place chips on felt table & spin!'}
                </div>
              )}
            </div>

            {/* History & Statistics Bar */}
            <div className="w-full pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span className="text-red-400">RED {redPct}%</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Recent Rolls</span>
                <span className="text-slate-300">BLACK {blackPct}%</span>
              </div>

              <div className="flex items-center justify-center gap-1 overflow-x-auto">
                {history.map((num, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${getNumberColor(num)}`}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Casino Felt Table Grid & Chip Controls */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Table Board Card */}
            <div className="card p-4 md:p-5 border-2 border-emerald-600/40 bg-gradient-to-b from-emerald-950/60 via-slate-950 to-slate-950 backdrop-blur-xl rounded-3xl shadow-2xl space-y-4">
              
              {/* Chip Selector & Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold mr-1">Chips:</span>
                  {CHIP_VALUES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => { playClick(); setSelectedChip(c.value); }}
                      disabled={spinning}
                      className={`w-9 h-9 rounded-full border-2 font-display font-black text-xs flex items-center justify-center transition-all shadow-md ${c.bg} ${
                        selectedChip === c.value ? 'scale-115 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-950' : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleResetTable}
                    disabled={spinning || (placedBets.length === 0 && !spinResult)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 transition-all text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                  >
                    <RotateCcw size={13} />
                    New Round
                  </button>

                  <button
                    onClick={handleUndo}
                    disabled={spinning || betHistoryStack.length === 0}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1 font-bold disabled:opacity-40"
                    title="Undo Last Chip"
                  >
                    <Undo2 size={14} />
                    <span className="hidden sm:inline">Undo</span>
                  </button>

                  <button
                    onClick={handleClearBets}
                    disabled={spinning || placedBets.length === 0}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-all text-xs flex items-center gap-1 font-bold disabled:opacity-40"
                    title="Clear All Chips"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Clear</span>
                  </button>

                  <button
                    onClick={handleDoubleBets}
                    disabled={spinning || placedBets.length === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-400 transition-all text-xs font-bold disabled:opacity-40"
                  >
                    2× Wager
                  </button>
                </div>
              </div>

              {/* Felt Table Grid */}
              <div className="space-y-2">
                
                {/* Zero (0) Top Row */}
                <button
                  onClick={() => handlePlaceChip('STRAIGHT', 0, 'straight-0')}
                  disabled={spinning}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-display font-black text-sm flex items-center justify-center gap-2 relative shadow-md group"
                >
                  <span>0 (GREEN ZERO)</span>
                  {placedBets.find((b) => b.key === 'straight-0') && (
                    <span className="absolute right-3 bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-md">
                      {placedBets.find((b) => b.key === 'straight-0').amount} Credits
                    </span>
                  )}
                </button>

                {/* 1-36 Numbers Grid (12 Columns x 3 Rows layout) */}
                <div className="grid grid-cols-12 gap-1 md:gap-1.5">
                  {Array.from({ length: 36 }, (_, idx) => {
                    const num = idx + 1;
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `straight-${num}`;
                    const existingBet = placedBets.find((b) => b.key === betKey);

                    return (
                      <button
                        key={num}
                        onClick={() => handlePlaceChip('STRAIGHT', num, betKey)}
                        disabled={spinning}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center font-display font-black text-xs md:text-sm relative transition-all shadow-md ${
                          isRed
                            ? 'bg-red-600/90 border-red-500 hover:bg-red-500 text-white'
                            : 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-white'
                        } ${existingBet ? 'ring-2 ring-yellow-400 border-amber-400' : ''}`}
                      >
                        <span>{num}</span>
                        {existingBet && (
                          <span className="text-[9px] font-black text-yellow-300 drop-shadow-sm">
                            {existingBet.amount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Dozens Row (1st 12, 2nd 12, 3rd 12) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: '1st 12 (1-12)', type: 'DOZEN_1', key: 'dozen-1' },
                    { label: '2nd 12 (13-24)', type: 'DOZEN_2', key: 'dozen-2' },
                    { label: '3rd 12 (25-36)', type: 'DOZEN_3', key: 'dozen-3' },
                  ].map((d) => {
                    const existing = placedBets.find((b) => b.key === d.key);
                    return (
                      <button
                        key={d.key}
                        onClick={() => handlePlaceChip(d.type, null, d.key)}
                        disabled={spinning}
                        className={`py-2 rounded-xl border-2 text-xs font-bold text-slate-300 bg-slate-900/90 border-slate-800 hover:border-slate-700 flex items-center justify-center gap-1.5 relative shadow-md ${
                          existing ? 'border-yellow-400 text-amber-300 ring-1 ring-yellow-400' : ''
                        }`}
                      >
                        <span>{d.label}</span>
                        {existing && (
                          <span className="text-[10px] font-black text-yellow-400">({existing.amount} Credits)</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Outside Even Money Bets (1-18, Even, Red, Black, Odd, 19-36) */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  {[
                    { label: '1 to 18', type: 'LOW', key: 'out-low', bg: 'bg-slate-900 border-slate-800 text-slate-300' },
                    { label: 'EVEN', type: 'EVEN', key: 'out-even', bg: 'bg-slate-900 border-slate-800 text-slate-300' },
                    { label: 'RED', type: 'RED', key: 'out-red', bg: 'bg-red-600/30 border-red-500/50 text-red-300 font-black' },
                    { label: 'BLACK', type: 'BLACK', key: 'out-black', bg: 'bg-slate-900 border-slate-700 text-slate-200 font-black' },
                    { label: 'ODD', type: 'ODD', key: 'out-odd', bg: 'bg-slate-900 border-slate-800 text-slate-300' },
                    { label: '19 to 36', type: 'HIGH', key: 'out-high', bg: 'bg-slate-900 border-slate-800 text-slate-300' },
                  ].map((ob) => {
                    const existing = placedBets.find((b) => b.key === ob.key);
                    return (
                      <button
                        key={ob.key}
                        onClick={() => handlePlaceChip(ob.type, null, ob.key)}
                        disabled={spinning}
                        className={`py-2.5 rounded-xl border-2 text-xs flex items-center justify-center gap-1 relative shadow-md ${ob.bg} ${
                          existing ? 'border-yellow-400 text-amber-300 ring-1 ring-yellow-400' : ''
                        }`}
                      >
                        <span>{ob.label}</span>
                        {existing && (
                          <span className="text-[10px] font-black text-yellow-300">({existing.amount})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Spin Button */}
              <motion.button
                onClick={handleSpin}
                disabled={spinning || placedBets.length === 0 || totalWager > balance}
                whileHover={placedBets.length > 0 ? { scale: 1.01 } : {}}
                whileTap={placedBets.length > 0 ? { scale: 0.97 } : {}}
                className={`w-full py-4 rounded-2xl font-display font-black text-xl tracking-wider uppercase flex items-center justify-center gap-3 transition-all ${
                  placedBets.length > 0 && !spinning
                    ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/30 border border-amber-400/40'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/40'
                }`}
              >
                {spinning ? (
                  <>
                    <motion.div
                      className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Spinning Wheel…</span>
                  </>
                ) : (
                  <>
                    <Play size={22} className="fill-slate-950" />
                    <span>SPIN ROULETTE — {totalWager.toLocaleString()} Credits</span>
                  </>
                )}
              </motion.button>
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
                  <Disc size={22} className="text-amber-400" />
                  <h2 className="font-display font-black text-lg text-white">European Roulette Rules</h2>
                </div>
                <button onClick={() => setShowPaytable(false)} className="text-slate-500 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span>Straight Up (Single Number 0-36)</span>
                  <span className="font-black text-yellow-400">36× (35:1)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span>Dozens (1st 12, 2nd 12, 3rd 12)</span>
                  <span className="font-black text-yellow-400">3× (2:1)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span>Even Money (Red/Black, Even/Odd, Low/High)</span>
                  <span className="font-black text-yellow-400">2× (1:1)</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck size={11} className="text-slate-500" /> European Single-Zero Rules (97.3% Return to Player).
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
