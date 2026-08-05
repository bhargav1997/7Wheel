import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';

// ─────────────────────────────────────────────
// Wheel segment data (1-12)
// ─────────────────────────────────────────────
const SEGMENTS = Array.from({ length: 12 }, (_, i) => i + 1);
const SEGMENT_ANGLE = 360 / 12; // 30° per segment

const segmentColor = (num) => {
  if (num < 7)  return { fill: '#1d4ed8', stroke: '#3b82f6', glow: '#3b82f6' };   // blue  → under 7
  if (num === 7) return { fill: '#065f46', stroke: '#10b981', glow: '#10b981' };  // green → exact 7
  return         { fill: '#991b1b', stroke: '#ef4444', glow: '#ef4444' };          // red   → over 7
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
// Robot SVG — animated when spinning
// ─────────────────────────────────────────────
const RobotFace = ({ spinning }) => (
  <motion.g
    animate={spinning ? { rotate: [0, 5, -5, 5, -5, 0] } : {}}
    transition={{ duration: 0.6, repeat: spinning ? Infinity : 0 }}
    style={{ transformOrigin: '200px 200px' }}
  >
    {/* Head outline */}
    <rect x="168" y="172" width="64" height="56" rx="10" fill="#1f1f30" stroke="#c44ff0" strokeWidth="2" />
    {/* Eyes */}
    <motion.circle
      cx="188" cy="193"
      r="8"
      fill={spinning ? '#c44ff0' : '#3b82f6'}
      animate={spinning ? { r: [8, 10, 8] } : {}}
      transition={{ duration: 0.5, repeat: Infinity }}
    />
    <motion.circle
      cx="212" cy="193"
      r="8"
      fill={spinning ? '#c44ff0' : '#3b82f6'}
      animate={spinning ? { r: [8, 10, 8] } : {}}
      transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
    />
    {/* Mouth */}
    <rect x="182" y="210" width="36" height="8" rx="4"
          fill={spinning ? '#c44ff0' : '#10b981'} />
    {/* Antenna */}
    <line x1="200" y1="172" x2="200" y2="158" stroke="#c44ff0" strokeWidth="2" />
    <motion.circle
      cx="200" cy="154"
      r="5"
      fill="#c44ff0"
      animate={spinning ? { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 0.4, repeat: Infinity }}
    />
    {/* Ears */}
    <rect x="158" y="185" width="10" height="20" rx="3" fill="#1f1f30" stroke="#c44ff0" strokeWidth="1.5" />
    <rect x="232" y="185" width="10" height="20" rx="3" fill="#1f1f30" stroke="#c44ff0" strokeWidth="1.5" />
  </motion.g>
);

// ─────────────────────────────────────────────
// Main Wheel Component
// ─────────────────────────────────────────────
const Wheel = () => {
  const { gameState } = useSocket();
  const { status, result, winningCategory } = gameState;

  const [rotation, setRotation] = useState(0);
  const [spinTransition, setSpinTransition] = useState({ duration: 0 });

  const isSpinning = status === 'SPINNING';
  const hasResult  = status === 'RESULT' && result !== null;
  const cx = 200, cy = 200, r = 160;

  useEffect(() => {
    if (status === 'SPINNING') {
      // Fast continuous spin over 4 seconds
      setSpinTransition({ duration: 4, ease: 'easeIn' });
      setRotation((prev) => prev + 360 * 4);
    } else if (status === 'RESULT' && result !== null) {
      // Calculate landing angle for segment
      const landingAngle = 180 - ((result - 1) * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
      // Decelerate smoothly and land on target number
      setSpinTransition({ duration: 4, ease: [0.16, 1, 0.3, 1] });
      setRotation((prev) => {
        const currentSpins = Math.floor(prev / 360);
        return (currentSpins + 2) * 360 + landingAngle;
      });
    }
  }, [status, result]);

  const categoryLabel = {
    UNDER_7: 'UNDER 7',
    EXACT_7: 'EXACT 7',
    OVER_7: 'OVER 7',
  };

  const categoryColor = {
    UNDER_7: 'text-blue-400',
    EXACT_7: 'text-emerald-400',
    OVER_7: 'text-red-400',
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel container */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className={`absolute inset-0 rounded-full transition-all duration-700
          ${isSpinning ? 'shadow-[0_0_60px_rgba(196,79,240,0.7)]' : 'shadow-[0_0_30px_rgba(196,79,240,0.3)]'}`}
        />

        <svg
          width="400"
          height="400"
          viewBox="0 0 400 400"
          className="max-w-full drop-shadow-2xl"
          role="img"
          aria-label="7 Wheel spinning wheel"
        >
          <defs>
            {SEGMENTS.map((num) => {
              const { glow } = segmentColor(num);
              return (
                <filter key={`glow-${num}`} id={`glow-seg-${num}`}>
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor={glow} floodOpacity="0.8" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              );
            })}
          </defs>

          {/* Outer decorative ring */}
          <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="#1f1f30" strokeWidth="20" />
          <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="#c44ff0" strokeWidth="1.5" opacity="0.5" />

          {/* Spinning wheel group */}
          <motion.g
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            animate={{ rotate: rotation }}
            transition={spinTransition}
          >
            {/* Segments */}
            {SEGMENTS.map((num, i) => {
              const { fill, stroke } = segmentColor(num);
              const isWinning = hasResult && num === result;
              return (
                <g key={num} className="wheel-segment">
                  <path
                    d={segmentPath(i, cx, cy, r)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="1.5"
                    filter={isWinning ? `url(#glow-seg-${num})` : undefined}
                    opacity={hasResult && !isWinning ? 0.5 : 1}
                  />
                  {/* Number label */}
                  {(() => {
                    const labelAngle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                    const labelR = r * 0.72;
                    const lp = polarToCartesian(cx, cy, labelR, labelAngle);
                    const rot = labelAngle - 90;
                    return (
                      <text
                        x={lp.x}
                        y={lp.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={isWinning ? 18 : 14}
                        fontWeight="700"
                        fontFamily="Outfit, sans-serif"
                        transform={`rotate(${rot}, ${lp.x}, ${lp.y})`}
                        opacity={hasResult && !isWinning ? 0.4 : 1}
                      >
                        {num}
                      </text>
                    );
                  })()}
                </g>
              );
            })}

            {/* Center hub */}
            <circle cx={cx} cy={cy} r={45} fill="#09090f" stroke="#c44ff0" strokeWidth="2" />
          </motion.g>

          {/* Robot face (always on top, doesn't spin) */}
          <RobotFace spinning={isSpinning} />

          {/* Pointer / needle at top */}
          <polygon
            points={`${cx},${cy - r - 8} ${cx - 10},${cy - r - 28} ${cx + 10},${cy - r - 28}`}
            fill="#f59e0b"
            className="drop-shadow-md"
          />

          {/* Tick marks on outer ring */}
          {SEGMENTS.map((_, i) => {
            const angle = i * SEGMENT_ANGLE;
            const inner = polarToCartesian(cx, cy, r + 2, angle);
            const outer = polarToCartesian(cx, cy, r + 12, angle);
            return (
              <line
                key={i}
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="#c44ff0"
                strokeWidth="1"
                opacity="0.6"
              />
            );
          })}
        </svg>
      </div>

      {/* Result display */}
      {hasResult && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <div className="text-6xl font-display font-black text-white mb-2">
            {result}
          </div>
          <div className={`text-xl font-bold font-display ${categoryColor[winningCategory]}`}>
            {categoryLabel[winningCategory]}
          </div>
        </motion.div>
      )}

      {/* Spinning indicator */}
      {isSpinning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-brand-400 font-semibold"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-brand-400"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          Spinning the wheel…
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600" /><span className="text-slate-400">Under 7</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-600" /><span className="text-slate-400">Exact 7</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-700" /><span className="text-slate-400">Over 7</span></div>
      </div>
    </div>
  );
};

export default Wheel;
