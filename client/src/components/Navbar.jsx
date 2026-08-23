import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Zap, ChevronDown, Shield, Settings, History, Volume2, VolumeX,
  Flame, Gift, Dices, Disc, Gem, Bomb, Rocket, Layers, Coins, Castle,
  Gamepad2, User, Trophy, Sparkles, X, ChevronRight, Check, LayoutGrid, LogOut, Crown,
  HeartHandshake, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LootCrateModal from './LootCrateModal';
import DailyStreakModal from './DailyStreakModal';
import RoundHistory from './RoundHistory';
import BuyCreditsModal from './BuyCreditsModal';
import CosmeticsShopModal from './CosmeticsShopModal';
import { formatCredits } from '../utils/format';
import { getEquippedFrame, getEquippedTitle, TitleBadge } from '../utils/cosmetics';

const GAMES = [
  {
    path: '/play',
    label: '7 Wheel',
    tagline: 'Multiplayer 7-Multiplier Wheel',
    icon: Disc,
    badge: 'HOT',
    color: 'from-purple-600 to-brand-500',
  },
  {
    path: '/flip-or-flop',
    label: 'Flip or Flop',
    tagline: 'Rapid 50/50 Streak Multiplier',
    icon: Dices,
    badge: 'LIVE',
    color: 'from-amber-500 to-orange-600',
  },
  {
    path: '/slots',
    label: 'Vegas 777 Slots',
    tagline: 'Classic 3-Reel with Wild Emblems',
    icon: Gem,
    badge: '50× JACKPOT',
    color: 'from-purple-600 to-pink-600',
  },
  {
    path: '/mines',
    label: 'Mines Sweeper',
    tagline: '5×5 Grid & Instant Cashout',
    icon: Bomb,
    badge: '97% RTP',
    color: 'from-emerald-600 to-teal-600',
  },
  {
    path: '/crash',
    label: 'Crash Rocket',
    tagline: 'Exponential Multiplier Curve',
    icon: Rocket,
    badge: 'HIGH MULT',
    color: 'from-red-600 to-pink-600',
  },
  {
    path: '/roulette',
    label: 'Roulette 36×',
    tagline: 'European Single-Zero Table',
    icon: Disc,
    badge: '36× PAYOUT',
    color: 'from-amber-600 to-yellow-600',
  },
  {
    path: '/blackjack',
    label: 'Blackjack 21',
    tagline: 'Classic Casino Table vs Dealer',
    icon: Layers,
    badge: '3:2 PAYOUT',
    color: 'from-emerald-600 to-cyan-600',
  },
  {
    path: '/keno',
    label: 'Keno',
    tagline: '100-Ball Lottery Match up to 50,000×',
    icon: Sparkles,
    badge: '50,000× MAX',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    path: '/plinko',
    label: 'Plinko Pyramid',
    tagline: 'Arcade Physics up to 1000×',
    icon: Dices,
    badge: '1000× MAX',
    color: 'from-pink-600 to-purple-600',
  },
  {
    path: '/tower',
    label: 'Tower of Fortune',
    tagline: '9-Floor Climb up to 16,000×',
    icon: Castle,
    badge: '16,000× MAX',
    color: 'from-purple-600 via-pink-600 to-indigo-600',
  },
];

const Navbar = ({ onOpenStreak, onOpenHistory, soundEnabled, onToggleSound, loginStreak }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, showBuyCreditsModal, setShowBuyCreditsModal, setShowAdminStats, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showGamesDropdown, setShowGamesDropdown] = useState(false);
  const [showCrateModal, setShowCrateModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCosmeticsModal, setShowCosmeticsModal] = useState(false);
  const [showMobileGamesDrawer, setShowMobileGamesDrawer] = useState(false);

  const equippedFrame = getEquippedFrame(user?.equipped?.frame);
  const equippedTitle = getEquippedTitle(user?.equipped?.title);

  const gamesDropdownRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (gamesDropdownRef.current && !gamesDropdownRef.current.contains(e.target)) {
        setShowGamesDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isGameActive = (gamePath) => {
    if (gamePath === '/play') return location.pathname === '/play' || location.pathname === '/';
    return location.pathname === gamePath;
  };

  const currentGame = GAMES.find((g) => isGameActive(g.path)) || GAMES[0];

  return (
    <>
      {/* ── TOP HEADER (Desktop & Mobile) ── */}
      <header className="sticky top-0 z-40 border-b border-casino-border bg-casino-card/95 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">

          {/* Left: Brand Logo + Game Hub Popover Trigger */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/play"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 group shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-base sm:text-lg font-black text-white glow-brand group-hover:scale-105 transition-transform shrink-0">
                7
              </div>
              <div className="hidden sm:block">
                <span className="font-display font-bold text-white text-sm sm:text-base leading-none block whitespace-nowrap">7 Wheel</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-none block mt-0.5 whitespace-nowrap">Social Casino</span>
              </div>
            </Link>

            {/* Mobile / Tablet Game Switcher Trigger (< 1024px) */}
            <button
              onClick={() => setShowMobileGamesDrawer(true)}
              className="lg:hidden flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-500/50 text-slate-200 transition-all text-xs font-bold shrink-0"
            >
              <currentGame.icon size={13} className="text-brand-400 shrink-0" />
              <span className="truncate max-w-[70px] sm:max-w-[100px]">{currentGame.label}</span>
              <ChevronDown size={12} className="text-slate-400 shrink-0" />
            </button>

            {/* Desktop Games Hub Popover Trigger (≥ 1024px) */}
            <div className="hidden lg:block relative" ref={gamesDropdownRef}>
              <button
                onClick={() => setShowGamesDropdown((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  showGamesDropdown
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-lg shadow-brand-500/20'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Gamepad2 size={15} className="text-brand-400 shrink-0" />
                <span className="flex items-center gap-1.5">
                  <span>Games</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-brand-500/30 text-brand-300 text-[10px] font-black border border-brand-500/40">
                    {GAMES.length}
                  </span>
                </span>
                <span className="text-slate-500">|</span>
                <div className="flex items-center gap-1 text-slate-300">
                  <currentGame.icon size={12} className="text-amber-400 shrink-0" />
                  <span className="truncate max-w-[90px]">{currentGame.label}</span>
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${showGamesDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Desktop Games Grid Popover Dropdown (High Contrast Dark Theme) */}
              <AnimatePresence>
                {showGamesDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-12 w-[600px] p-3.5 rounded-2xl border-2 border-slate-800 bg-[#090c15] shadow-[0_16px_50px_rgba(0,0,0,0.95)] z-50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <LayoutGrid size={14} className="text-brand-400" />
                        Casino Games Library ({GAMES.length})
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Provably Fair
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {GAMES.map((game) => {
                        const active = isGameActive(game.path);
                        const Icon = game.icon;

                        return (
                          <Link
                            key={game.path}
                            to={game.path}
                            onClick={() => setShowGamesDropdown(false)}
                            className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all group ${
                              active
                                ? 'bg-brand-500/25 border-brand-500 shadow-md shadow-brand-500/30'
                                : 'bg-[#111726] border-slate-800/90 hover:border-brand-500/60 hover:bg-[#161e32]'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-105 transition-transform`}>
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-display font-bold text-xs text-white truncate block">{game.label}</span>
                                {active && <Check size={12} className="text-brand-400 shrink-0" />}
                              </div>
                              <p className="text-[10px] text-slate-300 truncate leading-tight mt-0.5 font-normal">{game.tagline}</p>
                              {game.badge && (
                                <span className="inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 mt-1">
                                  {game.badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Balance + Daily Crate + Profile (ALWAYS VISIBLE & UNCLIPPED) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">

            {/* Daily Mystery Crate (≥ 640px) */}
            <motion.button
              onClick={() => setShowCrateModal(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:border-purple-400/60 transition-all text-xs font-bold shrink-0"
              title="Open Daily Mystery Crate"
            >
              <Gift size={14} className="text-purple-400 animate-bounce shrink-0" />
              <span className="hidden md:inline">Daily Crate</span>
            </motion.button>

            {/* Daily Streak Indicator (≥ 768px) */}
            {loginStreak > 0 && (
              <button
                onClick={() => { setShowStreakModal(true); onOpenStreak?.(); }}
                className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shrink-0"
                title={`Daily Login Streak: ${loginStreak} days`}
              >
                <Flame size={14} />
                <span>{loginStreak}d</span>
              </button>
            )}

            {/* Credits Balance & Get Credits Button */}
            <div className="flex items-center shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900 border border-slate-800 rounded-l-xl px-2 sm:px-2.5 py-1 sm:py-1.5 border-r-0">
                <Coins size={13} className="text-amber-400 shrink-0" />
                <span className="font-display font-bold text-xs sm:text-sm text-slate-100 tabular-nums">
                  {formatCredits(user?.balance)}
                </span>
              </div>
              <button
                onClick={() => setShowBuyCreditsModal(true)}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500 hover:brightness-110 rounded-r-xl text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md shrink-0"
                title="Send & Request Credits"
              >
                <Send size={11} className="shrink-0" />
                <span className="text-[11px] sm:text-xs">Share</span>
              </button>
            </div>

            {/* User Profile Dropdown Pill (Guaranteed Space, Never Hidden) */}
            <div className="relative shrink-0" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 hover:border-slate-700 transition-colors shrink-0"
                    title="Account Menu"
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      equippedFrame.avatarClass
                    }`}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline font-bold text-xs text-slate-200 max-w-[85px] truncate">
                      {user?.username}
                    </span>
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ${showMenu ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Profile Menu Popover */}
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-56 card shadow-2xl shadow-black/80 overflow-hidden border border-slate-800 bg-slate-950/98 backdrop-blur-2xl z-50 rounded-2xl"
                      >
                        {/* User Header */}
                        <div className="p-3 border-b border-slate-800/80 bg-slate-900/50">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Logged in as</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="font-bold text-sm text-white truncate">{user?.username}</p>
                            <TitleBadge titleId={user?.equipped?.title} />
                          </div>
                          <p className="text-[11px] text-brand-300 font-mono mt-0.5">{formatCredits(user?.balance)} Credits</p>
                        </div>

                    {/* Menu Options */}
                    <div className="p-2 space-y-1 text-xs">
                      <button
                        onClick={() => { setShowBuyCreditsModal(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-300 hover:bg-emerald-500/15 hover:text-white transition-colors text-left font-semibold"
                      >
                        <HeartHandshake size={14} className="text-emerald-400" />
                        Send & Request Credits
                      </button>

                      <Link
                        to="/profile"
                        onClick={() => setShowMenu(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                      >
                        <Settings size={14} className="text-slate-400" />
                        Profile & Settings
                      </Link>

                      <button
                        onClick={() => { setShowCosmeticsModal(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/15 hover:text-white transition-colors text-left font-semibold"
                      >
                        <Crown size={14} className="text-amber-400" />
                        VIP Cosmetics Shop
                        <span className="ml-auto text-[9px] bg-purple-500/30 text-purple-200 border border-purple-500/40 px-1.5 py-0.2 rounded-full uppercase font-extrabold">
                          VIP
                        </span>
                      </button>

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

                      {logout && (
                        <button
                          onClick={() => { logout(); setShowMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left font-bold border-t border-slate-800/80 mt-1 pt-2"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE QUICK GAMES DRAWER (Bottom Sheet) ── */}
      <AnimatePresence>
        {showMobileGamesDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileGamesDrawer(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto lg:hidden shadow-2xl space-y-4"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 size={20} className="text-brand-400" />
                  <span className="font-display font-black text-lg text-white">Select Game</span>
                </div>
                <button
                  onClick={() => setShowMobileGamesDrawer(false)}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Game Grid Cards */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5">
                {GAMES.map((game) => {
                  const active = isGameActive(game.path);
                  const Icon = game.icon;

                  return (
                    <button
                      key={game.path}
                      onClick={() => {
                        setShowMobileGamesDrawer(false);
                        navigate(game.path);
                      }}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        active
                          ? 'bg-gradient-to-r from-brand-500/20 to-purple-600/20 border-brand-500 shadow-lg shadow-brand-500/20'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white shadow-md shrink-0`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-display font-black text-sm text-white truncate">{game.label}</span>
                            {game.badge && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 shrink-0">
                                {game.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{game.tagline}</p>
                        </div>
                      </div>

                      {active ? (
                        <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0 ml-2">
                          <Check size={13} />
                        </div>
                      ) : (
                        <ChevronRight size={16} className="text-slate-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAVIGATION DOCK (Native iOS/Android App feel) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-[#09090f]/95 backdrop-blur-2xl lg:hidden px-3 py-2 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.7)]">
        
        {/* Tab 1: Games Hub Drawer */}
        <button
          onClick={() => setShowMobileGamesDrawer(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Gamepad2 size={16} />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-brand-300">Games</span>
        </button>

        {/* Tab 2: Daily Crate */}
        <button
          onClick={() => setShowCrateModal(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Gift size={16} className="animate-bounce" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-slate-300">Crates</span>
        </button>

        {/* Tab 3: Daily Streak */}
        <button
          onClick={() => { setShowStreakModal(true); onOpenStreak?.(); }}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame size={16} />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-slate-300">Streak</span>
        </button>

        {/* Tab 4: Profile & Settings */}
        <Link
          to="/profile"
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
            <User size={16} />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-slate-300">Profile</span>
        </Link>
      </nav>

      {/* Modals */}
      <LootCrateModal isOpen={showCrateModal} onClose={() => setShowCrateModal(false)} />
      <DailyStreakModal open={showStreakModal} onClose={() => setShowStreakModal(false)} />
      <RoundHistory open={showHistoryModal} onClose={() => setShowHistoryModal(false)} />
      <BuyCreditsModal isOpen={showBuyCreditsModal} onClose={() => setShowBuyCreditsModal(false)} />
      <CosmeticsShopModal isOpen={showCosmeticsModal} onClose={() => setShowCosmeticsModal(false)} />
    </>
  );
};

export default Navbar;

