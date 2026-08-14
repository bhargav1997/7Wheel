import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Zap, Flame, Gift, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function InsufficientCreditsModal({ open, onClose, onOpenBuyCredits, onOpenDailyStreak }) {
  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark luxury backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            className="relative card w-full max-w-md p-6 border border-amber-500/30 bg-gradient-to-b from-slate-950 via-slate-900 to-purple-950/80 shadow-[0_0_50px_rgba(245,158,11,0.2)] rounded-3xl z-10 text-center space-y-5 overflow-hidden"
            initial={{ scale: 0.88, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Light */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 blur-3xl pointer-events-none rounded-full" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>

            {/* Animated Emblem */}
            <div className="pt-2">
              <motion.div
                className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-4xl mx-auto shadow-xl shadow-amber-500/20"
                animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                🪙
              </motion.div>
            </div>

            {/* Header Title & Subtitle */}
            <div className="space-y-1.5">
              <h2 className="font-display font-black text-2xl text-white tracking-tight">
                Oops! Running Low on Credits 🪙
              </h2>
              <p className="text-slate-300 text-xs max-w-xs mx-auto leading-relaxed font-medium">
                You don't have enough virtual credits for this wager. Top up your balance to keep playing!
              </p>
            </div>

            {/* Options Grid */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Buy Credit Packs */}
              <motion.button
                onClick={() => {
                  onClose();
                  onOpenBuyCredits?.();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Zap size={18} className="fill-slate-950" />
                <span>Get More Credits</span>
                <ArrowRight size={16} />
              </motion.button>

              {/* Option 2: Claim Daily Login Bonus */}
              <motion.button
                onClick={() => {
                  onClose();
                  onOpenDailyStreak?.();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Flame size={16} className="text-amber-400" />
                <span>Claim Free Daily Bonus 🔥</span>
              </motion.button>
            </div>

            {/* Compliance Footer Disclaimer */}
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Virtual Game Credits only · No real money gambling</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
