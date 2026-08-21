import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CreditCard, Lock, Zap, Star, Crown, Gem, ShieldCheck,
  Check, Sparkles, Coins, Gift
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatCredits } from '../utils/format';

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
    activeBorder: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.25)]',
    description: 'Casual fun play',
  },
  {
    id: 'popular',
    label: 'Popular Pack',
    credits: 1500,
    bonusCredits: 200,
    priceUSD: 9.99,
    popular: true,
    badge: 'BEST VALUE',
    icon: Star,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/30',
    borderColor: 'hover:border-amber-500/50',
    activeBorder: 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
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
    activeBorder: 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.25)]',
    description: 'For serious streak builders',
  },
  {
    id: 'vip',
    label: 'VIP Platinum',
    credits: 15000,
    bonusCredits: 5000,
    priceUSD: 49.99,
    popular: false,
    badge: '+33% VIP BONUS',
    icon: Gem,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/30',
    borderColor: 'hover:border-purple-500/50',
    activeBorder: 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.25)]',
    description: 'Ultimate high stakes pool',
  },
];

// Format Card Number (auto space every 4 digits)
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

// Detect Card Brand for Visual Badge
const getCardBrand = (number) => {
  const clean = number.replace(/\s/g, '');
  if (clean.startsWith('4')) return 'VISA';
  if (clean.startsWith('5') || clean.startsWith('2')) return 'MASTERCARD';
  if (clean.startsWith('34') || clean.startsWith('37')) return 'AMEX';
  if (clean.startsWith('6')) return 'DISCOVER';
  return null;
};

const BuyCreditsModal = () => {
  const { user, purchaseCredits, showBuyCreditsModal, setShowBuyCreditsModal } = useAuth();

  const [selectedPack, setSelectedPack] = useState('popular');
  const [submitting, setSubmitting] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '', postal: '' });

  if (!showBuyCreditsModal) return null;

  const pack = PACKS.find((p) => p.id === selectedPack);
  const totalCredits = (pack?.credits || 0) + (pack?.bonusCredits || 0);
  const cardBrand = getCardBrand(card.number);

  const isCardValid = () =>
    card.number.replace(/\s/g, '').length === 16 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvc.length === 3 &&
    card.name.trim().length > 2 &&
    card.postal.trim().length >= 3;

  // 1-Click Demo Fill for Quick Testing
  const handleFillDemoCard = () => {
    setCard({
      number: '4532 8901 2345 6789',
      expiry: '12/28',
      cvc: '777',
      name: user?.username ? `${user.username.toUpperCase()} VIP` : 'ALEX MORGAN',
      postal: '90210',
    });
    toast.success('⚡ Test card details loaded!', { icon: '💳' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCardValid()) return;

    setSubmitting(true);
    try {
      // Simulate realistic payment gateway processing
      await new Promise((resolve) => setTimeout(resolve, 1400));
      
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
      toast.error(err.response?.data?.message || 'Payment failed. Please verify your card details.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {showBuyCreditsModal && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4"
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
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative card max-w-lg w-full border border-slate-800 bg-[#090910] shadow-[0_0_60px_rgba(168,85,247,0.3)] rounded-3xl flex flex-col max-h-[92vh] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Ambient Gradient */}
            <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-purple-950/40 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Coins size={24} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg sm:text-xl text-white leading-none flex items-center gap-2">
                    Acquire Game Credits
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-none font-medium">
                    Instant Delivery · Provably Fair Platform
                  </p>
                </div>
              </div>
              <button
                onClick={() => !submitting && setShowBuyCreditsModal(false)}
                disabled={submitting}
                className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-30"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 no-scrollbar">

              {/* Live Balance Banner */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Coins size={15} className="text-amber-400" />
                  <span className="text-xs text-slate-300 font-bold">Current Balance:</span>
                </div>
                <span className="font-display font-black text-sm text-white tabular-nums">
                  {formatCredits(user?.balance)} Credits
                </span>
              </div>
              
              {/* Credit Pack Selector Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">
                    Select a Credit Pack
                  </label>
                  <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles size={12} /> Up to +33% Free Bonus
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {PACKS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = selectedPack === p.id;
                    const totalPackCredits = p.credits + p.bonusCredits;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => setSelectedPack(p.id)}
                        className={`relative rounded-2xl border p-3 sm:p-3.5 text-left transition-all flex flex-col justify-between ${
                          isSelected ? p.activeBorder : `bg-slate-900/60 border-slate-800/90 ${p.borderColor}`
                        } disabled:opacity-50 group`}
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
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
                              <Check size={12} className="stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-300">{p.label}</p>
                          <p className="font-display font-black text-sm sm:text-base text-white mt-0.5 flex items-center gap-1">
                            {totalPackCredits.toLocaleString()} <Coins size={13} className="text-amber-400" />
                          </p>
                          {p.bonusCredits > 0 ? (
                            <p className="text-[10px] text-emerald-400 font-extrabold mt-0.5">
                              +{p.bonusCredits.toLocaleString()} FREE BONUS
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              Standard Tier
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="font-display font-black text-xs sm:text-sm text-amber-400">
                            ${p.priceUSD} USD
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">Instant</span>
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
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-slate-900 to-purple-950/40 border border-brand-500/40 rounded-2xl p-3.5 shadow-lg"
                >
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-slate-400 font-medium">Allocation Summary</p>
                    <p className="font-display font-black text-lg sm:text-xl text-white flex items-center gap-1.5">
                      {totalCredits.toLocaleString()} <span className="text-amber-400 font-bold flex items-center gap-1">Credits <Coins size={15} /></span>
                    </p>
                    {pack.bonusCredits > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Gift size={11} /> Includes {pack.bonusCredits.toLocaleString()} complimentary bonus credits!
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400 font-medium">Checkout Total</p>
                    <p className="font-display font-black text-xl sm:text-2xl text-amber-400">${pack.priceUSD}</p>
                    <p className="text-[10px] text-slate-500 font-medium">USD · No extra fees</p>
                  </div>
                </motion.div>
              )}

              {/* Card Payment Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                <div className="p-3.5 sm:p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                  
                  {/* Stripe Security & 1-Click Demo Fill Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Lock size={13} className="text-emerald-400" />
                      <span>256-Bit Encrypted Card Checkout</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleFillDemoCard}
                      className="text-[10px] font-extrabold text-brand-300 hover:text-brand-200 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1"
                      title="Auto fill test card for quick demo"
                    >
                      <Zap size={11} />
                      <span>Fill Test Card</span>
                    </button>
                  </div>

                  {/* Card Number Input with Brand Icon */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Card Number</label>
                      {cardBrand && (
                        <span className="text-[9px] font-black tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          {cardBrand}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="19"
                        required
                        disabled={submitting}
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                        placeholder="4532 8901 2345 6789"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono tracking-widest"
                      />
                      <CreditCard size={16} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Expiry, CVC & Zip */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-extrabold uppercase">Expiry</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="5"
                        required
                        disabled={submitting}
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        placeholder="MM/YY"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-center text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-extrabold uppercase">CVC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="3"
                        required
                        disabled={submitting}
                        value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="777"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-center text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-extrabold uppercase">Zip / Postal</label>
                      <input
                        type="text"
                        maxLength="7"
                        required
                        disabled={submitting}
                        value={card.postal}
                        onChange={(e) => setCard({ ...card, postal: e.target.value.toUpperCase() })}
                        placeholder="90210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2.5 text-center text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-extrabold uppercase">Cardholder Name</label>
                    <input
                      type="text"
                      disabled={submitting}
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      placeholder="Alex Morgan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-medium uppercase"
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
                  className="w-full py-3.5 sm:py-4 px-6 rounded-2xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/25 border border-amber-400/40 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Allocating Credits…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      <span>Pay ${pack?.priceUSD} USD — Get {totalCredits.toLocaleString()} Credits</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Social Gaming Compliance Disclaimer */}
              <div className="flex gap-2 p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  <strong className="text-slate-300">Social Gaming Disclaimer:</strong> Game credits are strictly virtual entertainment tokens for social play. They have no real cash value and cannot be withdrawn or exchanged for real currency.
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
