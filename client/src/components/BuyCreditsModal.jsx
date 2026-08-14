import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Lock, Zap, Star, Crown, Gem, ShieldCheck, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const PACKS = [
  {
    id: 'starter',
    label: 'Starter Pack',
    credits: 500,
    bonusCredits: 0,
    priceUSD: 4.99,
    popular: false,
    badge: null,
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/30',
    borderColor: 'hover:border-blue-500/50',
    activeBorder: 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500',
    description: 'Casual fun play',
  },
  {
    id: 'popular',
    label: 'Popular Pack',
    credits: 1500,
    bonusCredits: 200,
    priceUSD: 9.99,
    popular: true,
    badge: '🔥 BEST VALUE',
    icon: Star,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10 border-yellow-500/30',
    borderColor: 'hover:border-yellow-500/50',
    activeBorder: 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500',
    description: 'Most popular choice',
  },
  {
    id: 'highroller',
    label: 'High Roller',
    credits: 5000,
    bonusCredits: 1000,
    priceUSD: 24.99,
    popular: false,
    badge: '+20% EXTRA',
    icon: Crown,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10 border-orange-500/30',
    borderColor: 'hover:border-orange-500/50',
    activeBorder: 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500',
    description: 'For serious streak builders',
  },
  {
    id: 'vip',
    label: 'VIP Platinum',
    credits: 15000,
    bonusCredits: 5000,
    priceUSD: 49.99,
    popular: false,
    badge: '👑 VIP 33% BONUS',
    icon: Gem,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/30',
    borderColor: 'hover:border-purple-500/50',
    activeBorder: 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500',
    description: 'Ultimate high stakes pool',
  },
];

// Format Card Number (adds spaces every 4 digits)
const formatCardNumber = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length > 0 ? parts.join(' ') : v;
};

// Format Expiry (MM/YY)
const formatExpiry = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
  return v;
};

const BuyCreditsModal = () => {
  const { purchaseCredits, showBuyCreditsModal, setShowBuyCreditsModal } = useAuth();

  const [selectedPack, setSelectedPack] = useState('popular');
  const [submitting, setSubmitting] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '', postal: '' });

  if (!showBuyCreditsModal) return null;

  const pack = PACKS.find((p) => p.id === selectedPack);
  const totalCredits = (pack?.credits || 0) + (pack?.bonusCredits || 0);

  const isCardValid = () =>
    card.number.replace(/\s/g, '').length === 16 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvc.length === 3 &&
    card.name.trim().length > 2 &&
    card.postal.trim().length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCardValid()) return;
    setSubmitting(true);
    try {
      // Simulate secure payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const data = await purchaseCredits({
        packId: selectedPack,
        paymentMethod: 'CARD',
        paymentDetails: {
          cardNumber: card.number.replace(/\s/g, ''),
          cardExpiry: card.expiry,
          cardCvc: card.cvc,
          cardName: card.name,
        },
      });
      toast.success(`🎉 Payment Successful! +${data.creditsPurchased.toLocaleString()} credits added!`, { duration: 4000 });
      setCard({ number: '', expiry: '', cvc: '', name: '', postal: '' });
      setShowBuyCreditsModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Please check card details.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {showBuyCreditsModal && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => !submitting && setShowBuyCreditsModal(false)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="relative card max-w-lg w-full border border-slate-800 bg-slate-950 shadow-[0_0_60px_rgba(168,85,247,0.25)] rounded-3xl flex flex-col max-h-[90vh] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-inner">
                  🪙
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-white leading-none">Get Virtual Credits</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-none">Instant Refill · Played Strictly for Fun</p>
                </div>
              </div>
              <button
                onClick={() => !submitting && setShowBuyCreditsModal(false)}
                disabled={submitting}
                className="text-slate-400 hover:text-white transition-colors p-1 disabled:opacity-30"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* Credit Pack Selector Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select a Credit Pack</label>
                  <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles size={12} /> Up to 33% Bonus Credits
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PACKS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = selectedPack === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => setSelectedPack(p.id)}
                        className={`relative rounded-2xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                          isSelected ? p.activeBorder : `bg-slate-900/60 border-slate-800 ${p.borderColor}`
                        } disabled:opacity-50`}
                      >
                        {p.badge && (
                          <span className="absolute -top-2.5 right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                            {p.badge}
                          </span>
                        )}

                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${p.iconBg}`}>
                            <Icon size={16} className={p.iconColor} />
                          </div>
                          {isSelected && <Check size={16} className="text-amber-400" />}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-300">{p.label}</p>
                          <p className="text-[13px] font-black text-white mt-0.5">
                            {p.credits.toLocaleString()} 🪙
                          </p>
                          {p.bonusCredits > 0 && (
                            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                              +{p.bonusCredits.toLocaleString()} BONUS
                            </p>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-400">${p.priceUSD} USD</span>
                          <span className="text-[10px] text-slate-500">Instant</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Summary Card */}
              {pack && (
                <motion.div
                  key={selectedPack}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-brand-500/30 rounded-2xl p-4 shadow-lg"
                >
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">You will receive</p>
                    <p className="font-display font-black text-xl text-white">
                      {totalCredits.toLocaleString()} <span className="text-amber-400">Credits 🪙</span>
                    </p>
                    {pack.bonusCredits > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        🎁 Includes {pack.bonusCredits.toLocaleString()} free bonus credits!
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400 font-medium">Total Price</p>
                    <p className="font-display font-black text-2xl text-white">${pack.priceUSD}</p>
                    <p className="text-[10px] text-slate-500">USD · Instant Delivery</p>
                  </div>
                </motion.div>
              )}

              {/* Payment Card Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                  
                  {/* Stripe Security Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Lock size={12} className="text-emerald-400" />
                      256-Bit Encrypted Payment
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center -space-x-1.5">
                        <div className="w-4 h-4 rounded-full bg-red-500 opacity-90" />
                        <div className="w-4 h-4 rounded-full bg-yellow-400 opacity-80" />
                      </div>
                      <span className="font-black text-[10px] italic text-blue-400">VISA</span>
                      <span className="text-[9px] text-slate-500 font-mono">Stripe</span>
                    </div>
                  </div>

                  {/* Card Number Input */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">CARD NUMBER</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="19"
                      required
                      disabled={submitting}
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      placeholder="4532 1098 7654 3210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono tracking-widest"
                    />
                  </div>

                  {/* Expiry, CVC & Zip */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">EXPIRY</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="5"
                        required
                        disabled={submitting}
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        placeholder="MM/YY"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-center text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">CVC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="3"
                        required
                        disabled={submitting}
                        value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="123"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-center text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">POSTAL CODE</label>
                      <input
                        type="text"
                        maxLength="7"
                        required
                        disabled={submitting}
                        value={card.postal}
                        onChange={(e) => setCard({ ...card, postal: e.target.value.toUpperCase() })}
                        placeholder="90210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-center text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">CARDHOLDER NAME</label>
                    <input
                      type="text"
                      disabled={submitting}
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                      required
                    />
                  </div>
                </div>

                {/* Submit Action Button */}
                <motion.button
                  type="submit"
                  disabled={submitting || !isCardValid()}
                  whileHover={isCardValid() ? { scale: 1.01 } : {}}
                  whileTap={isCardValid() ? { scale: 0.98 } : {}}
                  className="w-full py-4 px-6 rounded-2xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/25 border border-amber-400/40 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      <span>Pay ${pack?.priceUSD} USD — Get {totalCredits.toLocaleString()} Credits</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Legal Social Gaming Disclaimer */}
              <div className="flex gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  <strong className="text-slate-300">Social Gaming Disclaimer:</strong> Virtual credits have no cash value and cannot be withdrawn or exchanged for real money. Played strictly for fun and entertainment.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BuyCreditsModal;
