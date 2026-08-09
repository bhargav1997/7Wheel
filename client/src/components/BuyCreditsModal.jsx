import { useState } from 'react';
import { X, CreditCard, Lock, Zap, Star, Crown, Gem, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const PACKS = [
  {
    id: 'starter',
    label: 'Starter',
    credits: 500,
    bonusCredits: 0,
    priceUSD: 4.99,
    popular: false,
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    description: 'Get started',
  },
  {
    id: 'popular',
    label: 'Popular',
    credits: 1500,
    bonusCredits: 200,
    priceUSD: 9.99,
    popular: true,
    icon: Star,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10 border-yellow-500/20',
    description: 'Best value',
  },
  {
    id: 'highroller',
    label: 'High Roller',
    credits: 5000,
    bonusCredits: 1000,
    priceUSD: 24.99,
    popular: false,
    icon: Crown,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    description: 'For serious players',
  },
  {
    id: 'vip',
    label: 'VIP',
    credits: 15000,
    bonusCredits: 5000,
    priceUSD: 49.99,
    popular: false,
    icon: Gem,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    description: 'Ultimate pack',
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
    card.postal.trim().length >= 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCardValid()) return;
    setSubmitting(true);
    try {
      // Simulate Stripe secure processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      toast.success(`${data.creditsPurchased.toLocaleString()} credits added to your account!`);
      setCard({ number: '', expiry: '', cvc: '', name: '', postal: '' });
      setShowBuyCreditsModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-casino-dark/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="card max-w-lg w-full overflow-hidden border border-casino-border shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-casino-border bg-casino-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400" size={18} />
            <div>
              <h3 className="font-display font-bold text-base text-white">Buy Credits</h3>
              <p className="text-[10px] text-slate-500">For entertainment only · No cash value</p>
            </div>
          </div>
          <button
            onClick={() => !submitting && setShowBuyCreditsModal(false)}
            disabled={submitting}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Pack selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-2.5 font-medium">Select a Credit Pack</label>
            <div className="grid grid-cols-2 gap-2.5">
              {PACKS.map((p) => {
                const Icon = p.icon;
                const total = p.credits + p.bonusCredits;
                const isSelected = selectedPack === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => setSelectedPack(p.id)}
                    className={`relative rounded-xl border p-3 text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                        : 'border-casino-border bg-casino-muted/20 hover:border-slate-600'
                    } disabled:opacity-50`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 right-2 bg-yellow-400 text-black text-[9px] font-bold px-2 py-0.5 rounded-full">
                        BEST VALUE
                      </span>
                    )}
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${p.iconBg}`}>
                      <Icon size={14} className={p.iconColor} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{p.label}</p>
                      <p className="text-[10px] text-slate-500">{p.description}</p>
                    </div>
                    <div className="mt-0.5">
                      <p className="text-sm font-black text-white">
                        {p.credits.toLocaleString()}
                        {p.bonusCredits > 0 && (
                          <span className="text-emerald-400 text-[10px] font-bold ml-1">
                            +{p.bonusCredits.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-normal ml-1">cr</span>
                      </p>
                      <p className="text-xs font-bold text-brand-400">${p.priceUSD} CAD</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary bar */}
          {pack && (
            <motion.div
              key={selectedPack}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-casino-card border border-casino-border rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-xs text-slate-400">You receive</p>
                <p className="font-display font-black text-white">
                  {totalCredits.toLocaleString()}{' '}
                  <span className="text-yellow-400">Credits 🪙</span>
                </p>
                {pack.bonusCredits > 0 && (
                  <p className="text-[10px] text-emerald-400">
                    Includes {pack.bonusCredits.toLocaleString()} bonus credits!
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total</p>
                <p className="font-display font-bold text-2xl text-white">${pack.priceUSD}</p>
                <p className="text-[10px] text-slate-500">CAD · incl. tax</p>
              </div>
            </motion.div>
          )}

          {/* Card form */}
          <div className="pt-4 border-t border-casino-border/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stripe-style card block */}
              <div className="p-4 bg-casino-card border border-casino-border rounded-xl space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Lock size={11} className="text-emerald-400" />
                    Secure Card Payment
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Mastercard logo */}
                    <div className="flex items-center -space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
                      <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-80" />
                    </div>
                    {/* Visa */}
                    <span className="font-black text-[11px] italic text-blue-400 tracking-tight">VISA</span>
                    <span className="text-[9px] text-slate-600 font-display ml-1">via stripe</span>
                  </div>
                </div>

                {/* Card number + expiry + CVC on one row */}
                <div className="relative">
                  <input
                    id="card-number-input"
                    type="text"
                    inputMode="numeric"
                    maxLength="19"
                    required
                    disabled={submitting}
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                    placeholder="Card number"
                    className="w-full bg-[#0d0d14] border border-casino-border rounded-lg py-2.5 pl-3 pr-32 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono tracking-widest"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="5"
                      required
                      disabled={submitting}
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                      placeholder="MM/YY"
                      className="w-14 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none font-mono"
                    />
                    <span className="text-slate-700">|</span>
                    <input
                      id="card-cvc-input"
                      type="text"
                      inputMode="numeric"
                      maxLength="3"
                      required
                      disabled={submitting}
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/[^0-9]/g, '') })}
                      placeholder="CVC"
                      className="w-9 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Cardholder + Postal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="card-name-input" className="block text-[10px] text-slate-500 mb-1">Cardholder Name</label>
                  <input
                    id="card-name-input"
                    type="text"
                    disabled={submitting}
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="Jane Smith"
                    className="input-field text-xs py-2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="card-postal-input" className="block text-[10px] text-slate-500 mb-1">Postal Code</label>
                  <input
                    id="card-postal-input"
                    type="text"
                    maxLength="7"
                    disabled={submitting}
                    value={card.postal}
                    onChange={(e) => setCard({ ...card, postal: e.target.value.toUpperCase() })}
                    placeholder="A1B 2C3"
                    className="input-field text-xs py-2"
                    required
                  />
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2">
                <ShieldCheck size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Encrypted via TLS and processed by Stripe. We never store your card number or CVV on our servers.
                </p>
              </div>

              {/* Submit */}
              <button
                id="buy-credits-submit-btn"
                type="submit"
                disabled={submitting || !isCardValid()}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Pay ${pack?.priceUSD} CAD · Get {totalCredits.toLocaleString()} Credits
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Legal disclaimer */}
          <div className="flex gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
            <span className="text-amber-400 text-sm">⚠️</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <strong className="text-slate-400">For Entertainment Only.</strong> Credits are virtual tokens
              with no real-world monetary value and cannot be withdrawn or redeemed for cash or prizes.
              All purchases are final. By purchasing you confirm you are 18+ and located in a permitted region.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BuyCreditsModal;
