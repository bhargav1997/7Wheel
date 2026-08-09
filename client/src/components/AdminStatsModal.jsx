import { useState, useEffect } from 'react';
import { X, RefreshCw, BarChart2, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const AdminStatsModal = () => {
  const { showAdminStats, setShowAdminStats } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/wallet/admin/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load admin statistics');
      setShowAdminStats(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showAdminStats) {
      fetchStats();
    }
  }, [showAdminStats]);

  if (!showAdminStats) return null;

  return (
    <div className="fixed inset-0 bg-casino-dark/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        className="card max-w-lg w-full overflow-hidden border border-brand-500/20 shadow-2xl relative flex flex-col glow-brand"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-casino-border bg-casino-card">
          <div className="flex items-center gap-2">
            <Shield className="text-brand-400" size={18} />
            <h3 className="font-display font-bold text-base text-white">Platform Admin Panel</h3>
          </div>
          <button
            onClick={() => setShowAdminStats(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-xs font-semibold">Compiling financial aggregates...</p>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Main Margin Card */}
              <div className="bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-purple-950/20 border border-brand-500/30 rounded-2xl p-5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-gradient opacity-80" />
                <p className="text-[10px] text-brand-400 uppercase tracking-widest font-black">Platform Credit Earnings (Credits)</p>
                <h4 className="font-display font-black text-4xl mt-1 tracking-tight bg-gradient-to-r from-gold-300 via-amber-400 to-gold-300 bg-clip-text text-transparent drop-shadow-md">
                  {Math.round(stats.platformEarnings).toLocaleString()} 🪙
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Commission (3.5% edge) + credits retained from no-winner rounds.
                </p>
              </div>

              {/* Aggregates grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Real Revenue */}
                <div className="bg-[#111118] border border-casino-border rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Real Revenue (USD)</span>
                  <p className="font-display font-bold text-emerald-400 text-lg">
                    ${stats.totalRevenue?.toFixed(2) ?? '0.00'}
                  </p>
                </div>
                {/* Credits Sold */}
                <div className="bg-[#111118] border border-casino-border rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Credits Sold</span>
                  <p className="font-display font-bold text-white text-lg">
                    {(stats.totalCreditsSold ?? 0).toLocaleString()} 🪙
                  </p>
                </div>
                {/* Total Wagered */}
                <div className="bg-[#111118] border border-casino-border rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Credits Wagered</span>
                  <p className="font-display font-bold text-white text-lg">
                    {Math.round(stats.totalWagered ?? 0).toLocaleString()} 🪙
                  </p>
                </div>
                {/* Total Users */}
                <div className="bg-[#111118] border border-casino-border rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Users</span>
                  <p className="font-display font-bold text-white text-lg">
                    {stats.totalUsers ?? 0}
                  </p>
                </div>
              </div>

              {/* Additional Stats Row */}
              <div className="flex items-center justify-between p-4 bg-casino-card border border-casino-border rounded-xl">
                <div className="flex items-center gap-2">
                  <BarChart2 className="text-slate-400" size={16} />
                  <span className="text-xs text-slate-400">Total Completed Rounds</span>
                </div>
                <span className="font-display font-black text-white text-base">
                  {stats.totalRounds}
                </span>
              </div>
            </div>
          ) : null}

          {/* Footer controls */}
          <div className="flex gap-3 justify-end pt-4 border-t border-casino-border/50">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="py-2.5 px-4 bg-casino-muted border border-casino-border hover:text-white rounded-xl text-slate-400 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Reload Aggregates
            </button>
            <button
              onClick={() => setShowAdminStats(false)}
              className="py-2.5 px-4 bg-brand-gradient hover:opacity-90 rounded-xl text-white font-bold text-xs transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsModal;
