import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift, X, Clock, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const REWARDS = [
  { day: 1, credits: 25,  emoji: '🌟' },
  { day: 2, credits: 35,  emoji: '⚡' },
  { day: 3, credits: 50,  emoji: '🔥' },
  { day: 4, credits: 75,  emoji: '💎' },
  { day: 5, credits: 100, emoji: '🏆' },
  { day: 6, credits: 150, emoji: '👑' },
  { day: 7, credits: 300, emoji: '🎰', bonus: true },
];

const Countdown = ({ targetIso }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetIso) - new Date();
      if (diff <= 0) { setTimeLeft('Now!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return <span className="font-mono text-brand-400 font-bold">{timeLeft}</span>;
};

export default function DailyStreakModal({ open, onClose }) {
  const { updateBalance } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const fetchStreak = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data } = await axios.get('/api/rewards/streak');
      setStreakData(data);
    } catch {
      toast.error('Could not load streak data');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (open) { fetchStreak(); setCelebrated(false); }
  }, [open, fetchStreak]);

  const handleClaim = async () => {
    if (claiming || !streakData?.canClaim) return;
    setClaiming(true);
    try {
      const { data } = await axios.post('/api/rewards/claim-daily');
      updateBalance(data.newBalance);
      await fetchStreak();
      setCelebrated(true);
      toast.success(`🔥 Day ${data.newStreak} streak! +${data.reward.credits} credits ${data.reward.emoji}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[99999] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Centering wrapper */}
          <div className="flex min-h-full items-center justify-center p-4 relative z-10">

          {/* Modal */}
          <motion.div
            className="relative card w-full max-w-md p-6 shadow-2xl shadow-black/60 border border-brand-500/20 z-10"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                className="inline-flex w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 items-center justify-center text-3xl mb-3"
                animate={celebrated ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                <Flame size={32} className="text-orange-400" />
              </motion.div>
              <h2 className="font-display font-black text-2xl text-white">Daily Streak</h2>
              <p className="text-slate-400 text-sm mt-1">Log in every day to earn bonus credits!</p>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-8">
                <Loader2 size={32} className="animate-spin text-brand-400" />
              </div>
            ) : streakData ? (
              <>
                {/* Stats */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-display font-black text-orange-400">
                      {streakData.currentStreak}
                    </p>
                    <p className="text-xs text-slate-500">Current</p>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <p className="text-2xl font-display font-black text-gold-400">
                      {streakData.longestStreak}
                    </p>
                    <p className="text-xs text-slate-500">Best</p>
                  </div>
                </div>

                {/* 7-Day Grid */}
                <div className="grid grid-cols-7 gap-1.5 mb-6">
                  {REWARDS.map((r) => {
                    const isDone = r.day <= streakData.currentStreak;
                    const isNext = r.day === (streakData.currentStreak + 1);
                    const isToday = streakData.canClaim && isNext;
                    return (
                      <motion.div
                        key={r.day}
                        className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                          isDone
                            ? 'bg-emerald-500/20 border border-emerald-500/40'
                            : isToday
                            ? 'bg-brand-500/20 border border-brand-400/60 ring-1 ring-brand-400'
                            : 'bg-slate-800/60 border border-slate-700/40'
                        }`}
                        animate={isToday && !celebrated ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
                      >
                        <span className="text-lg leading-none">{r.emoji}</span>
                        <span className={`text-xs font-bold mt-0.5 ${isDone ? 'text-emerald-400' : isToday ? 'text-brand-400' : 'text-slate-500'}`}>
                          D{r.day}
                        </span>
                        <span className={`text-xs mt-0.5 ${isDone ? 'text-emerald-300' : isToday ? 'text-white font-bold' : 'text-slate-600'}`}>
                          +{r.credits}
                        </span>
                        {isDone && <CheckCircle size={10} className="text-emerald-500 mt-0.5" />}
                      </motion.div>
                    );
                  })}
                </div>

                {/* CTA */}
                {streakData.canClaim ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                      <p className="text-sm text-slate-400 mb-0.5">Today's reward</p>
                      <p className="text-2xl font-display font-black text-gold-400">
                        {streakData.reward.emoji} +{streakData.reward.credits} Credits
                      </p>
                      {streakData.reward.bonus && (
                        <span className="text-xs text-brand-400 font-bold">🎊 Weekly Bonus!</span>
                      )}
                    </div>
                    <motion.button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.97 }}
                    >
                      {claiming ? (
                        <><Loader2 size={16} className="animate-spin" /> Claiming…</>
                      ) : (
                        <><Gift size={16} /> Claim Reward</>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-center p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <Clock size={20} className="mx-auto text-slate-500 mb-2" />
                    <p className="text-sm text-slate-400">Already claimed today</p>
                    {streakData.nextClaimAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Next reward in <Countdown targetIso={streakData.nextClaimAt} />
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
