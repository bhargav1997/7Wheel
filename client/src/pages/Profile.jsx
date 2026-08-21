import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Shield, Zap, Copy, Users, TrendingUp,
  LogOut, Trash2, AlertTriangle, Lock, Eye, EyeOff,
  CheckCircle, ArrowLeft, Gift, Trophy, Crown, Medal, Award, ChevronRight, Star, Sparkles,
  HeartHandshake, Send
} from 'lucide-react';
import TopWinnersModal from '../components/TopWinnersModal';
import CosmeticsShopModal from '../components/CosmeticsShopModal';
import CreditTransferModal from '../components/CreditTransferModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatCredits } from '../utils/format';
import { getEquippedFrame, getEquippedTitle, TitleBadge } from '../utils/cosmetics';

// ─────────────────────────────────────────────────────────────────────────────
// Stat card helper
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="bg-casino-card border border-casino-border rounded-2xl p-5 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ?? 'bg-brand-500/10'}`}>
      <Icon size={18} className="text-brand-400" />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="font-display font-black text-lg text-white leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Delete Zone (expanded inline, no separate modal)
// ─────────────────────────────────────────────────────────────────────────────
const DeleteZone = ({ onDeleted }) => {
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!password || !confirmed) return;
    setError('');
    setLoading(true);
    try {
      await deleteAccount(password);
      toast.success('Account permanently deleted.');
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect password or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/3 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-500/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <Trash2 size={14} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-300">Delete Account</p>
            <p className="text-[11px] text-slate-500">Permanent — all data and credits removed</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500"
        >
          ▼
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              <div className="flex gap-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  This will <strong className="text-red-300">permanently delete</strong> your account,
                  all credits, and all transaction history. This cannot be undone.
                </p>
              </div>

              <form onSubmit={handleDelete} className="space-y-3">
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="delete-pw-input"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Confirm with your password"
                    className="input-field pl-9 pr-10 text-sm"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => setConfirmed((v) => !v)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                      confirmed ? 'bg-red-500 border-red-500' : 'border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {confirmed && <span className="text-white text-[9px] font-black">✓</span>}
                  </div>
                  <span className="text-xs text-slate-400 leading-relaxed">
                    I understand this is <strong className="text-red-400">irreversible</strong>. All credits and data will be lost.
                  </span>
                </label>

                {error && (
                  <p className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/15 rounded-lg px-3 py-2">
                    <AlertTriangle size={12} /> {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setPassword(''); setConfirmed(false); setError(''); }}
                    className="flex-1 py-2 text-sm text-slate-400 border border-casino-border rounded-xl hover:text-white hover:border-slate-500 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-delete-btn"
                    type="submit"
                    disabled={loading || !password || !confirmed}
                    className="flex-1 py-2 text-sm font-bold bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting…</>
                      : <><Trash2 size={14} /> Delete Forever</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Profile Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [showTopWinnersModal, setShowTopWinnersModal] = useState(false);
  const [showCosmeticsModal, setShowCosmeticsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const navigate = useNavigate();

  // On mount, refresh user to ensure referralCode is generated and synced from server
  useEffect(() => {
    refreshUser();
  }, []);

  const handleCopyCode = () => {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode);
    toast.success(`Code ${user.referralCode} copied to clipboard!`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleted = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-casino-dark relative z-10">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link
            to="/play"
            className="w-9 h-9 rounded-xl border border-casino-border bg-casino-card flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-500 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-black text-2xl text-white">Profile & Settings</h1>
            <p className="text-xs text-slate-500">Manage your account preferences</p>
          </div>
        </div>

        {/* ── Account info card ── */}
        {(() => {
          const equippedFrame = getEquippedFrame(user?.equipped?.frame);
          const equippedTitle = getEquippedTitle(user?.equipped?.title);

          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card p-6 space-y-4"
            >
              <div className="flex items-center gap-4">
                {/* Equipped Avatar Frame */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition-all duration-300 ${
                  equippedFrame.avatarClass
                }`}>
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-black text-xl text-white">{user?.username}</p>
                    <TitleBadge titleId={user?.equipped?.title} />
                  </div>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                  <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user?.role === 'admin'
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                      : 'bg-slate-500/10 text-slate-400 border border-slate-600/30'
                  }`}>
                    <Shield size={9} />
                    {user?.role === 'admin' ? 'Administrator' : 'Player'}
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <StatCard icon={Zap} label="Credits" value={formatCredits(user?.balance)} sub="entertainment credits only" accent="bg-yellow-500/10" />
                <StatCard icon={TrendingUp} label="Games Played" value={user?.gamesPlayed ?? 0} accent="bg-emerald-500/10" />
                <StatCard icon={Users} label="Referrals" value={user?.referralCount ?? 0} sub="+50 credits each" accent="bg-purple-500/10" />
              </div>
            </motion.div>
          );
        })()}

        {/* ── VIP Avatar & Cosmetics Shop Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="card p-6 space-y-4 border-2 border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-slate-950 to-indigo-950/30 relative overflow-hidden shadow-xl"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <Crown size={22} />
              </div>
              <div>
                <h2 className="font-display font-black text-base text-white flex items-center gap-2">
                  <span>VIP Cosmetics & Prestige Shop</span>
                  <span className="text-[9px] bg-purple-500 text-white font-black px-2 py-0.2 rounded-full uppercase tracking-wider">
                    NEW
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Spend credits on custom neon avatar frames & high-roller titles</p>
              </div>
            </div>

            <button
              onClick={() => setShowCosmeticsModal(true)}
              className="py-2.5 px-4 rounded-xl font-display font-black text-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25"
            >
              <Sparkles size={14} />
              <span>Open VIP Shop</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>

        {/* ── Social Credit Sharing & Requests Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.075 }}
          className="card p-6 space-y-4 border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-teal-950/30 relative overflow-hidden shadow-xl"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <HeartHandshake size={22} />
              </div>
              <div>
                <h2 className="font-display font-black text-base text-white flex items-center gap-2">
                  <span>Send & Request Credits</span>
                  <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-2 py-0.2 rounded-full uppercase tracking-wider">
                    SOCIAL HUB
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Share entertainment tokens with friends or request credits</p>
              </div>
            </div>

            <button
              onClick={() => setShowTransferModal(true)}
              className="py-2.5 px-4 rounded-xl font-display font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <Send size={14} />
              <span>Transfer & Request</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>

        {/* ── Top 10 Winners & Hall of Fame Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="card p-6 space-y-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-950 to-purple-900/10 relative overflow-hidden"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                <Trophy size={20} className="fill-slate-950" />
              </div>
              <div>
                <h2 className="font-display font-black text-base text-white flex items-center gap-2">
                  <span>VIP Hall of Fame</span>
                  <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.2 rounded-full uppercase tracking-wider">
                    Top 10 Rankings
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Weekly, Monthly & All-Time High Roller Leaderboards</p>
              </div>
            </div>

            <button
              onClick={() => setShowTopWinnersModal(true)}
              className="py-2.5 px-4 rounded-xl font-display font-black text-xs bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Crown size={14} className="fill-slate-950" />
              <span>View Top 10 Winners</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <Zap size={16} className="text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Weekly Champions</span>
                <span className="text-xs font-bold text-slate-200">500 Bonus Credits Prize</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <Star size={16} className="text-purple-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Monthly All-Stars</span>
                <span className="text-xs font-bold text-slate-200">Exclusive VIP Crown Badge</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <Crown size={16} className="text-yellow-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">All-Time Legends</span>
                <span className="text-xs font-bold text-slate-200">Highest Credits Earned</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Invite / Referral card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-yellow-400" />
            <h2 className="font-display font-bold text-base text-white">Invite Friends</h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Share your unique invite code. When a friend registers using your code,{' '}
            <strong className="text-white">both of you instantly receive +50 bonus credits</strong>. 🎉
          </p>

          {/* Code display + copy */}
          {user?.referralCode ? (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Your Invite Code</p>
              <button
                id="copy-code-btn"
                onClick={handleCopyCode}
                className="w-full flex items-center justify-between bg-brand-500/8 border border-brand-500/25 hover:border-brand-500/50 hover:bg-brand-500/12 rounded-xl px-5 py-4 transition-all group"
              >
                <span className="font-mono font-black text-2xl text-brand-400 tracking-[0.3em]">
                  {user.referralCode}
                </span>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-brand-400 transition-colors">
                  <Copy size={16} />
                  <span className="text-xs font-medium">Copy</span>
                </div>
              </button>
              <p className="text-[10px] text-slate-600">
                {user.referralCount > 0
                  ? `You've invited ${user.referralCount} friend${user.referralCount !== 1 ? 's' : ''} so far — earned ${user.referralCount * 50} bonus credits from referrals!`
                  : 'No referrals yet — share your code to start earning!'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
              Loading your invite code…
            </div>
          )}

          {/* How it works */}
          <div className="border-t border-casino-border/50 pt-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">How it works</p>
            <div className="space-y-1.5">
              {[
                ['1', 'Share your code with a friend'],
                ['2', 'They enter it on the Register page'],
                ['3', 'Both accounts instantly get +50 credits'],
              ].map(([n, text]) => (
                <div key={n} className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="w-5 h-5 rounded-full bg-brand-500/15 border border-brand-500/20 flex items-center justify-center text-[10px] font-bold text-brand-400 flex-shrink-0">
                    {n}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Account actions card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-6 space-y-3"
        >
          <h2 className="font-display font-bold text-base text-white">Account Actions</h2>

          {/* Logout */}
          <button
            id="profile-logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-casino-border bg-casino-muted/20 hover:border-slate-500 hover:bg-casino-muted/40 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <LogOut size={14} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Log Out</p>
              <p className="text-[11px] text-slate-500">Sign out of this session</p>
            </div>
          </button>
        </motion.div>

        {/* ── Danger zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} className="text-red-400" />
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone</p>
          </div>
          <DeleteZone onDeleted={handleDeleted} />
        </motion.div>

        {/* Legal footer */}
        <p className="text-center text-[10px] text-slate-700 pb-4">
          Credits are virtual entertainment tokens · No cash value · All purchases final
        </p>
      </div>
      {/* Top 10 Winners VIP Modal */}
      <TopWinnersModal
        open={showTopWinnersModal}
        onClose={() => setShowTopWinnersModal(false)}
      />

      {/* VIP Cosmetics & Prestige Shop Modal */}
      <CosmeticsShopModal
        isOpen={showCosmeticsModal}
        onClose={() => {
          setShowCosmeticsModal(false);
          refreshUser();
        }}
      />

      {/* Social Credit Sharing & Requests Modal */}
      <CreditTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          refreshUser();
        }}
      />
    </div>
  );
};
