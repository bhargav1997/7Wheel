import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, Coins, Users, ArrowRight, Star, AlertTriangle, Sparkles, TrendingUp, Zap, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { user } = useAuth();

  // Simulated live win notifications to create high excitement and social proof
  const [recentWins, setRecentWins] = useState([
    { id: 1, name: 'ZeusSpin', amount: 58.50, game: 'Under 7 (Pool share)', time: 'Just now' },
    { id: 2, name: 'Lucky777', amount: 230.00, game: 'Exact 7 (Pool share)', time: '1m ago' },
    { id: 3, name: 'OverLord', amount: 117.50, game: 'Over 7 (Pool share)', time: '2m ago' },
    { id: 4, name: 'VegasKing', amount: 48.75, game: 'Under 7 (Pool share)', time: '4m ago' },
  ]);

  // Periodically roll/update the simulated live wins to feel "alive"
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ['CryptoWin', 'SatoshiS', 'WheelBoss', 'HighRoller', 'LuckyLady', 'DiceMaster', 'LobbySpins'];
      const games = [
        { desc: 'Under 7 (Pool share)', mult: 1.85 },
        { desc: 'Over 7 (Pool share)', mult: 2.25 },
        { desc: 'Exact 7 (Pool share)', mult: 9.5 },
      ];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomGame = games[Math.floor(Math.random() * games.length)];
      const amount = parseFloat(( (Math.floor(Math.random() * 45) + 6) * randomGame.mult ).toFixed(2));

      setRecentWins((prev) => [
        { id: Date.now(), name: randomName, amount, game: randomGame.desc, time: 'Just now' },
        ...prev.slice(0, 3),
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#07070d] text-slate-200 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-hidden font-sans">
      {/* Decorative premium background grid + gradient glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] rounded-full bg-gold-500/5 blur-[130px] pointer-events-none" />

      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-50 border-b border-casino-border bg-casino-dark/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-xl font-black text-white glow-brand shadow-lg">
              7
            </div>
            <div>
              <span className="font-display font-black text-white text-base sm:text-lg tracking-tight leading-none block">7 WHEEL</span>
              <span className="text-[9px] text-brand-400 font-bold tracking-widest uppercase leading-none block mt-1">Multiplayer Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://shadow-breach.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs text-purple-400 font-semibold hover:text-purple-300 transition-colors bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg"
            >
              <Sparkles size={12} />
              Try Shadow Breach
            </a>
            <Link to="/privacy-terms" className="hidden sm:block text-xs text-slate-400 hover:text-white transition-colors">
              Fair Play Rules
            </Link>
            {user ? (
              <Link to="/play" className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 glow-brand">
                Enter Lobby <Zap size={12} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-2 px-5 text-xs font-bold glow-brand">
                  Register & Claim $5
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pt-8 pb-16 md:pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Headline & Hype */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Free Bonus Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-black uppercase tracking-wider shadow-inner">
            <Sparkles size={12} className="animate-spin text-gold-400" style={{ animationDuration: '3s' }} />
            <span>CLAIM $5.00 FREE SIGN-UP BONUS</span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-7xl text-white tracking-tight leading-[1.05] drop-shadow-sm">
            PREDICT THE SPIN. <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent glow-brand">MULTIPLY</span> YOUR STAKE.
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Watch the countdown. Coordinate with other players in our live chat. Select Under 7, Over 7, or Exact 7 and earn proportional splits from the round wagers.
          </p>

          {/* Social proof indicators */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 bg-[#111118]/60 border border-casino-border/50 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-slate-300 font-bold">1,245 online</strong> spinning now
            </span>
            <span className="flex items-center gap-1">
              <Trophy size={14} className="text-gold-400" />
              Average return rate: <strong className="text-slate-300">96.5% RTP</strong>
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              to={user ? '/play' : '/register'}
              className="btn-primary px-8 py-4 w-full sm:w-auto text-sm font-bold flex items-center justify-center gap-2 glow-brand hover:scale-[1.03] transition-all duration-300 shadow-xl"
            >
              Play Now (Start with $5 Free) <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 w-full sm:w-auto text-sm font-semibold border border-casino-border hover:border-slate-600 bg-casino-card/30 hover:bg-casino-card/50 rounded-xl text-slate-300 hover:text-white transition-all text-center"
            >
              Learn How It Works
            </a>
          </div>
        </div>

        {/* Right: Live Activity Showcase & Spin Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center gap-6 relative">
          <div className="absolute inset-0 bg-brand-500/5 blur-[90px] rounded-full pointer-events-none" />

          {/* Detailed Casino Wheel Mockup */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 select-none flex items-center justify-center">
            {/* Top Indicator Pin */}
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-20 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              <div className="w-5 h-7 bg-gradient-to-b from-red-500 to-red-600 origin-top animate-pulse" 
                   style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
            </div>

            {/* Glowing Golden Ring Frame */}
            <div className="absolute inset-0 rounded-full border-[5px] border-amber-500 bg-transparent z-10 shadow-[0_0_25px_rgba(245,158,11,0.3)] pointer-events-none" />

            {/* Outer bulbs / light dots around rim */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 z-20 animate-pulse"
                style={{
                  top: `${50 + 47.5 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                  left: `${50 + 47.5 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}

            {/* Spinning SVG Wheel */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              className="w-[93%] h-[93%] rounded-full shadow-2xl relative flex items-center justify-center overflow-hidden bg-casino-dark"
            >
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-15">
                <defs>
                  {/* Gold metallic gradient for segment 7 */}
                  <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="70%" stopColor="#ca8a04" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </radialGradient>
                  {/* Under 7 gradients */}
                  <linearGradient id="underGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4c1d95" />
                    <stop offset="100%" stopColor="#3730a3" />
                  </linearGradient>
                  <linearGradient id="underGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#312e81" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                  </linearGradient>
                  {/* Over 7 gradients */}
                  <linearGradient id="overGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>
                  <linearGradient id="overGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e1b4b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                {/* Draw 12 wedge segments */}
                {[...Array(12)].map((_, i) => {
                  const angle = i * 30;
                  const radStart = ((angle - 15) * Math.PI) / 180;
                  const radEnd = ((angle + 15) * Math.PI) / 180;
                  const x1 = 100 + 100 * Math.cos(radStart);
                  const y1 = 100 + 100 * Math.sin(radStart);
                  const x2 = 100 + 100 * Math.cos(radEnd);
                  const y2 = 100 + 100 * Math.sin(radEnd);

                  // Calculate text placement radius from center (approx. 66px radius)
                  const textRad = (angle * Math.PI) / 180;
                  const tx = 100 + 66 * Math.cos(textRad);
                  const ty = 100 + 66 * Math.sin(textRad);

                  const num = i + 1;
                  let fill = 'url(#underGrad1)';
                  if (num === 7) {
                    fill = 'url(#goldGrad)';
                  } else if (num < 7) {
                    fill = num % 2 === 0 ? 'url(#underGrad2)' : 'url(#underGrad1)';
                  } else {
                    fill = num % 2 === 0 ? 'url(#overGrad2)' : 'url(#overGrad1)';
                  }

                  return (
                    <g key={i}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                        fill={fill}
                        stroke="#07070d"
                        strokeWidth="1.5"
                      />
                      {/* Text label centered mathematically inside its own wedge */}
                      <text
                        x={tx}
                        y={ty}
                        fill={num === 7 ? '#1e1b4b' : '#f8fafc'}
                        fontSize="13"
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-display font-black select-none"
                      >
                        {num}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Glowing Center Hub spindle */}
              <div className="absolute w-16 h-16 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 flex items-center justify-center text-2xl font-black text-slate-950 shadow-2xl border-[3px] border-amber-200 z-10 select-none">
                7
              </div>
            </motion.div>
          </div>

          {/* Live win feed overlays */}
          <div className="w-full max-w-sm bg-[#111118]/80 border border-casino-border rounded-2xl p-4 shadow-xl space-y-3 z-10 backdrop-blur-md">
            <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center justify-between">
              <span>LOBBY PAYOUT FEED</span>
              <span className="flex items-center gap-1 text-emerald-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE
              </span>
            </h4>
            <div className="space-y-2 h-[150px] overflow-hidden relative">
              <AnimatePresence initial={false}>
                {recentWins.map((win) => (
                  <motion.div
                    key={win.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0, margin: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-casino-card/50 border border-casino-border/30 hover:border-brand-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-casino-muted border border-casino-border flex items-center justify-center text-[10px] font-black text-slate-400">
                        {win.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{win.name}</p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-none">{win.game}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 font-display">+${win.amount.toFixed(2)}</span>
                      <p className="text-[9px] text-slate-500 mt-1 leading-none">{win.time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>



      {/* RULES / CHIPS EXPLANATION SECTION */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full relative z-10 space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="font-display font-black text-3xl text-white">Pick Your Prediction</h2>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            The wheel is divided into 12 segments. Choose your prediction. Winners share 96.5% of the round pool proportionally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Under 7 */}
          {/* Under 7 */}
          <div className="card p-6 border-casino-border/50 hover:border-brand-500/20 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-under-gradient flex items-center justify-center font-bold text-white">
                &lt;7
              </div>
              <h3 className="font-display font-bold text-lg text-white">Under 7</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Predict that the wheel lands on segments **1 through 6** (6 out of 12 numbers total).
              </p>
            </div>
            <div className="pt-4 border-t border-casino-border/30 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Probability: 50.0%</span>
              <strong className="text-brand-400 text-sm font-black font-display">Proportional Pool Split</strong>
            </div>
          </div>

          {/* Exact 7 */}
          <div className="card p-6 border-brand-500/30 bg-[#170e2b]/20 hover:border-brand-500/50 transition-all space-y-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-gradient text-white text-[9px] font-black tracking-widest px-3 py-1 uppercase rounded-bl-xl shadow-lg">
              Hot Odds
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-exact-gradient flex items-center justify-center font-bold text-white border border-brand-500/20">
                =7
              </div>
              <h3 className="font-display font-bold text-lg text-white">Exact 7</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Predict that the wheel lands on segment **7** exactly. Harder to hit, which means fewer winning shares and much higher payouts.
              </p>
            </div>
            <div className="pt-4 border-t border-casino-border/30 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Probability: 8.3%</span>
              <strong className="text-gold-400 text-sm font-black font-display">Proportional Pool Split</strong>
            </div>
          </div>

          {/* Over 7 */}
          <div className="card p-6 border-casino-border/50 hover:border-brand-500/20 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-over-gradient flex items-center justify-center font-bold text-white">
                &gt;7
              </div>
              <h3 className="font-display font-bold text-lg text-white">Over 7</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Predict that the wheel lands on segments **8 through 12** (5 out of 12 numbers total).
              </p>
            </div>
            <div className="pt-4 border-t border-casino-border/30 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Probability: 41.7%</span>
              <strong className="text-brand-400 text-sm font-black font-display">Proportional Pool Split</strong>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-casino-border bg-casino-card/25 py-12 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-casino-border/40 pb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-lg font-black text-white glow-brand">
                7
              </div>
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                7 WHEEL CENTRAL HUB
              </span>
            </div>

            <div className="flex gap-6 text-xs text-slate-400 font-medium">
              <Link to="/privacy-terms" className="hover:text-brand-400 transition-colors">Privacy Policy</Link>
              <Link to="/privacy-terms" className="hover:text-brand-400 transition-colors">Terms of Service</Link>
              <Link to="/privacy-terms" className="hover:text-brand-400 transition-colors">Responsible Gaming</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2.5 p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] text-red-400/80 max-w-md">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>Must be 18+ to play. Outcome wagers carry financial risk. Play responsibly within your limits.</span>
            </div>

            <p className="text-[11px] text-slate-600">
              &copy; 2026 7 Wheel Inc. Secured with industry-standard 256-bit encryption.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
