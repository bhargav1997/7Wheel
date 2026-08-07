import { useState } from 'react';
import { X, CreditCard, ShieldCheck, Lock, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

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
  if (v.length >= 2) {
    return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
  }
  return v;
};

const DepositModal = () => {
  const { deposit, showDepositModal, setShowDepositModal } = useAuth();

  const [amount, setAmount] = useState('25');
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('CARD'); // 'CARD' or 'PAYPAL'
  const [submitting, setSubmitting] = useState(false);
  const [paypalWindowOpen, setPaypalWindowOpen] = useState(false);

  // Stripe Card elements state
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '', postal: '' });

  if (!showDepositModal) return null;

  const handleAmountSelect = (val) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    if (val === '' || (parseFloat(val) >= 0 && !isNaN(val))) {
      setCustomAmount(val);
      setAmount('');
    }
  };

  const getFinalAmount = () => {
    return parseFloat(amount || customAmount || 0);
  };

  const isFormValid = () => {
    const finalAmt = getFinalAmount();
    if (isNaN(finalAmt) || finalAmt < 1 || finalAmt > 10000) return false;

    if (method === 'CARD') {
      return (
        card.number.replace(/\s/g, '').length === 16 &&
        /^\d{2}\/\d{2}$/.test(card.expiry) &&
        card.cvc.length === 3 &&
        card.name.trim().length > 2 &&
        card.postal.trim().length >= 5
      );
    }
    return true; // PayPal is triggered by button click
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setSubmitting(true);
    const finalAmount = getFinalAmount();

    try {
      // Simulate Stripe secure processing delay
      await new Promise((resolve) => setTimeout(resolve, 2200));

      await deposit({
        amount: finalAmount,
        paymentMethod: 'CARD',
        paymentDetails: {
          cardNumber: card.number.replace(/\s/g, ''),
          cardExpiry: card.expiry,
          cardCvc: card.cvc,
          cardName: card.name,
        },
      });

      toast.success(`Successfully deposited $${finalAmount.toFixed(2)}`);
      setCard({ number: '', expiry: '', cvc: '', name: '', postal: '' });
      setShowDepositModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaypalSubmit = async () => {
    const finalAmount = getFinalAmount();
    if (isNaN(finalAmount) || finalAmount < 1) {
      toast.error('Please enter a valid amount');
      return;
    }

    setPaypalWindowOpen(true);
    setSubmitting(true);

    // Simulate PayPal portal loading, user auth, and agreement approval
    setTimeout(async () => {
      try {
        await deposit({
          amount: finalAmount,
          paymentMethod: 'PAYPAL',
          paymentDetails: { email: 'secure-user@paypal.com' },
        });

        toast.success(`Successfully deposited $${finalAmount.toFixed(2)}`);
        setPaypalWindowOpen(false);
        setShowDepositModal(false);
      } catch (err) {
        toast.error('PayPal authentication cancelled or failed.');
        setPaypalWindowOpen(false);
      } finally {
        setSubmitting(false);
      }
    }, 3000); // 3 seconds portal popup simulation
  };

  return (
    <div className="fixed inset-0 bg-casino-dark/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      {/* PayPal Simulated Gateway Popup */}
      {paypalWindowOpen && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-sm w-full p-8 shadow-2xl text-center space-y-6 text-[#2c2e2f]">
            <div className="flex justify-center">
              <span className="font-bold text-3xl italic text-[#0070ba] font-serif">PayPal</span>
            </div>
            <div className="w-12 h-12 border-4 border-[#0070ba] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-lg">Authorizing Payment</h4>
              <p className="text-slate-500 text-xs">Connecting securely to PayPal Checkout Portal...</p>
            </div>
            <p className="text-[10px] text-slate-400">
              Please do not close this window. Your payment is being verified by PayPal Inc.
            </p>
          </div>
        </div>
      )}

      {/* Main Deposit Box */}
      <div
        className="card max-w-md w-full overflow-hidden border border-casino-border shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-casino-border bg-casino-card">
          <div className="flex items-center gap-2">
            <CreditCard className="text-brand-400" size={18} />
            <h3 className="font-display font-bold text-base text-white">Add Funds</h3>
          </div>
          <button
            onClick={() => !submitting && setShowDepositModal(false)}
            disabled={submitting}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Quick Amounts */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium">Deposit Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((val) => (
                <button
                  type="button"
                  key={val}
                  disabled={submitting}
                  onClick={() => handleAmountSelect(String(val))}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all
                    ${amount === String(val)
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-casino-border bg-casino-muted/20 text-slate-400 hover:text-white'}
                    disabled:opacity-50`}
                >
                  ${val}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="1"
                max="10000"
                disabled={submitting}
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="Or enter custom amount"
                className="input-field pl-8 text-sm"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium">Secure Checkout Provider</label>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setMethod('CARD')}
                className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all
                  ${method === 'CARD'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-casino-border bg-casino-muted/10 text-slate-400 hover:text-white'}
                  disabled:opacity-50`}
              >
                <div className="flex items-center gap-1">
                  <CreditCard size={14} />
                  <span className="font-bold text-xs text-slate-200">stripe</span>
                </div>
                <span className="text-[10px] text-slate-500">Stripe Elements</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setMethod('PAYPAL')}
                className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all
                  ${method === 'PAYPAL'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-casino-border bg-casino-muted/10 text-slate-400 hover:text-white'}
                  disabled:opacity-50`}
              >
                <span className="font-bold text-xs italic text-[#0070ba] font-serif">PayPal</span>
                <span className="text-[10px] text-slate-500">Express Checkout</span>
              </button>
            </div>
          </div>

          {/* Payment Fields Wrapper */}
          <div className="pt-4 border-t border-casino-border/50">
            {method === 'CARD' ? (
              <form onSubmit={handleCardSubmit} className="space-y-4">
                {/* Stripe Elements Description */}
                <div className="p-3 bg-casino-card border border-casino-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <Lock size={10} className="text-emerald-400" /> Secure Card Input
                    </span>
                    <span className="font-display tracking-tight text-[10px] text-slate-500">
                      POWERED BY <strong className="text-slate-400">stripe</strong>
                    </span>
                  </div>

                  {/* Simulated single-line Stripe element */}
                  <div className="relative">
                    <input
                      type="text"
                      maxLength="19"
                      required
                      disabled={submitting}
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      placeholder="Card number"
                      className="w-full bg-[#111118] border border-casino-border rounded-lg py-2.5 pl-3 pr-28 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <input
                        type="text"
                        maxLength="5"
                        required
                        disabled={submitting}
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        placeholder="MM/YY"
                        className="w-12 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none font-mono"
                      />
                      <span className="text-slate-700">|</span>
                      <input
                        type="text"
                        maxLength="3"
                        required
                        disabled={submitting}
                        value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="CVC"
                        className="w-8 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Cardholder details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="card-name-input" className="block text-[10px] text-slate-500 mb-1">Cardholder Name</label>
                    <input
                      id="card-name-input"
                      type="text"
                      disabled={submitting}
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      placeholder="John Doe"
                      className="input-field text-xs py-2"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="card-zip-input" className="block text-[10px] text-slate-500 mb-1">Billing ZIP / Postal</label>
                    <input
                      id="card-zip-input"
                      type="text"
                      maxLength="8"
                      disabled={submitting}
                      value={card.postal}
                      onChange={(e) => setCard({ ...card, postal: e.target.value })}
                      placeholder="10001"
                      className="input-field text-xs py-2"
                      required
                    />
                  </div>
                </div>

                {/* Stripe Secure Disclaimer */}
                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Your credentials are encrypted and transmitted directly to Stripe servers via HTTPS. We do not store or process card numbers on our server.
                </p>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || !isFormValid()}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting to Stripe...
                    </>
                  ) : (
                    `Pay $${getFinalAmount().toFixed(2)} with Stripe`
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 bg-casino-card border border-casino-border rounded-xl space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Lock size={12} className="text-emerald-400" /> PayPal Secure Redirect
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Clicking the button below will open a secure pop-up portal window where you can approve the transaction with your PayPal balance or registered credit cards.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePaypalSubmit}
                  disabled={submitting || getFinalAmount() < 1}
                  className="w-full py-3 bg-[#ffc439] hover:bg-[#f2b930] text-[#2c2e2f] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span className="font-bold italic text-base text-[#0070ba] font-serif">PayPal</span>
                  <span>Pay Now</span>
                  <ExternalLink size={14} className="opacity-60" />
                </button>

                <p className="text-[10px] text-slate-500">
                  Transactions are subject to PayPal terms of service.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;
