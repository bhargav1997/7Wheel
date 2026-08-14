import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import axios from 'axios';

const CHOICE_LABEL = {
  UNDER_7: { label: 'Under 7', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  EXACT_7:  { label: 'Exact 7', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
  OVER_7:   { label: 'Over 7', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
};

function HistoryRow({ item }) {
  const meta = item.bet ? CHOICE_LABEL[item.bet.choice] : null;
  const won = item.bet?.won;
  const refund = !won && item.bet?.payout > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        won ? 'border-emerald-500/25 bg-emerald-500/5'
        : refund ? 'border-blue-500/25 bg-blue-500/5'
        : 'border-slate-700/40 bg-slate-800/30'
      }`}
    >
      {/* Round # */}
      <div className="w-10 text-center flex-shrink-0">
        <p className="text-xs text-slate-500">Rd.</p>
        <p className="font-display font-bold text-sm text-slate-300">#{item.roundNumber}</p>
      </div>

      {/* Result wheel number */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0 ${
        item.result === 7 ? 'bg-purple-500/30 text-purple-300' : 'bg-slate-700/60 text-slate-300'
      }`}>
        {item.result}
      </div>

      {/* Bet choice */}
      <div className="flex-1 min-w-0">
        {meta && (
          <span className={`inline-block text-xs px-2 py-0.5 rounded-lg border font-medium ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        )}
        {item.bet && (
          <p className="text-xs text-slate-500 mt-0.5">
            Bet: <span className="text-slate-300">{item.bet.amount.toLocaleString()} 🪙</span>
          </p>
        )}
      </div>

      {/* Outcome */}
      <div className="text-right flex-shrink-0">
        {won ? (
          <>
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm justify-end">
              <TrendingUp size={12} />
              +{Math.round(item.bet.payout).toLocaleString()}
            </div>
            <p className="text-xs text-emerald-500">Win</p>
          </>
        ) : refund ? (
          <>
            <div className="flex items-center gap-1 text-blue-400 font-bold text-sm justify-end">
              <Minus size={12} />
              {Math.round(item.bet.payout).toLocaleString()}
            </div>
            <p className="text-xs text-blue-500">Refund</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 text-red-400 font-bold text-sm justify-end">
              <TrendingDown size={12} />
              -{item.bet?.amount?.toLocaleString() ?? '—'}
            </div>
            <p className="text-xs text-red-500">Loss</p>
          </>
        )}
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
      const { data: res } = await axios.get(`/api/bets/history?page=${p}&limit=10`);
      setData(res);
      setPage(p);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchHistory(1);
  }, [open, fetchHistory]);

  const totalWon = data?.history?.filter((r) => r.bet?.won).length ?? 0;
  const totalLost = data?.history?.filter((r) => r.bet && !r.bet.won && r.bet.payout === 0).length ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative card w-full max-w-md shadow-2xl z-10 flex flex-col overflow-hidden"
            style={{ maxHeight: '85vh' }}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-700/40 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                  <History size={16} className="text-brand-400" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white text-lg leading-none">Round History</h2>
                  {data && (
                    <p className="text-xs text-slate-500">{data.total} rounds played</p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Quick stats */}
            {data && data.history.length > 0 && (
              <div className="flex gap-3 p-4 border-b border-slate-700/30 flex-shrink-0">
                <div className="flex-1 text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-bold text-lg">{totalWon}</p>
                  <p className="text-xs text-slate-500">Wins</p>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-bold text-lg">{totalLost}</p>
                  <p className="text-xs text-slate-500">Losses</p>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                  <p className="text-slate-300 font-bold text-lg">
                    {totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0}%
                  </p>
                  <p className="text-xs text-slate-500">Win Rate</p>
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={28} className="animate-spin text-brand-400" />
                </div>
              ) : data?.history?.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <History size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No rounds played yet</p>
                  <p className="text-sm mt-1">Place your first bet to see history here!</p>
                </div>
              ) : (
                data?.history?.map((item) => (
                  <HistoryRow key={`${item.roundNumber}-${item.bet?.choice}`} item={item} />
                ))
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-700/40 flex-shrink-0">
                <button
                  onClick={() => fetchHistory(page - 1)}
                  disabled={page <= 1 || loading}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="text-xs text-slate-500">Page {page} / {data.totalPages}</span>
                <button
                  onClick={() => fetchHistory(page + 1)}
                  disabled={page >= data.totalPages || loading}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
