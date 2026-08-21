import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Crown, Shield, Zap, Sparkles, Flame, Gem, Star, Layers,
  Coins, Check, Lock, CheckCircle2, Award, Trophy, ArrowRight,
  Moon, Sun, Infinity, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../hooks/useSounds';
import { formatCredits } from '../utils/format';
import { TitleBadge } from '../utils/cosmetics';

const ICON_MAP = {
  Shield,
  Zap,
  Sparkles,
  Crown,
  Flame,
  Gem,
  Star,
  Layers,
  Coins,
  Trophy,
  Award,
  Moon,
  Sun,
  Infinity,
  ShieldCheck,
};

const RARITY_COLORS = {
  COMMON: 'text-slate-400 bg-slate-800/80 border-slate-700',
  RARE: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40',
  EPIC: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
  LEGENDARY: 'text-fuchsia-300 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]',
  MYTHIC: 'text-yellow-100 bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-600/30 border-amber-300 shadow-[0_0_16px_rgba(253,224,71,0.7)] font-black',
};

export default function CosmeticsShopModal({ isOpen, onClose }) {
  const { user, updateBalance, refreshUser, setShowBuyCreditsModal } = useAuth();
  const { playClick, playWin, playStreak } = useSounds();

  const [activeTab, setActiveTab] = useState('FRAME'); // 'FRAME' | 'TITLE'
  const [catalog, setCatalog] = useState([]);
  const [inventory, setInventory] = useState(['frame_default', 'title_novice']);
  const [equipped, setEquipped] = useState({ frame: 'frame_default', title: 'title_novice' });
  const [loading, setLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);

  // Fetch catalog & user's current inventory
  const fetchShop = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.get('/api/shop/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCatalog(data.catalog);
      setInventory(data.inventory);
      setEquipped(data.equipped);
    } catch (err) {
      console.error('Shop fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShop();
    }
  }, [isOpen]);

  // Handle purchase
  const handleBuy = async (item) => {
    if (user?.balance < item.price) {
      toast.error('Insufficient credits balance!');
      return;
    }

    try {
      setPurchasingId(item.id);
      playClick();
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post(
        '/api/shop/buy',
        { itemId: item.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      playWin();
      toast.success(`🎉 Unlocked "${item.name}"!`);
      setInventory(data.inventory);
      updateBalance(data.balanceAfter);

      // Auto equip on purchase
      await handleEquip(item, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to purchase item.');
    } finally {
      setPurchasingId(null);
    }
  };

  // Handle equip
  const handleEquip = async (item, skipToast = false) => {
    try {
      playStreak();
      const token = localStorage.getItem('7wheel_token');
      const { data } = await axios.post(
        '/api/shop/equip',
        { itemId: item.id, category: item.category },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEquipped(data.equipped);
      await refreshUser();
      if (!skipToast) toast.success(`Equipped ${item.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to equip item.');
    }
  };

  if (!isOpen) return null;

  const filteredItems = catalog.filter((i) => i.category === activeTab);
  const activeFrame = catalog.find((i) => i.id === equipped.frame) || catalog[0];
  const activeTitle = catalog.find((i) => i.id === equipped.title) || catalog[6];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-2xl bg-[#090d16] border-2 border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Crown size={20} />
              </div>
              <div>
                <h2 className="font-display font-black text-base sm:text-lg text-white flex items-center gap-2">
                  VIP Cosmetics & Prestige Shop
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    VIP
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Flex your bankroll with custom neon frames & titles</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Live Avatar Preview Strip */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-purple-950/30 to-slate-950 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3.5">
              {/* Live Preview Avatar */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white relative transition-all duration-300 ${
                activeFrame?.ringEffect || 'ring-1 ring-slate-700'
              } ${activeFrame?.previewClass || 'bg-brand-gradient'}`}>
                {user?.username?.[0]?.toUpperCase()}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-black text-sm text-white">{user?.username}</span>
                  <TitleBadge titleId={equipped?.title} />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Frame: <span className="text-brand-300 font-bold">{activeFrame?.name}</span>
                </p>
              </div>
            </div>

            {/* Balance Pill */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 ml-auto">
              <Coins size={14} className="text-amber-400 shrink-0" />
              <span className="font-display font-bold text-xs text-white">
                {formatCredits(user?.balance)} 🪙
              </span>
            </div>
          </div>

          {/* Tab Filter */}
          <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center gap-2">
            <button
              onClick={() => { playClick(); setActiveTab('FRAME'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FRAME'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={14} />
              Avatar Frames ({catalog.filter(i => i.category === 'FRAME').length})
            </button>

            <button
              onClick={() => { playClick(); setActiveTab('TITLE'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'TITLE'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Award size={14} />
              Prestige Titles ({catalog.filter(i => i.category === 'TITLE').length})
            </button>
          </div>

          {/* Items Grid */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                Loading VIP catalog…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const Icon = ICON_MAP[item.icon] || Sparkles;
                  const isOwned = inventory.includes(item.id);
                  const isEquipped =
                    item.category === 'FRAME'
                      ? equipped.frame === item.id
                      : equipped.title === item.id;
                  const canAfford = user?.balance >= item.price;

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isEquipped
                          ? 'bg-[#151c2e] border-brand-500 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-brand-500/40'
                          : isOwned
                          ? 'bg-[#0f1422] border-slate-800 hover:border-slate-700'
                          : 'bg-[#0b0f19] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Info */}
                      <div className="flex items-start gap-3">
                        {/* Item Icon Box */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          item.previewClass || 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          <Icon size={20} />
                        </div>

                        {/* Title & Description */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display font-bold text-xs text-white truncate block">
                              {item.name}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                              RARITY_COLORS[item.rarity] || 'text-slate-400'
                            }`}>
                              {item.rarity}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.description}</p>

                          {/* Preview Badge for Titles */}
                          {item.category === 'TITLE' && item.badgeText && (
                            <div className="mt-1.5">
                              <TitleBadge titleId={item.id} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action / Buy Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        {isOwned ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Unlocked
                            </span>

                            {isEquipped ? (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/40">
                                Equipped ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => handleEquip(item)}
                                className="text-xs font-bold px-3 py-1 rounded-lg bg-slate-800 hover:bg-brand-500 hover:text-white border border-slate-700 text-slate-200 transition-all active:scale-95"
                              >
                                Equip
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 text-xs font-black text-amber-400 font-display">
                              <Coins size={13} />
                              <span>{item.price.toLocaleString()} Credits</span>
                            </div>

                            <button
                              onClick={() => handleBuy(item)}
                              disabled={purchasingId === item.id || !canAfford}
                              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                                canAfford
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {purchasingId === item.id ? (
                                'Unlocking…'
                              ) : canAfford ? (
                                <>
                                  <Sparkles size={12} />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <Lock size={12} />
                                  Need Credits
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Promo */}
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Cosmetics apply instantly across all tables & games.</span>
            <button
              onClick={() => {
                onClose();
                setShowBuyCreditsModal(true);
              }}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Get More Credits <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
