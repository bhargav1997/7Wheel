import { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';

// ─────────────────────────────────────────────
// Wheel segment data (1-12)
// ─────────────────────────────────────────────
const SEGMENTS = Array.from({ length: 12 }, (_, i) => i + 1);
const SEGMENT_ANGLE = 360 / 12; // 30° per segment

const segmentColor = (num) => {
  if (num < 7)   return { fill: '#1a3a72', stroke: '#3b82f6', glow: '#3b82f6', light: '#60a5fa' };
  if (num === 7) return { fill: '#064e3b', stroke: '#10b981', glow: '#10b981', light: '#34d399' };
  return           { fill: '#7f1d1d', stroke: '#ef4444', glow: '#ef4444', light: '#f87171' };
};

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const segmentPath = (index, cx, cy, r) => {
  const startAngle = index * SEGMENT_ANGLE;
  const endAngle = startAngle + SEGMENT_ANGLE;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end   = polarToCartesian(cx, cy, r, endAngle);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y} Z`;
};

// ─────────────────────────────────────────────
// Brand Hub — glowing metallic center
// ─────────────────────────────────────────────
const BrandHub = ({ spinning }) => {
  const arcControls = useAnimation();

  useEffect(() => {
    if (spinning) {
      arcControls.start({
        rotate: [0, 360],
        transition: { duration: 1.2, repeat: Infinity, ease: 'linear' },
      });
    } else {
      arcControls.stop();
    }
  }, [spinning, arcControls]);

  return (
    <g>
      <circle cx={200} cy={200} r={54} fill="none" stroke="#c44ff0" strokeWidth="8" opacity="0.12" />
      <circle cx={200} cy={200} r={48} fill="url(#hubMetalGrad)" stroke="url(#hubRingGrad)" strokeWidth="3" />
      <circle cx={200} cy={200} r={36} fill="url(#hubInnerGrad)" />
      {spinning && (
        <motion.circle
          cx={200} cy={200} r={42}
          fill="none" stroke="#c44ff0" strokeWidth="2"
          strokeDasharray="28 100"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '200px 200px' }}
        />
      )}
      <text
        x={200} y={197}
        textAnchor="middle" dominantBaseline="middle"
        fill="#e9d5ff" fontSize="14" fontWeight="800"
        fontFamily="Outfit, sans-serif" letterSpacing="1"
      >
        7W
      </text>
      {spinning && [0, 90, 180, 270].map((deg, i) => {
        const pt = polarToCartesian(200, 200, 42, deg);
        return (
          <motion.circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#c44ff0"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────
// Physics needle (bouncing pointer at top)
// ─────────────────────────────────────────────
const Needle = ({ spinning }) => {
  const controls = useAnimation();

  useEffect(() => {
    if (spinning) {
      controls.start({
        rotate: [0, -14, 8, -10, 6, -4, 2, 0],
        transition: { duration: 0.32, repeat: Infinity, ease: 'easeInOut' },
      });
    } else {
      controls.start({
        rotate: [4, -2, 1, 0],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
    }
  }, [spinning, controls]);

  return (
    <motion.g animate={controls} style={{ transformOrigin: '200px 22px' }}>
      <polygon points="200,34 191,8 209,8" fill="#000" opacity="0.35" transform="translate(2,3)" />
      <polygon points="200,34 191,8 209,8" fill="url(#needleGrad)" />
      <circle cx={200} cy={35} r={5.5} fill="#f59e0b" />
      <circle cx={200} cy={35} r={3} fill="#fde68a" />
    </motion.g>
  );
};

// ─────────────────────────────────────────────
// Recent Spins History Pills
// ─────────────────────────────────────────────
const catPillColors = {
  UNDER_7: { bg: '#1e3a8a22', border: '#3b82f6', text: '#93c5fd' },
  EXACT_7: { bg: '#06543c22', border: '#10b981', text: '#6ee7b7' },
  OVER_7:  { bg: '#7f1d1d22', border: '#ef4444', text: '#fca5a5' },
};
const getCategory = (n) => n < 7 ? 'UNDER_7' : n === 7 ? 'EXACT_7' : 'OVER_7';

const SpinPill = ({ num, index }) => {
  const cat = getCategory(num);
  const c = catPillColors[cat];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: -16 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: 9999,
        padding: '3px 11px',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'Outfit, sans-serif',
        whiteSpace: 'nowrap',
        minWidth: 30,
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      {num}
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// Main Wheel Component
// ─────────────────────────────────────────────
const Wheel = () => {
  const { gameState } = useSocket();
  const { status, result, winningCategory } = gameState;

  const [rotation, setRotation] = useState(0);
  const [spinTransition, setSpinTransition] = useState({ duration: 0 });
  const [recentSpins, setRecentSpins] = useState([]);

  const isSpinning = status === 'SPINNING';
  const hasResult  = status === 'RESULT' && result !== null;
  const cx = 200, cy = 200, r = 160;

  useEffect(() => {
    if (status === 'SPINNING') {
      setSpinTransition({ duration: 4.5, ease: 'easeIn' });
      setRotation((prev) => prev + 360 * 5);
    } else if (status === 'RESULT' && result !== null) {
      const landingAngle = 180 - ((result - 1) * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
      setSpinTransition({ duration: 4, ease: [0.12, 1, 0.28, 1] });
      setRotation((prev) => {
        const currentSpins = Math.floor(prev / 360);
        return (currentSpins + 3) * 360 + landingAngle;
      });
      setRecentSpins((prev) => [result, ...prev].slice(0, 10));
    }
  }, [status, result]);

  const catLabel = { UNDER_7: 'UNDER 7', EXACT_7: 'EXACT 7', OVER_7: 'OVER 7' };
  const catColor  = { UNDER_7: '#60a5fa', EXACT_7: '#34d399', OVER_7: '#f87171' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>

      {/* Recent Spins History Bar */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', gap: 8, minHeight: 30 }}>
        <span style={{
          fontSize: 10, color: '#64748b', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          Last Spins:
        </span>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
          {recentSpins.length === 0 ? (
            <span style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>No spins yet this session</span>
          ) : (
            recentSpins.map((num, i) => <SpinPill key={`${num}-${i}`} num={num} index={i} />)
          )}
        </div>
      </div>

      {/* Wheel SVG */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Radial neon glow aura behind wheel */}
        <div style={{
          position: 'absolute', inset: '-16px', borderRadius: '50%',
          background: isSpinning
            ? 'radial-gradient(circle, rgba(196,79,240,0.24) 0%, transparent 72%)'
            : 'radial-gradient(circle, rgba(196,79,240,0.09) 0%, transparent 65%)',
          transition: 'background 0.9s ease',
          pointerEvents: 'none',
        }} />

        <svg
          viewBox="0 0 400 400"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          role="img"
          aria-label="7 Wheel spinning wheel"
        >
          <defs>
            {/* Per-segment glow filters */}
            {SEGMENTS.map((num) => {
              const { glow } = segmentColor(num);
              return (
                <filter key={`glow-${num}`} id={`glow-seg-${num}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feFlood floodColor={glow} floodOpacity="0.85" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              );
            })}
            {/* Hub metal gradient */}
            <radialGradient id="hubMetalGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#d8b4fe" />
              <stop offset="40%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
            <linearGradient id="hubRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="50%" stopColor="#c44ff0" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <radialGradient id="hubInnerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#150c2a" />
              <stop offset="100%" stopColor="#09090f" />
            </radialGradient>
            {/* Needle gradient */}
            <linearGradient id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            {/* Outer ring gradient */}
            <linearGradient id="outerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b1a5c" />
              <stop offset="100%" stopColor="#1e1030" />
            </linearGradient>
            {/* Win glow */}
            <filter id="winGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.85" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer decorative ring */}
          <circle cx={cx} cy={cy} r={r + 18} fill="url(#outerRingGrad)" stroke="#3b1a5c" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={r + 18} fill="none" stroke="#c44ff0" strokeWidth="1" opacity="0.5" />

          {/* Animated spinning rim dots during spin */}
          {isSpinning && [0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
            const pt = polarToCartesian(cx, cy, r + 12, deg);
            return (
              <motion.circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#c44ff0"
                animate={{ opacity: [0.1, 1, 0.1] }}
                transition={{ duration: 0.48, repeat: Infinity, delay: i * 0.04, ease: 'linear' }}
              />
            );
          })}

          {/* Spinning wheel group */}
          <motion.g
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            animate={{ rotate: rotation }}
            transition={spinTransition}
          >
            {SEGMENTS.map((num, i) => {
              const { fill, stroke } = segmentColor(num);
              const isWinning = hasResult && num === result;
              const midAngle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
              const labelR = r * 0.72;
              const lp = polarToCartesian(cx, cy, labelR, midAngle);
              // Radial outward rotation — digit top points away from center
              const textRotation = midAngle;

              return (
                <g key={num} className="wheel-segment">
                  <path
                    d={segmentPath(i, cx, cy, r)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="1.5"
                    filter={isWinning ? 'url(#winGlow)' : undefined}
                    opacity={hasResult && !isWinning ? 0.42 : 1}
                  />
                  {/* Number label — radial-outward, always upright relative to segment */}
                  <text
                    x={lp.x} y={lp.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={isWinning ? '#fff' : '#e2e8f0'}
                    fontSize={isWinning ? 20 : 15}
                    fontWeight={isWinning ? '900' : '700'}
                    fontFamily="Outfit, sans-serif"
                    transform={`rotate(${textRotation}, ${lp.x}, ${lp.y})`}
                    opacity={hasResult && !isWinning ? 0.3 : 1}
                  >
                    {num}
                  </text>
                </g>
              );
            })}

            {/* Segment divider lines */}
            {SEGMENTS.map((_, i) => {
              const angle = i * SEGMENT_ANGLE;
              const inner = polarToCartesian(cx, cy, r - 8, angle);
              const outer = polarToCartesian(cx, cy, r, angle);
              return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#000" strokeWidth="1.5" opacity="0.5" />;
            })}

            {/* Black center disc (covers hub area while spinning) */}
            <circle cx={cx} cy={cy} r={56} fill="#09090f" />
          </motion.g>

          {/* Brand hub stays on top, never spins */}
          <BrandHub spinning={isSpinning} />

          {/* Outer ring tick marks (static) */}
          {SEGMENTS.map((_, i) => {
            const angle = i * SEGMENT_ANGLE;
            const inner = polarToCartesian(cx, cy, r + 10, angle);
            const outer = polarToCartesian(cx, cy, r + 18, angle);
            return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#c44ff0" strokeWidth="1.5" opacity="0.7" />;
          })}

          {/* Physics bouncing needle */}
          <Needle spinning={isSpinning} />
        </svg>
      </div>

      {/* Result display */}
      <AnimatePresence>
        {hasResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{
              fontSize: 72, fontWeight: 900, fontFamily: 'Outfit, sans-serif',
              color: catColor[winningCategory] ?? '#fff', lineHeight: 1,
              textShadow: `0 0 30px ${catColor[winningCategory] ?? '#fff'}88`,
            }}>
              {result}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
              color: catColor[winningCategory] ?? '#fff',
              letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4,
            }}>
              {catLabel[winningCategory]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spinning indicator */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c44ff0', fontWeight: 600 }}
          >
            <motion.div
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#c44ff0' }}
              animate={{ scale: [1, 1.7, 1], opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            Spinning the wheel…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
          <span style={{ color: '#94a3b8' }}>Under 7</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ color: '#94a3b8' }}>Exact 7 · 7×</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ color: '#94a3b8' }}>Over 7</span>
        </div>
      </div>
    </div>
  );
};

export default Wheel;
