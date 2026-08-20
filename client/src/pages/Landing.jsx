import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Trophy, Coins, Users, ArrowRight, Star, AlertTriangle, Sparkles, TrendingUp, Zap, HelpCircle, Gift, Flame, Disc, Gem, Bomb, Rocket, Layers, Dices, Play, CheckCircle2, ChevronRight, Lock, Gamepad2, Info, Crosshair, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCredits } from '../utils/format';

const GAMES_LIST = [
  {
    id: 'wheel',
    title: '7 Wheel Multiplayer',
    tagline: 'Predict Under 7, Over 7, or Exact 7 in real-time round pools.',
    icon: Disc,
    badge: 'MULTIPLAYER',
    badgeColor: 'bg-brand-500/20 text-brand-300 border-brand-500/40',
    color: 'from-purple-600 via-indigo-600 to-brand-500',
    path: '/play',
    multiplier: 'Up to 7.0x',
  },
  {
    id: 'roulette',
    title: 'European Roulette',
    tagline: '37-pocket single-zero wheel with deep emerald felt table.',
    icon: Disc,
    badge: '36x PAYOUT',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    color: 'from-amber-500 via-yellow-600 to-amber-700',
    path: '/roulette',
    multiplier: '36x Straight Up',
  },
  {
    id: 'blackjack',
    title: 'Blackjack 21',
    tagline: 'Classic card table vs dealer with 3:2 Natural Blackjack & Double Down.',
    icon: Award,
    badge: '3:2 BLACKJACK',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    color: 'from-emerald-600 via-teal-600 to-cyan-600',
    path: '/blackjack',
    multiplier: '2.5x Natural Win',
  },
  {
    id: 'plinko',
    title: 'Plinko Pyramid',
    tagline: 'Peg bounce arcade physics with up to 1000x edge multipliers.',
    icon: Layers,
    badge: '1000x MULTIPLIER',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    color: 'from-pink-600 via-purple-600 to-indigo-600',
    path: '/plinko',
    multiplier: 'Up to 1000x',
  },
  {
    id: 'crash',
    title: 'Crash Rocket',
    tagline: 'Real-time rocket flight trajectory curve with live auto-cashout.',
    icon: TrendingUp,
    badge: 'HIGH VOLATILITY',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    color: 'from-red-600 via-orange-600 to-amber-600',
    path: '/crash',
    multiplier: 'Exponential Curve',
  },
  {
    id: 'mines',
    title: 'Mines Sweeper',
    tagline: '5x5 grid sweeper with variable mine counts & instant cashout.',
    icon: Crosshair,
    badge: '97% RTP',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    color: 'from-cyan-600 via-blue-600 to-indigo-600',
    path: '/mines',
    multiplier: 'Instant Cashout',
  },
  {
    id: 'flip',
    title: 'Flip or Flop',
    tagline: 'Rapid 3D coin toss streak ladder with 50/50 hardware fair odds.',
    icon: Coins,
    badge: 'RAPID STREAKS',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    color: 'from-yellow-600 via-amber-600 to-orange-600',
    path: '/flip',
    multiplier: '2.0x Double Up',
  },
  {
    id: 'slots',
    title: 'Vegas 777 Slots',
    tagline: '5-reel video slot machine with Scatter Free Spins & Wild symbols.',
    icon: Sparkles,
    badge: 'FREE SPINS',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    color: 'from-purple-600 via-fuchsia-600 to-pink-600',
    path: '/slots',
    multiplier: 'Up to 500x',
  },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showTopBanner, setShowTopBanner] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTopBanner(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Simulated live win feed
  const [recentWins, setRecentWins] = useState([
    { id: 1, name: 'ZeusSpin', amount: 250.00, game: 'Plinko 1000x', time: 'Just now' },
    { id: 2, name: 'Lucky777', amount: 180.00, game: 'Blackjack 21', time: '1m ago' },
    { id: 3, name: 'OverLord', amount: 360.00, game: 'Roulette 36x', time: '2m ago' },
    { id: 4, name: 'VegasKing', amount: 95.00, game: 'Crash 4.2x', time: '4m ago' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const names = ['CryptoWin', 'SatoshiS', 'WheelBoss', 'HighRoller', 'LuckyLady', 'DiceMaster', 'LobbySpins'];
      const games = [
        'Plinko 33x',
        'Blackjack Natural',
        'Roulette Straight Up',
        'Crash 8.5x',
        'Mines Diamond Sweep',
        '7Wheel Exact 7',
      ];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomGame = games[Math.floor(Math.random() * games.length)];
      const amount = (Math.floor(Math.random() * 80) + 15) * 2.5;

      setRecentWins((prev) => [
        { id: Date.now(), name: randomName, amount, game: randomGame, time: 'Just now' },
        ...prev.slice(0, 3),
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#05050a] text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-x-hidden font-sans pt-16">
      
      {/* Background ambient radial glows */}
      <div className="absolute top-[-10%] left-[20%] w-[800px] h-[600px] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />

      {/* Prominent Disclaimer Notice Banner — Auto disappears after 2 seconds */}
      <AnimatePresence>
        {showTopBanner && (
          <motion.div
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border-b border-purple-500/30 py-2 px-4 text-center text-xs font-bold text-slate-300 flex items-center justify-center gap-2 overflow-hidden relative z-50"
          >
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span><strong>SOCIAL GAMING PLATFORM:</strong> Played strictly with virtual game credits for entertainment. No real money gambling or cash payouts.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always Visible Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-1.5 sm:py-2 border-b border-slate-800/80 bg-[#05050a]/95 backdrop-blur-2xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-3">
          
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState('', document.title, window.location.pathname);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 sm:gap-3 group shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-500 via-purple-600 to-pink-600 flex items-center justify-center text-base sm:text-xl font-black text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform shrink-0">
              7
            </div>
            <div>
              <span className="font-display font-black text-white text-sm sm:text-lg tracking-tight leading-none block whitespace-nowrap">7 WHEEL</span>
              <span className="text-[8px] sm:text-[9px] text-brand-400 font-extrabold tracking-wider sm:tracking-widest uppercase leading-none block mt-0.5 sm:mt-1 whitespace-nowrap">Social Hub</span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-extrabold tracking-wider uppercase text-slate-400">
            <button
              onClick={() => {
                window.history.pushState('', document.title, window.location.pathname);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-brand-400 text-slate-200 transition-colors flex items-center gap-1"
            >
              <span>Hero Section</span>
            </button>
            <a href="#games" className="hover:text-white transition-colors">Games Suite</a>
            <a href="#disclaimer" className="hover:text-cyan-400 transition-colors">Social Play Disclaimer</a>
            <a href="#features" className="hover:text-white transition-colors">VIP Perks</a>
            <Link to="/privacy-terms" className="hover:text-white transition-colors">Rules</Link>
          </nav>

          {/* Action CTAs — Compact Horizontal Format under 412px */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {user ? (
              <Link to="/play" className="btn-primary py-1.5 sm:py-2.5 px-2.5 sm:px-6 text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-2 glow-brand rounded-xl whitespace-nowrap shadow-md">
                <span>Lobby</span>
                <span className="hidden xs:inline text-[10px] sm:text-xs text-brand-200">({formatCredits(user.balance)})</span>
                <Zap size={13} className="text-yellow-300 shrink-0" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white text-[11px] sm:text-xs font-extrabold px-1.5 sm:px-3 py-1.5 sm:py-2 transition-colors whitespace-nowrap">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-1.5 sm:py-2.5 px-2.5 sm:px-5 text-[11px] sm:text-xs font-black rounded-xl glow-brand flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 shadow-md">
                  <Coins size={13} className="text-yellow-300 shrink-0" />
                  <span>Claim 100 <span className="hidden xs:inline">Credits</span></span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pt-10 pb-16 md:pt-16 text-center space-y-8">
        
        {/* Top Hero Pill Badges */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900/90 border border-brand-500/40 text-brand-300 text-xs font-black uppercase tracking-wider shadow-2xl backdrop-blur-md"
          >
            <Sparkles size={14} className="text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>INSTANT 100 COMPLIMENTARY GAME CREDITS (WELCOME ALLOCATION)</span>
          </motion.div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
            <Info size={14} />
            <span>VIRTUAL CREDITS ONLY · NO REAL MONEY GAMBLING</span>
          </div>
        </div>

        {/* Main Title Headline */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl text-white tracking-tight leading-[1.06]">
            THE NEXT-GEN VIRTUAL <br />
            <span className="bg-gradient-to-r from-purple-400 via-brand-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(168,85,247,0.4)]">
              SOCIAL GAMING SUITE
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Play 7 Wheel, European Roulette, Blackjack 21, Plinko, Crash, Mines, and Flip or Flop purely for fun and entertainment with virtual game tokens.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to={user ? '/play' : '/register'}
            className="btn-primary px-9 py-4 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 glow-brand hover:scale-[1.02] transition-all rounded-2xl shadow-2xl w-full sm:w-auto"
          >
            <Coins size={18} className="text-yellow-300" />
            Claim 100 Credits & Play Free
          </Link>
          <a
            href="#games"
            className="px-8 py-4 text-sm font-extrabold uppercase tracking-wider border border-slate-800 bg-slate-950/60 hover:bg-slate-900 rounded-2xl text-slate-300 hover:text-white transition-all w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Explore All 7 Games <ArrowRight size={16} />
          </a>
        </div>

        {/* Social Proof Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 max-w-4xl mx-auto">
          <div className="card p-4 text-center border border-slate-800 bg-slate-900/60 rounded-2xl">
            <span className="font-display font-black text-2xl text-emerald-400 block">100 Credits</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Welcome Balance</span>
          </div>
          <div className="card p-4 text-center border border-slate-800 bg-slate-900/60 rounded-2xl">
            <span className="font-display font-black text-2xl text-amber-400 block">97.0%</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Standard RTP Rate</span>
          </div>
          <div className="card p-4 text-center border border-slate-800 bg-slate-900/60 rounded-2xl">
            <span className="font-display font-black text-2xl text-purple-400 block">7 Titles</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Social Casino Suite</span>
          </div>
          <div className="card p-4 text-center border border-slate-800 bg-slate-900/60 rounded-2xl">
            <span className="font-display font-black text-2xl text-cyan-400 block">HMAC-256</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Provably Fair RNG</span>
          </div>
        </div>
      </section>

      {/* DEDICATED SOCIAL GAMING DISCLAIMER SECTION */}
      <section id="disclaimer" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full relative z-10 scroll-mt-24">
        <div className="card p-6 border-2 border-cyan-500/30 bg-slate-950/80 backdrop-blur-xl rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Gamepad2 size={28} />
          </div>
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="font-display font-black text-lg text-white flex items-center justify-center md:justify-start gap-2">
              <span>Entertainment & Social Gaming Notice</span>
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed font-medium">
              7Wheel is a free-to-play social casino simulation platform designed purely for amusement, friendly competition, and entertainment. All games use virtual credits only. <strong>No real money deposit, real money wagering, or cash prize payouts are offered or available.</strong> Winning in virtual games does not imply future success at real money gambling.
            </p>
          </div>
        </div>
      </section>

      {/* ALL 7 GAMES SHOWCASE SECTION */}
      <section id="games" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full relative z-10 space-y-10 scroll-mt-24">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-black uppercase tracking-wider">
            <Zap size={14} /> Full Gaming Suite
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight">
            EXPLORE OUR 7 MINI-GAMES
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold">
            Choose your game, set your virtual token stake, and multiply your credits with fair fun mechanics.
          </p>
        </div>

        {/* 7 Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES_LIST.map((game) => (
            <motion.div
              key={game.id}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="card p-6 border-2 border-slate-800/90 bg-slate-950/80 backdrop-blur-xl rounded-3xl space-y-5 shadow-2xl flex flex-col justify-between hover:border-brand-500/50 transition-all group relative overflow-hidden"
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform`}>
                  <game.icon size={24} />
                </div>
                <span className={`text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${game.badgeColor}`}>
                  {game.badge}
                </span>
              </div>

              {/* Game Info */}
              <div className="space-y-2">
                <h3 className="font-display font-black text-xl text-white group-hover:text-brand-300 transition-colors">
                  {game.title}
                </h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">
                  {game.tagline}
                </p>
              </div>

              {/* Footer info & CTA */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Token Payout</span>
                  <span className="font-mono text-xs font-black text-amber-400">{game.multiplier}</span>
                </div>

                <Link
                  to={user ? game.path : '/register'}
                  className="px-4 py-2.5 rounded-xl font-display font-extrabold text-xs bg-slate-900 border border-slate-800 group-hover:border-brand-500/60 text-slate-200 group-hover:text-white flex items-center gap-1.5 transition-all"
                >
                  Play Game <ChevronRight size={14} className="text-brand-400" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PLATFORM FEATURES & REWARDS SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full relative z-10 space-y-12 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-display font-black text-3xl text-white">VIP REWARDS & PLATFORM PERKS</h2>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold">
            Daily mystery crates, login streak bonuses, and provably fair enterprise architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1: Mystery Loot Crates */}
          <div className="card p-6 border border-slate-800 bg-slate-950/60 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Gift size={22} />
            </div>
            <h3 className="font-display font-black text-lg text-white">Daily Mystery Loot Crates</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">
              Claim free daily gacha loot crates with tier drops from Common up to Legendary 500 Credits jackpots. Includes a guaranteed pity counter at 10 opens!
            </p>
          </div>

          {/* Feature 2: Login Streak Ladders */}
          <div className="card p-6 border border-slate-800 bg-slate-950/60 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Flame size={22} />
            </div>
            <h3 className="font-display font-black text-lg text-white">Daily Login Streak Bonus</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">
              Log in daily to escalate your streak multiplier. Earn growing daily credit claims and unlock exclusive VIP badge status.
            </p>
          </div>

          {/* Feature 3: Hardware Fairness */}
          <div className="card p-6 border border-slate-800 bg-slate-950/60 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield size={22} />
            </div>
            <h3 className="font-display font-black text-lg text-white">Hardware Cryptographic Fairness</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">
              All dice, card shuffles, peg paths, wheel outcomes, and coin flips utilize Node <code>crypto.randomInt</code> for zero-bias 100% fair odds.
            </p>
          </div>
        </div>
      </section>

      {/* LIVE WINNERS MARQUEE FEED */}
      <section className="border-y border-slate-800/80 bg-slate-950/90 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Live Win Feed Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-display font-black text-xs uppercase tracking-widest text-white">LIVE PAYOUT FEED (VIRTUAL CREDITS)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full md:w-auto">
            <AnimatePresence initial={false}>
              {recentWins.map((win) => (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 shrink-0"
                >
                  <div className="w-7 h-7 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xs font-black text-brand-300">
                    {win.name[0]}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-none">{win.name}</span>
                    <span className="text-slate-400 font-medium">won on <strong className="text-slate-200">{win.game}</strong></span>
                  </div>
                  <span className="font-mono font-black text-xs text-emerald-400 ml-2">+{win.amount.toFixed(2)} Credits</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* BOTTOM CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20 w-full relative z-10 text-center space-y-6">
        <div className="card p-10 border-2 border-brand-500/40 bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 backdrop-blur-2xl rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-brand-gradient flex items-center justify-center text-3xl font-black text-white mx-auto shadow-xl shadow-brand-500/30">
            7
          </div>

          <h2 className="font-display font-black text-3xl md:text-5xl text-white tracking-tight">
            READY TO CLAIM YOUR 100 FREE CREDITS?
          </h2>

          <p className="text-slate-400 text-sm max-w-xl mx-auto font-medium">
            Join over 1,200 active social gaming players. Register in 10 seconds and start playing all 7 mini-games for free right now.
          </p>

          <div className="pt-2">
            <Link
              to={user ? '/play' : '/register'}
              className="btn-primary px-10 py-4 text-sm font-black uppercase tracking-wider inline-flex items-center gap-3 glow-brand rounded-2xl shadow-2xl hover:scale-105 transition-transform"
            >
              <Coins size={20} className="text-yellow-300" />
              Register Account & Claim 100 Free Credits
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800/60 pb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-lg font-black text-white glow-brand">
                7
              </div>
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                7 WHEEL SOCIAL GAMING PLATFORM
              </span>
            </div>

            <div className="flex gap-6 text-xs text-slate-400 font-medium">
              <Link to="/privacy-terms" className="hover:text-brand-400 transition-colors">Privacy Policy</Link>
              <Link to="/privacy-terms" className="hover:text-brand-400 transition-colors">Terms of Service</Link>
              <Link to="/privacy-terms" className="hover:text-brand-400 transition-colors">Responsible Play</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2.5 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-[11px] text-cyan-300 max-w-lg">
              <Gamepad2 size={16} className="flex-shrink-0 text-cyan-400" />
              <span><strong>Free Social Gaming Notice:</strong> 7Wheel is strictly for fun and entertainment. Played exclusively with virtual tokens. No real money gambling or cash redemption.</span>
            </div>

            <p className="text-[11px] text-slate-600">
              &copy; 2026 7 Wheel Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
