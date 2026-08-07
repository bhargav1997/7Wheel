import { motion } from 'framer-motion';
import { Users, Coins, Activity, Trophy } from 'lucide-react';
import Navbar from '../components/Navbar';
import Wheel from '../components/Wheel';
import BettingBoard from '../components/BettingBoard';
import Leaderboard from '../components/Leaderboard';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-display font-bold text-white">{value}</p>
    </div>
  </div>
);

const GameHub = () => {
  const { gameState, connected, isKicked } = useSocket();
  const { user } = useAuth();
  const { playerCount, pot, bettorCount, roundNumber, status, winners } = gameState;

  // Check if current user bet in this round to display win/loss/refund result
  const myResult = winners?.find((w) => w.username === user?.username);

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 relative">
        {/* Win/Lose/Refund Result overlay */}
        {status === 'RESULT' && myResult && (
          <div className="absolute inset-0 bg-casino-dark/85 backdrop-blur-sm z-40 flex items-center justify-center p-4 rounded-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`card p-8 max-w-sm w-full text-center space-y-6 shadow-2xl ${
                myResult.won
                  ? 'border-emerald-500/30 glow-green'
                  : myResult.refund > 0
                  ? 'border-blue-500/30 glow-blue'
                  : 'border-red-500/30 glow-red'
              }`}
            >
              {myResult.won ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 text-3xl font-black">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-3xl text-emerald-400">YOU WIN</h3>
                    <p className="text-slate-400 text-sm">Congratulations on your victory!</p>
                  </div>
                  <div className="text-4xl font-display font-black text-gold-400">
                    +${myResult.payout.toFixed(2)}
                  </div>
                </>
              ) : myResult.refund > 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center mx-auto text-blue-400 text-3xl font-black">
                    ↺
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-3xl text-blue-400">REFUNDED</h3>
                    <p className="text-slate-400 text-sm">No winners. 90% stake returned.</p>
                  </div>
                  <div className="text-4xl font-display font-black text-slate-300">
                    +${myResult.refund.toFixed(2)}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto text-red-400 text-3xl font-black">
                    ✕
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-3xl text-red-400">YOU LOSE</h3>
                    <p className="text-slate-400 text-sm">Better luck next round!</p>
                  </div>
                  <p className="text-xs text-slate-500">The wheel landed on {gameState.result}</p>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Kicked overlay */}
        {isKicked && (
          <div className="absolute inset-0 bg-casino-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-4 rounded-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-8 max-w-md w-full text-center border-brand-500/30 space-y-6 glow-brand"
            >
              <div className="w-16 h-16 rounded-full bg-brand-gradient flex items-center justify-center mx-auto text-white text-3xl font-black">
                !
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-2xl text-white">Session Closed</h3>
                <p className="text-slate-400 text-sm">
                  You have logged in or opened the lobby from another tab or window. This session is now inactive to avoid duplicate entries.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Use This Tab Instead
              </button>
            </motion.div>
          </div>
        )}

        {/* Offline warning */}
        {!connected && !isKicked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 card p-3 border border-amber-500/30 bg-amber-500/10
                       flex items-center gap-2 text-amber-400 text-sm"
          >
            <Activity size={14} />
            Connecting to game server… please wait.
          </motion.div>
        )}



        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <StatCard
            icon={Users}
            label="Players Online"
            value={playerCount}
            color="bg-brand-gradient"
          />
          <StatCard
            icon={Coins}
            label="Current Pot"
            value={`$${pot.toFixed(2)}`}
            color="bg-gold-gradient"
          />
          <StatCard
            icon={Activity}
            label="Round"
            value={roundNumber > 0 ? `#${roundNumber}` : '—'}
            color="bg-under-gradient"
          />
        </motion.div>

        {/* Main game layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Wheel (takes 2 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 card p-6 flex flex-col items-center justify-center min-h-[480px]"
          >
            <h2 className="font-display font-bold text-xl text-white mb-6 w-full text-left">
              The Wheel
            </h2>
            <Wheel />
          </motion.div>

          {/* Right: Betting + Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div>
              <h2 className="font-display font-bold text-xl text-white mb-4">
                Betting Board
              </h2>
              <BettingBoard />
            </div>

            <div>
              <h2 className="font-display font-bold text-xl text-white mb-4">
                Leaderboard
              </h2>
              <Leaderboard />
            </div>
          </motion.div>
        </div>

        {/* Player roster */}
        {gameState.players.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 card p-5"
          >
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={16} className="text-brand-400" />
              Players in Lobby ({playerCount})
            </h3>
            <div className="flex flex-wrap gap-2">
              {gameState.players.map((p) => (
                <div
                  key={p.username}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border
                    ${p.username === user?.username
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                      : 'border-casino-border bg-casino-muted text-slate-300'}
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${p.hasBet ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  {p.username}
                  {p.username === user?.username && (
                    <span className="text-xs text-brand-500">(you)</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Green dot = bet placed · Game starts with 4+ players
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default GameHub;
