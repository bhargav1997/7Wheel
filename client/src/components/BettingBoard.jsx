import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, Hash, TrendingUp, AlertCircle, CheckCircle, Clock, Users, Coins } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const BET_OPTIONS = [
  {
    id: 'UNDER_7',
    label: 'Under 7',
    range: '1 – 6',
    icon: TrendingDown,
    gradient: 'from-blue-600 to-blue-800',
    border: 'border-blue-500',
    glow: 'glow-blue',
    ringColor: 'ring-blue-500',
    textColor: 'text-blue-400',
    bgHover: 'hover:bg-blue-500/10',
  },
  {
    id: 'EXACT_7',
    label: 'Exact 7',
    range: '7',
    icon: Hash,
    gradient: 'from-emerald-600 to-emerald-800',
    border: 'border-emerald-500',
    glow: 'glow-green',
    ringColor: 'ring-emerald-500',
    textColor: 'text-emerald-400',
    bgHover: 'hover:bg-emerald-500/10',
  },
  {
    id: 'OVER_7',
    label: 'Over 7',
    range: '8 – 12',
    icon: TrendingUp,
    gradient: 'from-red-600 to-red-800',
    border: 'border-red-500',
    glow: 'glow-red',
    ringColor: 'ring-red-500',
    textColor: 'text-red-400',
    bgHover: 'hover:bg-red-500/10',
  },
];

const BettingBoard = ({ onInsufficientCredits }) => {
  const { gameState, myBet, betError, setBetError, placeBet } = useSocket();
  const { user } = useAuth();
  const balance = user?.balance ?? 0;
  const { status, timeLeft, pot, bettorCount, playerCount } = gameState;

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [betAmount, setBetAmount] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  // Reset on new round
  useEffect(() => {
    if (status === 'WAITING_FOR_PLAYERS') {
      setSelectedChoice(null);
      setBetAmount('10');
      setSubmitting(false);
    }
  }, [status]);

  const isBettingActive = status === 'WAITING_FOR_PLAYERS' || status === 'BETTING';
  const isCountdownActive = status === 'BETTING';
  const alreadyBet     = !!myBet;
  const canBet         = isBettingActive && !alreadyBet && !submitting;

  const handleSubmit = async () => {
    if (!selectedChoice || !canBet) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) {
      setBetError('Minimum bet is 1 credit');
      return;
    }
    if (amount > balance) {
      onInsufficientCredits?.();
      return;
    }
    setSubmitting(true);
    placeBet({ amount, choice: selectedChoice });
    setTimeout(() => setSubmitting(false), 1500);
  };

  // Timer circle
  const timerPercent = isCountdownActive ? (timeLeft / 30) * 100 : 0;
  const circumference = 2 * Math.PI * 24;
  const strokeDashoffset = circumference - (timerPercent / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="card p-4">
        {status === 'WAITING_FOR_PLAYERS' && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3 text-slate-400">
                <Users size={16} />
                <span className="text-sm font-medium">Waiting for players to place bets…</span>
              </div>
              <p className="text-xs text-slate-500">
                Round starts when 4+ players place a bet (Bettors: {bettorCount})
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Pot</p>
              <p className="font-display font-bold text-gold-400 text-lg">{Math.round(pot).toLocaleString()} Credits</p>
            </div>
          </div>
        )}

        {isCountdownActive && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg width="56" height="56" className="-rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1f1f30" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke={timeLeft <= 10 ? '#ef4444' : '#f59e0b'}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center font-display font-bold text-sm
                  ${timeLeft <= 10 ? 'text-red-400' : 'text-gold-400'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Time remaining</p>
                <p className="font-semibold text-white">Place your bet!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Pot</p>
              <p className="font-display font-bold text-gold-400 text-lg">{Math.round(pot).toLocaleString()} Credits</p>
              <p className="text-xs text-slate-500">{bettorCount} / {playerCount} bet</p>
            </div>
          </div>
        )}

        {status === 'SPINNING' && (
          <div className="flex items-center gap-3 justify-center py-2">
            <motion.div
              className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-brand-400 font-semibold">Spinning… no more bets!</span>
          </div>
        )}

        {status === 'RESULT' && (
          <div className="flex items-center gap-3 justify-center py-2">
            <CheckCircle size={18} className="text-emerald-400" />
            <span className="text-emerald-400 font-semibold">Round complete! Next round starting…</span>
          </div>
        )}
      </div>

      {/* Bet choice buttons */}
      <div className="grid grid-cols-3 gap-3">
        {BET_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedChoice === opt.id;
          const isMyBetChoice = myBet?.choice === opt.id;

          return (
            <motion.button
              key={opt.id}
              id={`bet-${opt.id.toLowerCase()}`}
              onClick={() => canBet && setSelectedChoice(opt.id)}
              disabled={!canBet}
              whileHover={canBet ? { scale: 1.03 } : {}}
              whileTap={canBet ? { scale: 0.97 } : {}}
              className={`relative card p-4 text-center transition-all duration-200 cursor-pointer
                flex flex-col items-center gap-2 border-2
                ${isMyBetChoice
                  ? `border-2 ${opt.border} ${opt.glow} bg-gradient-to-br ${opt.gradient}/30`
                  : isSelected
                  ? `${opt.border} bg-gradient-to-br ${opt.gradient}/20`
                  : 'border-casino-border hover:border-opacity-60'}
                ${!canBet ? 'opacity-50 cursor-not-allowed' : opt.bgHover}
              `}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.gradient}
                              flex items-center justify-center
                              ${isSelected || isMyBetChoice ? 'shadow-lg' : ''}`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <p className="font-display font-bold text-white text-sm">{opt.label}</p>
                <p className="text-xs text-slate-500">{opt.range}</p>
              </div>
              {isMyBetChoice && (
                <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full
                                bg-emerald-500 flex items-center justify-center`}>
                  <CheckCircle size={12} className="text-white" />
                </div>
              )}
              {isSelected && !isMyBetChoice && (
                <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full
                                border-2 ${opt.border} bg-casino-card`} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Amount input + Submit */}
      {isBettingActive && !alreadyBet && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 space-y-4"
        >
          <div>
            <label htmlFor="bet-amount" className="block text-xs text-slate-400 mb-2">
              Bet Amount (10 credits minimum)
            </label>
            <div className="relative">
              <Coins size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400" />
              <input
                id="bet-amount"
                type="number"
                min="1"
                step="1"
                value={betAmount}
                onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
                className="input-field pl-8"
                placeholder="10"
                disabled={!canBet}
              />
            </div>
            {/* Quick amounts */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {[10, 25, 50, 100, 250].map((v) => (
                <button
                  key={v}
                  onClick={() => setBetAmount(String(v))}
                  className="flex-1 min-w-[2.5rem] text-xs py-1.5 rounded-lg bg-casino-muted border border-casino-border
                             text-slate-400 hover:text-white hover:border-brand-500 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {betError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm"
              >
                <AlertCircle size={14} />
                {betError}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            id="place-bet-btn"
            onClick={handleSubmit}
            disabled={!canBet || !selectedChoice || submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                Placing bet…
              </>
            ) : (
              <>
                <Coins size={16} />
                Place Bet
                {selectedChoice && betAmount && ` — ${betAmount} Credits`}
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Already bet confirmation */}
      {alreadyBet && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-4 border border-emerald-500/30 bg-emerald-500/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Bet Placed!</p>
              <p className="text-sm text-slate-400">
                {myBet.amount.toLocaleString()} Credits on{' '}
                <span className="font-semibold text-emerald-400">
                  {myBet.choice.replace('_', ' ')}
                </span>
              </p>
            </div>
          </div>
          {isBettingActive && (
            <p className="text-xs text-slate-500 mt-3">
              Waiting for {Math.max(0, 4 - bettorCount)} more player{4 - bettorCount !== 1 ? 's' : ''} to bet…
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BettingBoard;
