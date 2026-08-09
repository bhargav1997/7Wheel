import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Wifi, WifiOff, ChevronDown, Shield, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Navbar = () => {
  const { user, setShowBuyCreditsModal, setShowAdminStats } = useAuth();
  const { connected, gameState } = useSocket();
  const [showMenu, setShowMenu] = useState(false);

  const statusColors = {
    WAITING_FOR_PLAYERS: 'badge-waiting',
    BETTING:             'badge-betting',
    SPINNING:            'badge-spinning',
    RESULT:              'badge-result',
  };

  const statusLabels = {
    WAITING_FOR_PLAYERS: 'Waiting',
    BETTING:             'Betting Open',
    SPINNING:            'Spinning',
    RESULT:              'Results',
  };

  return (
    <header className="relative z-50 border-b border-casino-border bg-casino-card/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-lg font-black glow-brand">
            7
          </div>
          <div className="hidden sm:block">
            <span className="font-display font-bold text-white text-lg leading-none">7 Wheel</span>
            <span className="block text-xs text-slate-500 leading-none mt-0.5">Entertainment Hub</span>
          </div>
        </div>

        {/* Center — round status */}
        <div className="flex items-center gap-3">
          <span className={statusColors[gameState?.status]}>
            {statusLabels[gameState?.status]}
          </span>
          {gameState?.roundNumber > 0 && (
            <span className="text-xs text-slate-500 hidden sm:inline">Round #{gameState.roundNumber}</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">

          {/* Connection */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {connected
              ? <><Wifi size={12} className="text-emerald-400" /><span className="text-emerald-400">Live</span></>
              : <><WifiOff size={12} className="text-slate-500" /><span className="text-slate-500">Offline</span></>}
          </div>

          {/* Credits + Buy */}
          <div className="flex items-center">
            <motion.div
              key={user?.balance}
              initial={{ scale: 1.15, color: '#fcd34d' }}
              animate={{ scale: 1,    color: '#e2e8f0' }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 bg-casino-muted border border-casino-border
                         rounded-l-xl px-3 py-1.5 border-r-0"
              title="Credits balance · no cash value"
            >
              <span className="text-base leading-none">🪙</span>
              <span className="font-display font-bold text-sm tabular-nums">
                {(user?.balance ?? 0).toLocaleString()}
              </span>
            </motion.div>
            <button
              id="buy-credits-btn"
              onClick={() => setShowBuyCreditsModal(true)}
              className="px-2.5 py-1.5 bg-brand-gradient border border-brand-500
                         hover:opacity-90 rounded-r-xl text-white font-bold text-sm
                         flex items-center gap-1 transition-all"
              title="Buy Credits"
            >
              <Zap size={12} />
              <span className="hidden sm:inline text-xs">Buy</span>
            </button>
          </div>

          {/* Avatar / user menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 bg-casino-muted border border-casino-border
                         rounded-xl px-3 py-1.5 hover:border-brand-500 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-brand-gradient flex items-center justify-center
                              text-xs font-bold text-white">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-200 max-w-[80px] truncate">
                {user?.username}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0,  scale: 1 }}
                  exit={{    opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-52 card shadow-2xl shadow-black/50 overflow-hidden"
                >
                  {/* Identity */}
                  <div className="p-4 border-b border-casino-border">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="font-semibold text-white truncate">{user?.username}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="p-2 space-y-0.5">
                    {/* Profile settings */}
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm
                                 text-slate-300 hover:bg-casino-muted/50 hover:text-white
                                 transition-colors"
                    >
                      <Settings size={14} />
                      Profile & Settings
                    </Link>

                    {/* Admin panel — only for admins */}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { setShowAdminStats(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm
                                   text-brand-400 hover:bg-brand-500/10 transition-colors text-left font-semibold"
                      >
                        <Shield size={14} />
                        Admin Panel
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
  );
};

export default Navbar;
