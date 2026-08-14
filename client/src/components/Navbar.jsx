import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, ChevronDown, Shield, Settings, History, Volume2, VolumeX, Flame, Gift, Dices, Disc, Gem, Bomb, Rocket, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LootCrateModal from './LootCrateModal';
import DailyStreakModal from './DailyStreakModal';
import RoundHistory from './RoundHistory';

const Navbar = ({ onOpenStreak, onOpenHistory, soundEnabled, onToggleSound, loginStreak }) => {
  const location = useLocation();
  const { user, setShowBuyCreditsModal, setShowAdminStats } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showCrateModal, setShowCrateModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const isFlipPage  = location.pathname === '/flip-or-flop';
  const isSlotsPage = location.pathname === '/slots';
  const isMinesPage = location.pathname === '/mines';
  const isCrashPage = location.pathname === '/crash';
  const isRoulettePage = location.pathname === '/roulette';
  const isBlackjackPage = location.pathname === '/blackjack';
  const isPlinkoPage = location.pathname === '/plinko';
  const isWheelPage = location.pathname === '/play' || location.pathname === '/';

  return (
    <header className="relative z-50 border-b border-casino-border bg-casino-card/90 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Left: Brand + Sleek Game Selector Tabs */}
        <div className="flex items-center gap-6">
          <Link to="/play" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-lg font-black text-white glow-brand group-hover:scale-105 transition-transform">
              7
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-white text-base leading-none block">7 Wheel</span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">Social Casino</span>
            </div>
          </Link>

          {/* Game Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <Link
              to="/play"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isWheelPage
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Disc size={13} />
              <span>Wheel</span>
            </Link>

            <Link
              to="/flip-or-flop"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isFlipPage
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Dices size={13} />
              <span>Flip</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </Link>

            <Link
              to="/slots"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSlotsPage
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Gem size={13} />
              <span>Slots</span>
            </Link>

            <Link
              to="/mines"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isMinesPage
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bomb size={13} />
              <span>Mines</span>
            </Link>

            <Link
              to="/crash"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isCrashPage
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Rocket size={13} />
              <span>Crash</span>
            </Link>

            <Link
              to="/roulette"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isRoulettePage
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Disc size={13} />
              <span>Roulette</span>
            </Link>

            <Link
              to="/blackjack"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isBlackjackPage
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers size={13} />
              <span>Blackjack</span>
            </Link>

            <Link
              to="/plinko"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPlinkoPage
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Dices size={13} />
              <span>Plinko</span>
            </Link>
          </nav>
        </div>

        {/* Right: Credits + Crate + Profile Dropdown */}
        <div className="flex items-center gap-3">

          {/* Daily Crate Button */}
          <motion.button
            onClick={() => setShowCrateModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:border-purple-400/60 transition-all text-xs font-bold"
            title="Open Daily Mystery Crate"
          >
            <Gift size={14} className="text-purple-400 animate-bounce" />
            <span className="hidden md:inline">Daily Crate</span>
          </motion.button>

          {/* Credits Balance & Buy Pill */}
          <div className="flex items-center">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-l-xl px-3 py-1.5 border-r-0">
              <span className="text-sm">🪙</span>
              <span className="font-display font-bold text-xs sm:text-sm text-slate-100 tabular-nums">
                {(user?.balance ?? 0).toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => setShowBuyCreditsModal(true)}
              className="px-2.5 py-1.5 bg-brand-gradient border border-brand-500 hover:brightness-110 rounded-r-xl text-white font-bold text-xs flex items-center gap-1 transition-all"
              title="Get More Credits"
            >
              <Zap size={12} />
              <span className="hidden sm:inline">Get</span>
            </button>
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-brand-gradient flex items-center justify-center text-xs font-bold text-white">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-56 card shadow-2xl shadow-black/80 overflow-hidden border border-slate-800 bg-slate-950/95"
                >
                  {/* User Banner */}
                  <div className="p-3 border-b border-slate-800/80 bg-slate-900/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Logged in as</p>
                    <p className="font-bold text-sm text-white truncate">{user?.username}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2 space-y-1 text-xs">
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                    >
                      <Settings size={14} className="text-slate-400" />
                      Profile & Settings
                    </Link>

                    <button
                      onClick={() => { setShowStreakModal(true); onOpenStreak?.(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors text-left font-semibold"
                    >
                      <Flame size={14} />
                      Daily Login Bonus
                      {loginStreak > 0 && <span className="ml-auto text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded-full">{loginStreak}d</span>}
                    </button>

                    <button
                      onClick={() => { setShowHistoryModal(true); onOpenHistory?.(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
                    >
                      <History size={14} className="text-slate-400" />
                      Round History
                    </button>

                    <button
                      onClick={() => onToggleSound?.()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors text-left"
                    >
                      {soundEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-slate-500" />}
                      Sound Effects: {soundEnabled ? 'ON' : 'OFF'}
                    </button>

                    <a
                      href="https://shadow-breach.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors font-semibold"
                    >
                      <span>🎮</span>
                      Try Shadow Breach
                    </a>

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { setShowAdminStats(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-brand-400 hover:bg-brand-500/10 transition-colors text-left font-bold border-t border-slate-800/80 mt-1 pt-2"
                      >
                        <Shield size={14} />
                        Admin Dashboard
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <LootCrateModal isOpen={showCrateModal} onClose={() => setShowCrateModal(false)} />
      <DailyStreakModal open={showStreakModal} onClose={() => setShowStreakModal(false)} />
      <RoundHistory open={showHistoryModal} onClose={() => setShowHistoryModal(false)} />
    </header>
  );
};

export default Navbar;
