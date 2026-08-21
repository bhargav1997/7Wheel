import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, HelpCircle, X, Zap, Volume2, VolumeX, Rocket, Flame, Users, Trophy, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
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

// ── Live Animated Rocket Flight Graph ──────────────────────────────────────────
function RocketGraph({ status, multiplier, crashPoint }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ status, multiplier });
  stateRef.current = { status, multiplier };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Starfield particles
    const stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * (canvas.width || 600),
      y: Math.random() * (canvas.height || 350),
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.4 + 0.1,
    }));

    // Smoke / Flame particles from the rocket engine
    const engineParticles = [];
    // Explosion particles for crash
    let explosionParticles = [];
    let prevStatus = 'COUNTDOWN';
    let tick = 0;

    const render = () => {
      tick++;
      const { status: curStatus, multiplier: curMult } = stateRef.current;
      const width = canvas.width || 600;
      const height = canvas.height || 350;

      ctx.clearRect(0, 0, width, height);

      // ── Starfield ──
      stars.forEach((star) => {
        if (curStatus === 'FLYING') {
          star.x -= star.speed * 1.5;
          star.y += star.speed * 0.8;
          if (star.x < 0) star.x = width;
          if (star.y > height) star.y = 0;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * (0.6 + Math.sin(tick * 0.05 + star.size) * 0.3)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Grid Lines ──
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const startX = 50;
      const startY = height - 50;

      // ── Trajectory Curve Calculations ──
      const progress = Math.min(1.0, (curMult - 1.0) / 10.0); // scales 1.0x to 11.0x across width
      const endX = startX + progress * (width - 120);
      const endY = startY - Math.pow(progress, 0.72) * (height - 110);
      const controlX = startX + (endX - startX) * 0.45;
      const controlY = startY;

      // Calculate tangent angle of the rocket (derivative at t=1)
      const dx = (endX - controlX);
      const dy = (endY - controlY);
      const rocketAngle = Math.atan2(dy, dx);

      if (curStatus === 'FLYING' || curStatus === 'CRASHED') {
        // Gradient fill under trajectory curve
        const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
        fillGradient.addColorStop(0, curStatus === 'CRASHED' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(168, 85, 247, 0.22)');
        fillGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fillStyle = fillGradient;
        ctx.fill();

        // Curved neon rocket trail line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.strokeStyle = curStatus === 'CRASHED' ? '#ef4444' : '#c084fc';
        ctx.lineWidth = 4;
        ctx.shadowColor = curStatus === 'CRASHED' ? '#ef4444' : '#a855f7';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // ── Spawn Engine Exhaust Particles (While Flying) ──
        if (curStatus === 'FLYING' && tick % 2 === 0) {
          const rearDist = 20;
          const engineX = endX - Math.cos(rocketAngle) * rearDist;
          const engineY = endY - Math.sin(rocketAngle) * rearDist;

          for (let p = 0; p < 3; p++) {
            const spread = (Math.random() - 0.5) * 0.8;
            const pSpeed = Math.random() * 3 + 2;
            const pAngle = rocketAngle + Math.PI + spread;
            engineParticles.push({
              x: engineX,
              y: engineY,
              vx: Math.cos(pAngle) * pSpeed,
              vy: Math.sin(pAngle) * pSpeed,
              size: Math.random() * 5 + 3,
              alpha: 1.0,
              color: p === 0 ? '#fbbf24' : p === 1 ? '#f97316' : '#ec4899',
            });
          }
        }
      }

      // ── Render and Update Engine Exhaust Particles ──
      for (let i = engineParticles.length - 1; i >= 0; i--) {
        const ep = engineParticles[i];
        ep.x += ep.vx;
        ep.y += ep.vy;
        ep.alpha -= 0.04;
        ep.size *= 0.94;

        if (ep.alpha <= 0 || ep.size <= 0.5) {
          engineParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, ep.alpha);
        ctx.fillStyle = ep.color;
        ctx.shadowColor = ep.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Handle Crash Explosion ──
      if (curStatus === 'CRASHED' && prevStatus !== 'CRASHED') {
        // Just crashed! Trigger explosion burst
        explosionParticles = Array.from({ length: 40 }, () => {
          const expAngle = Math.random() * Math.PI * 2;
          const expSpeed = Math.random() * 7 + 2;
          return {
            x: endX,
            y: endY,
            vx: Math.cos(expAngle) * expSpeed,
            vy: Math.sin(expAngle) * expSpeed,
            size: Math.random() * 7 + 3,
            alpha: 1.0,
            color: ['#ef4444', '#f97316', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 4)],
            rot: Math.random() * 360,
          };
        });
      }
      prevStatus = curStatus;

      // Render explosion particles
      if (curStatus === 'CRASHED' && explosionParticles.length > 0) {
        for (let i = explosionParticles.length - 1; i >= 0; i--) {
          const exp = explosionParticles[i];
          exp.x += exp.vx;
          exp.y += exp.vy;
          exp.vx *= 0.95;
          exp.vy *= 0.95;
          exp.alpha -= 0.025;

          if (exp.alpha <= 0) {
            explosionParticles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, exp.alpha);
          ctx.fillStyle = exp.color;
          ctx.shadowColor = exp.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, exp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ── Draw the Rocket Ship or Launchpad ──
      if (curStatus === 'COUNTDOWN') {
        // Sitting on Launch Pad at start
        drawLaunchPad(ctx, startX, startY);
        drawRocketShip(ctx, startX + 10, startY - 14, -Math.PI / 4, false, tick);
      } else if (curStatus === 'FLYING') {
        // Flying along the curve with animated flame thruster
        drawRocketShip(ctx, endX, endY, rocketAngle, false, tick);
      } else if (curStatus === 'CRASHED') {
        // Crashed explosion site
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(endX, endY, 14 + Math.sin(tick * 0.2) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl z-0"
    />
  );
}

// ── Helper: Draw Sleek Tech Launchpad Platform ────────────────────────────────
function drawLaunchPad(ctx, x, y) {
  ctx.save();
  // Pad base
  ctx.fillStyle = '#334155';
  ctx.fillRect(x - 25, y - 4, 50, 8);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x - 20, y - 8, 40, 4);

  // Status lights on pad
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x - 14, y - 2, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 14, y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Helper: Draw Aerodynamic Rocket Ship with Jet Flames ──────────────────────
function drawRocketShip(ctx, x, y, angle, isCrashed, tick) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Thruster Jet Flame (Animated fire cone behind rocket)
  if (!isCrashed) {
    const flicker = Math.sin(tick * 0.6) * 5 + (Math.random() - 0.5) * 4;
    const flameLength = 26 + flicker;

    // Outer Orange/Red Flame
    const flameGrad = ctx.createLinearGradient(-12, 0, -12 - flameLength, 0);
    flameGrad.addColorStop(0, '#fbbf24');
    flameGrad.addColorStop(0.4, '#f97316');
    flameGrad.addColorStop(0.8, '#ef4444');
    flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

    ctx.save();
    ctx.fillStyle = flameGrad;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(-14 - flameLength * 0.6, 0, -12 - flameLength, 0);
    ctx.quadraticCurveTo(-14 - flameLength * 0.6, 0, -10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Inner Hot White/Yellow Core Flame
    const coreGrad = ctx.createLinearGradient(-10, 0, -10 - flameLength * 0.6, 0);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, '#fde047');
    coreGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.quadraticCurveTo(-12 - flameLength * 0.4, 0, -10 - flameLength * 0.65, 0);
    ctx.quadraticCurveTo(-12 - flameLength * 0.4, 0, -10, 3);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Stabilizer Tail Fins / Wings
  ctx.fillStyle = '#6366f1';
  // Top Fin
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-17, -15);
  ctx.lineTo(-4, -5);
  ctx.closePath();
  ctx.fill();

  // Bottom Fin
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-17, 15);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();

  // Center Ridge Fin
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-12, 2);
  ctx.closePath();
  ctx.fill();

  // 3. Main Rocket Fuselage Body
  const bodyGrad = ctx.createLinearGradient(0, -8, 0, 8);
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(0.5, '#f1f5f9');
  bodyGrad.addColorStop(1, '#94a3b8');

  ctx.save();
  ctx.fillStyle = bodyGrad;
  ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(20, 0); // nose tip
  ctx.quadraticCurveTo(10, -9, -12, -7);
  ctx.lineTo(-13, 7);
  ctx.quadraticCurveTo(10, 9, 20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Vibrant Purple Nose Cone
  ctx.fillStyle = '#a855f7';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.quadraticCurveTo(14, -5.5, 8, -6.5);
  ctx.lineTo(8, 6.5);
  ctx.quadraticCurveTo(14, 5.5, 20, 0);
  ctx.closePath();
  ctx.fill();

  // 5. Cockpit Glass Window (Cyan glow)
  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Window glare reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(3, -1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. Engine Exhaust Metal Nozzle
  ctx.fillStyle = '#334155';
  ctx.fillRect(-14, -5, 3, 10);

  ctx.restore();
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

      // Reconcile user bet state from room broadcast
      if (user && data.bets) {
        const myServerBet = data.bets.find((b) => b.username === user.username);
        if (myServerBet && myServerBet.cashedOut && !cashedOutMsg) {
          setCashedOutMsg({ multiplier: myServerBet.cashoutMult, payout: myServerBet.payout });
          setShowWinConfetti(true);
        }
      }

      if (data.status === 'COUNTDOWN' && data.timeLeft === 5) {
        setMyBet(null);
        setCashedOutMsg(null);
        setShowWinConfetti(false);
      }
    });

    socket.on('crash:betConfirmed', (bet) => {
      setMyBet(bet);
      playClick();
      toast.success(`Rocket bet locked in: ${bet.amount} Credits`);
    });

    socket.on('crash:cashoutConfirmed', ({ multiplier, payout, isAuto }) => {
      playWin();
      setShowWinConfetti(true);
      setCashedOutMsg({ multiplier, payout });
      toast.success(
        `${isAuto ? '⚡ Auto ' : ''}Cashed Out at ${multiplier}×! (+${payout.toLocaleString()} Credits)`,
        { duration: 3500 }
      );
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
  }, [socket, user, updateBalance, playWin, playLose, playClick, cashedOutMsg]);

  const handlePlaceBet = () => {
    if (gameState.status !== 'COUNTDOWN' || myBet) return;
    const amount = parseInt(betAmount, 10);
    if (isNaN(amount) || amount < 1) { toast.error('Minimum bet is 1 credit'); return; }
    if (amount > balance) { toast.error('Insufficient balance'); return; }

    const parsedAuto = parseFloat(autoCashout);
    const validAuto = !isNaN(parsedAuto) && parsedAuto >= 1.01 ? parsedAuto : null;

    const token = localStorage.getItem('7wheel_token');
    socket.emit('crash:bet', { amount, autoCashout: validAuto, token });
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-6 relative z-10">

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
                  <TrendingUp size={18} className="text-emerald-400" />
                  Crash Multiplier Mechanics & Rules
                </span>
                <button onClick={() => setShowRules(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <p>Place your wager during the 5-second countdown. Once launched, the rocket's multiplier climbs exponentially ($1.00\times \to 100\times+$).</p>
              <p>Click <strong>CASH OUT</strong> before the rocket explodes to win your current multiplier. If it crashes first, your wager is lost!</p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span><ShieldCheck size={12} className="inline mr-1 text-slate-400" /><strong>Provably Fair RTP:</strong> 97% Return to Player (3% house edge).</span>
                <span><Zap size={12} className="inline mr-1 text-amber-400" />Set <strong>Auto Cashout</strong> to lock in payouts automatically.</span>
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
                <label className="text-xs text-slate-400 font-bold">Bet Amount (Credits)</label>
                <input
                  type="number"
                  min="1"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={!canBet}
                  className="input-field w-full text-sm font-black text-center py-2 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-white"
                />
              </div>

              {/* Auto Cashout Input & Quick Presets */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold flex items-center justify-between">
                  <span>Auto Cashout Target (×)</span>
                  {autoCashout && (
                    <span className="text-[10px] text-purple-400 font-extrabold font-mono">
                      Auto @ {parseFloat(autoCashout).toFixed(2)}×
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
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
                  {autoCashout && (
                    <button
                      onClick={() => setAutoCashout('')}
                      disabled={!canBet}
                      className="px-2 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl"
                      title="Clear Auto Cashout"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Auto Cashout Presets */}
                <div className="flex items-center gap-1 pt-1">
                  {['1.5', '2.0', '3.0', '5.0', '10.0'].map((target) => (
                    <button
                      key={target}
                      onClick={() => { playClick(); setAutoCashout(target); }}
                      disabled={!canBet}
                      className={`flex-1 py-1 rounded-md text-[10px] font-extrabold font-mono border transition-all ${
                        autoCashout === target
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                      } disabled:opacity-40`}
                    >
                      {target}×
                    </button>
                  ))}
                </div>
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
              <div className="space-y-2">
                <motion.button
                  onClick={handleCashout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-display font-black text-xl tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/30 border border-emerald-400/40 flex items-center justify-center gap-2"
                >
                  <Trophy size={22} />
                  CASH OUT NOW: {currentPayout.toLocaleString()} Credits ({gameState.multiplier.toFixed(2)}×)
                </motion.button>
                {myBet.autoCashout && (
                  <p className="text-[11px] text-purple-300 text-center font-bold">
                    ⚡ Auto Cashout Target: {myBet.autoCashout.toFixed(2)}× (Will auto cash out, or click button above to take profits early!)
                  </p>
                )}
              </div>
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
                    <span>Wager Locked ({myBet.amount} Credits)</span>
                  </>
                ) : (
                  <>
                    <Rocket size={20} />
                    <span>Place Bet — {betAmount} Credits</span>
                  </>
                )}
              </motion.button>
            )}

            {/* My Cashed Out Banner */}
            {cashedOutMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center font-bold text-xs flex items-center justify-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                Cashed Out at {cashedOutMsg.multiplier}×! (+{cashedOutMsg.payout.toLocaleString()} Credits)
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
                      {b.amount} Credits
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
