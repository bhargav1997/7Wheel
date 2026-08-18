import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, X, Loader2, Trophy, Coins, Gift, Zap } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function HistoryRow({ item }) {
  const isWin = item.type === 'BET_WON' || item.type === 'BONUS_CREDITS' || item.type === 'REWARD';

  const getTypeStyle = (type) => {
    switch (type) {
      case 'BET_WON':
        return { label: 'WIN', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <Trophy size={14} className="text-emerald-400" /> };
      case 'BET_PLACED':
        return { label: 'WAGER', color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700/40', icon: <Coins size={14} className="text-amber-400" /> };
      case 'REWARD':
      case 'BONUS_CREDITS':
        return { label: 'BONUS', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', icon: <Gift size={14} className="text-purple-400" /> };
      default:
        return { label: type, color: 'text-slate-300', bg: 'bg-slate-800/40 border-slate-700/30', icon: <Zap size={14} /> };
    }
  };

  const style = getTypeStyle(item.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between p-3 rounded-2xl border ${style.bg} transition-colors`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          {style.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate leading-none">
            {item.description || style.label}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 leading-none">
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className={`font-mono font-black text-xs ${isWin ? 'text-emerald-400' : 'text-slate-400'}`}>
          {isWin ? '+' : '-'}{item.amount.toLocaleString()} Credits
        </span>
        <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">
          Bal: {item.balanceAfter.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

export default function RoundHistory({ open, onClose }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('7wheel_token');
      const { data: res } = await axios.get(`/api/bets/history?page=${p}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res);
      setPage(p);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHistory(1);
  }, [open, fetchHistory]);

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
          <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

          <motion.div
            className="relative card w-full max-w-md p-6 shadow-2xl z-10 flex flex-col border border-slate-800 bg-slate-950 rounded-3xl max-h-[85vh] overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg text-white leading-none">Game & Round History</h2>
                  <p className="text-[11px] text-slate-400 mt-1 leading-none">All wagers, wins & rewards</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-brand-400" />
                  <span className="text-xs">Loading transaction history…</span>
                </div>
              ) : data?.history && data.history.length > 0 ? (
                data.history.map((item) => <HistoryRow key={item._id} item={item} />)
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                  <History size={32} className="mb-2 text-slate-600" />
                  No round history found yet. Play a game to record wagers!
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800 shrink-0 text-xs">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => fetchHistory(page - 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 flex items-center gap-1 font-bold"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <span className="font-mono text-slate-400 text-[11px]">
                  Page {page} of {data.totalPages}
                </span>

                <button
                  disabled={page >= data.totalPages || loading}
                  onClick={() => fetchHistory(page + 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 flex items-center gap-1 font-bold"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
