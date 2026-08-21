import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Crown, TrendingDown, Hash, TrendingUp,
  Users, Globe, RefreshCw, Medal, Loader2, CalendarDays
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getEquippedFrame, getEquippedTitle, TitleBadge } from '../utils/cosmetics';
import axios from 'axios';

// ── Category helpers for round results tab ────────────────────────
const categoryIcon  = { UNDER_7: TrendingDown, EXACT_7: Hash, OVER_7: TrendingUp };
const categoryLabel = { UNDER_7: 'Under 7', EXACT_7: 'Exact 7', OVER_7: 'Over 7' };
const categoryColor = { UNDER_7: 'text-blue-400', EXACT_7: 'text-emerald-400', OVER_7: 'text-red-400' };

// ── Rank medal ────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
  if (rank === 0) return <Crown size={16} className="text-yellow-400" />;
  if (rank === 1) return <Medal size={14} className="text-slate-400" />;
  if (rank === 2) return <Medal size={14} className="text-amber-600" />;
  return <span className="text-xs text-slate-500 font-mono">#{rank + 1}</span>;
};

// ── Global leaderboard entry ──────────────────────────────────────
const GlobalEntry = ({ entry, rank, isMe, myEquipped }) => {
  const frame = getEquippedFrame(entry?.equipped?.frame || (isMe ? myEquipped?.frame : 'frame_default'));
  const titleId = entry?.equipped?.title || (isMe ? myEquipped?.title : null);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
        isMe
          ? 'border-brand-500/50 bg-brand-500/10'
          : rank === 0
          ? 'border-yellow-500/30 bg-yellow-500/5'
          : 'border-casino-border bg-casino-muted/20'
      }`}
    >
      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
        <RankBadge rank={rank} />
      </div>
      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all ${
        frame.avatarClass
      }`}>
        {entry.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-semibold truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
            {entry.username} {isMe && <span className="text-xs text-brand-500 font-normal">(you)</span>}
          </p>
          <TitleBadge titleId={titleId} />
        </div>
        <p className="text-xs text-slate-500">{entry.gamesPlayed ?? 0} rounds played</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">Won</p>
        <p className="font-display font-bold text-gold-400 text-sm">
          {Math.round(entry.totalWon ?? 0).toLocaleString()} Credits
        </p>
      </div>
    </motion.div>
  );
};

const Leaderboard = () => {
  const { gameState } = useSocket();
  const { user } = useAuth();
  const { status, winners, winningCategory, result, players } = gameState;

  // 'lobby' | 'round' | 'global'
  const [activeTab, setActiveTab] = useState('lobby');
  const [globalData, setGlobalData] = useState(null);
  const [globalType, setGlobalType] = useState('alltime'); // 'alltime' | 'weekly'
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Auto-switch to round tab on result
  useEffect(() => {
    if (status === 'RESULT') setActiveTab('round');
    else if (status === 'WAITING_FOR_PLAYERS') setActiveTab('lobby');
  }, [status]);

  const fetchGlobal = useCallback(async (type = globalType) => {
    setLoadingGlobal(true);
    try {
      const { data } = await axios.get(`/api/leaderboard?type=${type}`);
      setGlobalData(data);
    } catch {
      // silently fail
    } finally {
      setLoadingGlobal(false);
    }
  }, [globalType]);

  // Fetch when switching to global tab
  useEffect(() => {
    if (activeTab === 'global') fetchGlobal(globalType);
  }, [activeTab, globalType]); // eslint-disable-line

  const lobbyRankings = [...(players || [])].sort((a, b) => (b.totalWon || 0) - (a.totalWon || 0));
  const roundResults  = [...(winners || [])].sort((a, b) => {
    if (a.won && !b.won) return -1;
    if (!a.won && b.won) return 1;
    return (b.payout || b.refund || 0) - (a.payout || a.refund || 0);
  });
  const CategoryIcon = categoryIcon[winningCategory];

  return (
    <div className="card border border-casino-border overflow-hidden">
      {/* ── Tab Header ── */}
      <div className="flex border-b border-casino-border bg-casino-dark/50">
        {[
          { key: 'lobby',  label: 'Lobby',  icon: Users  },
          { key: 'round',  label: 'Round',  icon: Trophy, disabled: !winners?.length },
          { key: 'global', label: 'Global', icon: Globe   },
        ].map(({ key, label, icon: Icon, disabled }) => (
          <button
            key={key}
            onClick={() => !disabled && setActiveTab(key)}
            disabled={disabled}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              activeTab === key
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-casino-muted/30'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 min-h-[220px]">
        <AnimatePresence mode="wait">

          {/* ── LOBBY TAB ── */}
          {activeTab === 'lobby' && (
            <motion.div key="lobby-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {lobbyRankings.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs">No connected players</p>
              ) : lobbyRankings.map((player, i) => {
                const isMe = player.username === user?.username;
                return (
                  <div key={player.username}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isMe ? 'border-brand-500/50 bg-brand-500/10' : 'border-casino-border bg-casino-muted/20'
                    }`}
                  >
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                      <RankBadge rank={i} />
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                      isMe ? 'bg-brand-gradient' : 'bg-casino-muted border border-casino-border'
                    }`}>
                      {player.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
                        {player.username} {isMe && <span className="text-xs text-brand-500">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        Balance: {(player.balance ?? 0).toLocaleString()} Credits
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Won</p>
                      <p className="text-[11px] font-bold text-amber-400">
                        {Math.round(player.totalWon ?? 0).toLocaleString()} Credits
                      </p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── ROUND RESULTS TAB ── */}
          {activeTab === 'round' && (
            <motion.div key="round-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between border-b border-casino-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Result:</span>
                  <span className="font-display font-black text-xl text-white">{result}</span>
                </div>
                {CategoryIcon && (
                  <div className={`flex items-center gap-1 text-xs font-bold ${categoryColor[winningCategory]}`}>
                    <CategoryIcon size={12} />
                    <span>{categoryLabel[winningCategory]}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {roundResults.map((player) => {
                  const isMe = player.username === user?.username;
                  const payout = player.payout || player.refund || 0;
                  const isRefund = !player.won && player.refund > 0;
                  return (
                    <div key={player.username}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                        isMe ? 'border-brand-500/50 bg-brand-500/10' : 'border-casino-border bg-casino-muted/20'
                      } ${player.won ? 'ring-1 ring-gold-500/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                        isMe ? 'bg-brand-gradient' : 'bg-casino-muted border border-casino-border'
                      }`}>
                        {player.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
                          {player.username} {isMe && <span className="text-xs text-brand-500">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                        {player.won ? <span className="flex items-center gap-1"><Trophy size={11} className="text-amber-400" /> Winner</span> : isRefund ? 'Refunded' : 'Lost'}
                        </p>
                      </div>
                      <div className="text-right">
                        {player.won ? (
                          <span className="font-display font-bold text-gold-400">+{Math.round(payout).toLocaleString()} Credits</span>
                        ) : isRefund ? (
                          <span className="font-display font-semibold text-slate-400">↩ {Math.round(payout).toLocaleString()} Credits</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!winners?.some((w) => w.won) && (
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center text-xs text-amber-400 font-semibold">
                  No winners this round! 90% refunded.
                </div>
              )}
            </motion.div>
          )}

          {/* ── GLOBAL TAB ── */}
          {activeTab === 'global' && (
            <motion.div key="global-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Sub-tabs: All-time / Weekly */}
              <div className="flex gap-2 mb-1">
                {['alltime', 'weekly'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setGlobalType(t)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      globalType === t
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t === 'alltime' ? <span className="flex items-center gap-1 justify-center"><Trophy size={11} /> All-Time</span> : <span className="flex items-center gap-1 justify-center"><CalendarDays size={11} /> This Week</span>}
                  </button>
                ))}
                <button
                  onClick={() => fetchGlobal(globalType)}
                  className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={13} className={loadingGlobal ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingGlobal ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
              ) : !globalData?.entries?.length ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <Globe size={28} className="mx-auto mb-2 opacity-30" />
                  No data yet — be the first winner!
                </div>
              ) : (
                <>
                  {globalData.entries.map((entry, i) => (
                    <GlobalEntry
                      key={entry._id ?? entry.username}
                      entry={entry}
                      rank={i}
                      isMe={entry.username === user?.username}
                      myEquipped={user?.equipped}
                    />
                  ))}
                  {globalData.userRank && globalData.userRank > 10 && (
                    <div className="pt-1 border-t border-casino-border/40 text-center text-xs text-slate-500">
                      Your rank: <span className="text-brand-400 font-bold">#{globalData.userRank}</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default Leaderboard;
