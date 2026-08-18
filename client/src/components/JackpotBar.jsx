import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Trophy } from 'lucide-react';
import axios from 'axios';

export default function JackpotBar() {
  const [towers, setTowers] = useState([]);

  useEffect(() => {
    fetchJackpotStatus();
    const interval = setInterval(fetchJackpotStatus, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchJackpotStatus = async () => {
    try {
      const res = await axios.get('/api/jackpot/status');
      setTowers(res.data.towers || []);
    } catch (err) {
      console.error('Failed to fetch jackpot status:', err);
    }
  };

  if (towers.length === 0) return null;

  const tierColors = {
    BRONZE: 'from-amber-700 to-amber-900 border-amber-600/50 text-amber-300',
    SILVER: 'from-slate-400 to-slate-600 border-slate-400/50 text-slate-200',
    GOLD:   'from-yellow-400 to-amber-500 border-yellow-300/50 text-yellow-200 shadow-yellow-500/20',
  };

  return (
    <div className="hidden lg:flex items-center gap-3 bg-casino-card/90 border border-casino-border px-3 py-1.5 rounded-2xl">
      <div className="flex items-center gap-1.5 pr-2 border-r border-casino-border text-xs text-gold-400 font-extrabold">
        <Crown size={15} className="animate-bounce" />
        <span>Jackpots</span>
      </div>

      <div className="flex items-center gap-2">
        {towers.map((t) => {
          const percent = Math.min(100, Math.round((t.currentAmount / t.maxAmount) * 100));
          return (
            <div key={t.tier} className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className={`text-[10px] font-black uppercase tracking-wider ${tierColors[t.tier]}`}>
                {t.tier}
              </span>
              <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <span className="text-[11px] font-bold text-white">
                {t.currentAmount.toLocaleString()} Credits
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
