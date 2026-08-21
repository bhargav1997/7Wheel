import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Flame, Zap, Star, ShieldCheck, X, RefreshCw, Users, Award, ChevronRight, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCredits } from '../utils/format';
import { getEquippedFrame, getEquippedTitle, TitleBadge } from '../utils/cosmetics';
import axios from 'axios';

const RankBadge = ({ rank }) => {
  if (rank === 0) return <Crown size={20} className="text-yellow-400 filter drop-shadow-[0_0_10px_#f59e0b]" />;
  if (rank === 1) return <Medal size={18} className="text-slate-300 filter drop-shadow-[0_0_8px_#cbd5e1]" />;
  if (rank === 2) return <Medal size={18} className="text-amber-600 filter drop-shadow-[0_0_8px_#d97706]" />;
  return <span className="font-mono font-extrabold text-xs text-slate-500">#{rank + 1}</span>;
};

export default function TopWinnersModal({ open, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly', 'monthly', 'alltime'
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [userRank, setUserRank] = useState(null);

  const fetchLeaderboard = useCallback(async (type) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.get(`/api/leaderboard?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(data.entries || []);
      setUserRank(data.userRank || null);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchLeaderboard(activeTab);
    }
  }, [open, activeTab, fetchLeaderboard]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Ambient Background Radial */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-500/10 blur-[100px] pointer-events-none rounded-full" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                <Trophy size={22} className="fill-slate-950" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2">
                  <span>VIP Hall of Fame</span>
                  <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                    Top 10
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-medium">Climb ranks, earn achievements, and flex your gaming record!</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Filter Tabs & Refresh Button */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5 relative z-10">
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'weekly', label: 'Weekly Champions', icon: Zap },
                { id: 'monthly', label: 'Monthly All-Stars', icon: Star },
                { id: 'alltime', label: 'All-Time Legends', icon: Crown },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                      active
                        ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => fetchLeaderboard(activeTab)}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>

          {/* Your Current Rank Banner */}
          {userRank && (() => {
            const myFrame = getEquippedFrame(user?.equipped?.frame);

            return (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-brand-500/15 via-purple-500/10 to-transparent border border-brand-500/30 flex items-center justify-between text-xs relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 transition-all ${
                    myFrame.avatarClass
                  }`}>
                    #{userRank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Your Standing:</span>
                      <TitleBadge titleId={user?.equipped?.title} />
                    </div>
                    <span className="font-display font-black text-white text-sm">
                      You are ranked #{userRank} {userRank <= 10 ? <span className="text-amber-400 inline-flex items-center gap-1"><Flame size={12} className="text-orange-400" /> Top 10!</span> : '— Play to climb!'}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-amber-400">
                  {formatCredits(user?.balance)} Credits
                </div>
              </div>
            );
          })()}

          {/* Leaderboard Table / Cards */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 relative z-10 min-h-[220px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-bold">Syncing Leaderboard Ranks…</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs font-medium">
                No rankings recorded yet for this filter.
              </div>
            ) : (
              entries.map((entry, idx) => {
                const isMe = entry.username === user?.username;
                const frame = getEquippedFrame(entry?.equipped?.frame || (isMe ? user?.equipped?.frame : 'frame_default'));
                const titleId = entry?.equipped?.title || (isMe ? user?.equipped?.title : null);

                return (
                  <motion.div
                    key={entry._id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-brand-500/15 border-brand-500/50 shadow-lg shadow-brand-500/10'
                        : idx === 0
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : idx === 1
                        ? 'bg-slate-800/40 border-slate-700/60'
                        : idx === 2
                        ? 'bg-amber-900/20 border-amber-700/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Rank & Player Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <RankBadge rank={idx} />
                      </div>

                      {/* Customized Avatar with Equipped Frame */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 transition-all ${
                        frame.avatarClass
                      }`}>
                        {entry.username?.[0]?.toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-display font-bold text-sm truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
                            {entry.username}
                          </span>
                          <TitleBadge titleId={titleId} />
                          {isMe && (
                            <span className="text-[9px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                              YOU
                            </span>
                          )}
                          {idx === 0 && (
                            <span className="text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                              CHAMPION
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          {entry.gamesPlayed ?? 0} games played
                        </span>
                      </div>
                    </div>

                    {/* Right: Credits Won / Balance */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">
                        {activeTab === 'weekly' ? 'Rounds' : activeTab === 'monthly' ? 'Balance' : 'Total Won'}
                      </span>
                      <span className="font-display font-black text-sm text-amber-400">
                        {activeTab === 'weekly'
                          ? `${entry.gamesPlayed ?? 0} Played`
                          : activeTab === 'monthly'
                          ? `${formatCredits(entry.balance)} Credits`
                          : `${formatCredits(entry.totalWon)} Credits`}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Incentive Banner */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 relative z-10 flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Gift size={14} /> Top 3 Weekly Leaders receive 500 Bonus Credits every Sunday!
            </span>
            <button
              onClick={onClose}
              className="btn-primary py-1.5 px-4 text-xs font-black rounded-xl"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
