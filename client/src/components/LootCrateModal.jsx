import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, X, Gift, Award, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LootCrateModal({ isOpen, onClose }) {
  const { updateBalance } = useAuth();
  const [status, setStatus] = useState({ canClaim: false, nextClaimIn: 0, streak: 0, pity: 0 });
  const [loading, setLoading] = useState(false);
  const [crateStage, setCrateStage] = useState('READY'); // READY, OPENING, REVEALED
  const [claimResult, setClaimResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setCrateStage('READY');
      setClaimResult(null);
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('7wheel_token');
      const res = await axios.get('/api/loot-crates/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch loot crate status:', err);
    }
  };

  const handleClaim = async () => {
    if (!status.canClaim || loading) return;
    setLoading(true);
    setCrateStage('OPENING');

    try {
      const token = localStorage.getItem('7wheel_token');
      const res = await axios.post('/api/loot-crates/claim', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTimeout(() => {
        setClaimResult(res.data);
        setCrateStage('REVEALED');
        updateBalance(res.data.newBalance);
        toast.success(`🎁 Opened Daily Loot Crate! +${res.data.creditsAwarded} 🪙`, { duration: 4000 });
        setLoading(false);
      }, 1800);
    } catch (err) {
      setLoading(false);
      setCrateStage('READY');
      toast.error(err.response?.data?.message || 'Failed to claim loot crate');
    }
  };

  const rarityColors = {
    Common: 'from-slate-600 to-slate-800 text-slate-300 border-slate-500',
    Rare: 'from-blue-600 to-cyan-600 text-cyan-300 border-cyan-400',
    Epic: 'from-purple-600 to-pink-600 text-purple-300 border-purple-400',
    Legendary: 'from-amber-500 to-yellow-500 text-amber-200 border-amber-300',
  };

  const formatCountdown = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Portal renders outside <header> so no stacking context traps it
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card max-w-md w-full p-6 text-center relative border border-casino-border bg-casino-card shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="text-brand-400 animate-bounce" size={24} />
              <h2 className="font-display font-extrabold text-xl text-white">Daily Mystery Loot Crate</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Open your free daily mystery box to claim virtual credits, XP boosts, and rare avatar frames!
            </p>

            {/* READY stage */}
            {crateStage === 'READY' && (
              <div className="py-6 space-y-6">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: [0, -3, 3, 0] }}
                  className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center shadow-xl shadow-brand-500/20 border-2 border-brand-400/40 relative cursor-pointer"
                  onClick={status.canClaim ? handleClaim : undefined}
                >
                  <Package size={56} className="text-white drop-shadow-md" />
                  <Sparkles size={24} className="text-yellow-300 absolute -top-2 -right-2 animate-spin" />
                </motion.div>

                {status.canClaim ? (
                  <button
                    onClick={handleClaim}
                    disabled={loading}
                    className="btn-primary w-full py-3 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
                  >
                    Unlock Free Crate Now
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Clock size={16} className="text-brand-400" />
                    <span>Next Crate Available in: <strong className="text-white">{formatCountdown(status.nextClaimIn)}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* OPENING stage */}
            {crateStage === 'OPENING' && (
              <div className="py-10 space-y-4">
                <motion.div
                  animate={{ rotate: [-6, 6, -6, 6, 0], scale: [1, 1.1, 1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/40 border-2 border-yellow-300"
                >
                  <Package size={56} className="text-white" />
                </motion.div>
                <p className="text-sm font-bold text-amber-300 animate-pulse">Unlocking Crate Magic…</p>
              </div>
            )}

            {/* REVEALED stage */}
            {crateStage === 'REVEALED' && claimResult && (
              <div className="py-4 space-y-4">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r border ${rarityColors[claimResult.rarity]}`}>
                  ✨ {claimResult.rarity} Drop! ✨
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {claimResult.items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.2 }}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center space-y-1"
                    >
                      <Award size={20} className="text-yellow-400" />
                      <p className="text-[11px] font-bold text-white leading-tight">{item.name}</p>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={onClose}
                  className="btn-primary w-full py-2.5 mt-4 text-sm font-bold"
                >
                  Collect Rewards
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-casino-border flex items-center justify-between text-[11px] text-slate-400">
              <span>🔥 Daily Crate Streak: <strong className="text-amber-400">{status.streak} Days</strong></span>
              <span>🛡️ Legendary Pity: <strong className="text-purple-400">{status.pity}/10</strong></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
