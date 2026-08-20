import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Coins, Activity, Zap, Wifi, WifiOff,
  CheckCircle, RotateCcw, XCircle, Volume2, VolumeX, Clock, Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Wheel from '../components/Wheel';
import BettingBoard from '../components/BettingBoard';
import Leaderboard from '../components/Leaderboard';
import DailyStreakModal from '../components/DailyStreakModal';
import RoundHistory from '../components/RoundHistory';
import { useSounds } from '../hooks/useSounds';
import { useGameToasts } from '../hooks/useGameToasts.jsx';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import BuyCreditsModal from '../components/BuyCreditsModal';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import axios from 'axios';

// ── HUD Status Bar ──────────────────────────────────────────────────────────
const HudStat = ({ icon: Icon, label, value, accent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(8px)',
  }}>
    <Icon size={14} style={{ color: accent, flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
      <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>{value}</span>
    </div>
  </div>
);

// ── Status badge pill ───────────────────────────────────────────────────────
const statusConfig = {
  WAITING_FOR_PLAYERS: { label: 'Waiting for Players', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
  BETTING:             { label: 'Bets Open', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  SPINNING:            { label: 'Spinning!', color: '#c44ff0', bg: 'rgba(196,79,240,0.15)', border: 'rgba(196,79,240,0.4)' },
  RESULT:              { label: 'Round Complete', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
};

const StatusPill = ({ status, timeLeft }) => {
  const cfg = statusConfig[status] ?? statusConfig.WAITING_FOR_PLAYERS;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 9999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 700, color: cfg.color,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {status === 'SPINNING' && (
        <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }}
          animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
      {cfg.label}
      {status === 'BETTING' && timeLeft > 0 && (
        <span style={{ color: timeLeft <= 10 ? '#f87171' : cfg.color, fontWeight: 800 }}>
          · {timeLeft}s
        </span>
      )}
    </div>
  );
};

// ── Result overlay ──────────────────────────────────────────────────────────
const ResultOverlay = ({ myResult, gameState }) => {
  if (!myResult) return null;
  const won = myResult.won;
  const refund = myResult.refund > 0;

  const cfg = won
    ? { icon: CheckCircle, color: '#34d399', border: 'rgba(52,211,153,0.3)', shadow: '0 0 60px rgba(52,211,153,0.3)', label: 'YOU WIN', sub: 'Congratulations on your victory!', valueLabel: `+${Math.round(myResult.payout).toLocaleString()} Credits` }
    : refund
    ? { icon: RotateCcw, color: '#60a5fa', border: 'rgba(96,165,250,0.3)', shadow: '0 0 60px rgba(96,165,250,0.2)', label: 'REFUNDED', sub: 'No winners · 90% stake returned.', valueLabel: `+${Math.round(myResult.refund).toLocaleString()} Credits` }
    : { icon: XCircle, color: '#f87171', border: 'rgba(248,113,113,0.3)', shadow: '0 0 60px rgba(248,113,113,0.2)', label: 'YOU LOSE', sub: `Wheel landed on ${gameState.result}`, valueLabel: null };

  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(9,9,15,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        borderRadius: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        style={{
          background: 'linear-gradient(135deg, #12111a 0%, #1a1825 100%)',
          border: `1px solid ${cfg.border}`,
          boxShadow: cfg.shadow,
          borderRadius: 20, padding: '36px 32px',
          maxWidth: 340, width: '100%', textAlign: 'center',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `${cfg.color}18`, border: `2px solid ${cfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Icon size={28} style={{ color: cfg.color }} />
        </div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 28, color: cfg.color, marginBottom: 6 }}>
          {cfg.label}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: cfg.valueLabel ? 20 : 0 }}>
          {cfg.sub}
        </p>
        {cfg.valueLabel && (
          <div style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 36,
            background: 'linear-gradient(90deg, #f59e0b, #fde68a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {cfg.valueLabel}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GameHub Main
// ─────────────────────────────────────────────────────────────────────────────
const GameHub = () => {
  const { gameState, connected, isKicked } = useSocket();
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const { playerCount, pot, bettorCount, roundNumber, status, winners, timeLeft } = gameState;
  const { soundEnabled, toggleSound, playWin, playLose, playSpin, playStreak } = useSounds();

  const [showStreak, setShowStreak] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [loginStreak, setLoginStreak] = useState(user?.loginStreak ?? 0);
  const prevStatusRef = useRef(null);

  // Poll streak on mount
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const { data } = await axios.get('/api/rewards/streak');
        setLoginStreak(data.currentStreak);
        const shownKey = '7wheel_streak_shown';
        if (data.canClaim && !sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, '1');
          setTimeout(() => setShowStreak(true), 1200);
        }
      } catch {}
    };
    fetchStreak();
  }, []);

  // Game toasts
  useGameToasts({ gameState, user });
  useEffect(() => {
    const prev = prevStatusRef.current;
    const cur = status;
    if (prev === cur) return;
    prevStatusRef.current = cur;
    if (cur === 'SPINNING') playSpin();
    if (cur === 'RESULT') {
      const myResult = winners?.find((w) => w.username === user?.username);
      if (myResult?.won) playWin();
      else if (myResult && !myResult.won && myResult.payout === 0) playLose();
    }
  }, [status, winners, user, playWin, playLose, playSpin]);

  const myResult = winners?.find((w) => w.username === user?.username);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
      <Navbar
        onOpenStreak={() => setShowStreak(true)}
        onOpenHistory={() => setShowHistory(true)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        loginStreak={loginStreak}
      />

      <DailyStreakModal open={showStreak} onClose={() => setShowStreak(false)} />
      <RoundHistory open={showHistory} onClose={() => setShowHistory(false)} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 pb-24 lg:pb-8 relative z-10">

        {/* ── Top HUD Bar ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap',
            gap: 8, marginBottom: 16,
            justifyContent: 'space-between',
          }}
        >
          {/* Left: stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <HudStat icon={Users}    label="Online"    value={playerCount}                          accent="#c44ff0" />
            <HudStat icon={Coins}    label="Total Pot"  value={`${Math.round(pot).toLocaleString()} CR`} accent="#f59e0b" />
            <HudStat icon={Trophy}   label="Round"      value={roundNumber > 0 ? `#${roundNumber}` : '—'} accent="#3b82f6" />
          </div>

          {/* Right: status + sound */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusPill status={status} timeLeft={timeLeft} />

            {/* Connection dot */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
              color: connected ? '#34d399' : '#f87171',
              padding: '4px 10px', borderRadius: 9999,
              background: connected ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${connected ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
            }}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : 'Offline'}
            </div>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '6px 10px', color: soundEnabled ? '#c44ff0' : '#475569',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>
        </motion.div>

        {/* ── Offline warning ──────────────────────────────────────────── */}
        <AnimatePresence>
          {!connected && !isKicked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginBottom: 12,
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: 12,
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#fbbf24', fontSize: 13,
              }}
            >
              <Activity size={14} />
              Connecting to game server… please wait.
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main 65/35 Layout ────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 16,
        }}
          className="game-layout"
        >
          {/* LEFT — Live Stage (wheel) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            style={{ position: 'relative' }}
          >
            {/* Live Stage card */}
            <div style={{
              background: 'linear-gradient(145deg, #12111a 0%, #0e0d17 100%)',
              border: '1px solid rgba(196,79,240,0.18)',
              borderRadius: 20,
              padding: '20px 16px 24px',
              boxShadow: '0 0 60px rgba(196,79,240,0.06)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 420,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              {/* Ambient glow corner */}
              <div style={{
                position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
                width: 280, height: 180,
                background: 'radial-gradient(ellipse, rgba(196,79,240,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Stage header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#c44ff0',
                    boxShadow: '0 0 8px #c44ff0',
                  }} />
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: '#e9d5ff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Live Stage
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                  <Clock size={12} />
                  Round {roundNumber > 0 ? `#${roundNumber}` : '—'}
                </div>
              </div>

              {/* Wheel */}
              <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
                <Wheel />
              </div>

              {/* Result overlay (only for this round's winner/loser) */}
              <AnimatePresence>
                {status === 'RESULT' && myResult && (
                  <ResultOverlay myResult={myResult} gameState={gameState} />
                )}
              </AnimatePresence>

              {/* Kicked overlay */}
              {isKicked && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 50,
                  background: 'rgba(9,9,15,0.93)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 24, borderRadius: 20,
                }}>
                  <motion.div
                    initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                    style={{
                      background: '#12111a', border: '1px solid rgba(196,79,240,0.3)',
                      borderRadius: 20, padding: 36, maxWidth: 360, textAlign: 'center',
                      boxShadow: '0 0 60px rgba(196,79,240,0.2)',
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #c44ff0, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px', fontSize: 24, color: '#fff', fontWeight: 900,
                    }}>!</div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 8 }}>Session Closed</h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
                      You opened the lobby from another tab or window. This session is now inactive to avoid duplicate entries.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      style={{
                        background: 'linear-gradient(135deg, #c44ff0, #7c3aed)',
                        color: '#fff', border: 'none', borderRadius: 12,
                        padding: '12px 24px', fontWeight: 700, width: '100%',
                        cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      Use This Tab Instead
                    </button>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT — Betting + Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Betting Board */}
            <div style={{
              background: 'linear-gradient(145deg, #12111a 0%, #0f0e18 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '18px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Zap size={15} style={{ color: '#fbbf24' }} />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                  Betting Board
                </span>
              </div>
              <BettingBoard onInsufficientCredits={() => setShowInsufficientModal(true)} />
            </div>

            {/* Leaderboard */}
            <div style={{
              background: 'linear-gradient(145deg, #12111a 0%, #0f0e18 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '18px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Trophy size={15} style={{ color: '#c44ff0' }} />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                  Leaderboard
                </span>
              </div>
              <Leaderboard />
            </div>
          </motion.div>
        </div>

        {/* ── Player Roster ────────────────────────────────────────────── */}
        <AnimatePresence>
          {gameState.players.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{
                marginTop: 16,
                background: 'linear-gradient(145deg, #12111a 0%, #0f0e18 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20, padding: '16px 18px',
              }}
            >
              <h3 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#f1f5f9',
                fontSize: 14, marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Users size={15} style={{ color: '#c44ff0' }} />
                Players in Lobby ({playerCount})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {gameState.players.map((p) => (
                  <div
                    key={p.username}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '6px 12px', borderRadius: 999, fontSize: 13,
                      background: p.username === user?.username ? 'rgba(196,79,240,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${p.username === user?.username ? 'rgba(196,79,240,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: p.username === user?.username ? '#d8b4fe' : '#cbd5e1',
                    }}
                  >
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: p.hasBet ? '#34d399' : '#475569',
                      boxShadow: p.hasBet ? '0 0 6px #34d399' : 'none',
                    }} />
                    {p.username}
                    {p.username === user?.username && (
                      <span style={{ fontSize: 11, color: '#a78bfa' }}>(you)</span>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#475569', marginTop: 10 }}>
                🟢 Glowing dot = bet placed · Round starts with 4+ bettors
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <InsufficientCreditsModal
        open={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        onOpenBuyCredits={() => setShowBuyModal(true)}
        onOpenDailyStreak={() => setShowStreak(true)}
      />
      <BuyCreditsModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} />
    </div>
  );
};

export default GameHub;
