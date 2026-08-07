import { useState, useMemo } from 'react';
import { X, ArrowDownLeft, ShieldCheck, AlertCircle, Banknote, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const WithdrawModal = () => {
  const { withdraw, user, showWithdrawModal, setShowWithdrawModal } = useAuth();

  const [amount, setAmount] = useState('25');
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('PAYPAL'); // 'PAYPAL' or 'BANK'
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState('');

  // Bank fields
  const [bank, setBank] = useState({ accountName: '', accountNumber: '', routingNumber: '' });

  const getFinalAmount = () => parseFloat(amount || customAmount || 0);

  const processingFee = useMemo(() => {
    const amt = getFinalAmount();
    return parseFloat((amt * 0.05).toFixed(2));
  }, [amount, customAmount]);

  const netPayout = useMemo(() => {
    const amt = getFinalAmount();
    return parseFloat((amt - amt * 0.05).toFixed(2));
  }, [amount, customAmount]);

  if (!showWithdrawModal) return null;

  const handleClose = () => {
    setShowWithdrawModal(false);
    setSuccess(null);
    setAmount('25');
    setCustomAmount('');
    setPaypalEmail('');
    setBank({ accountName: '', accountNumber: '', routingNumber: '' });
  };

  const presetAmounts = ['25', '50', '100', '250', '500'];

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

  const isFormValid = () => {
    const finalAmt = getFinalAmount();
    if (isNaN(finalAmt) || finalAmt < 10 || finalAmt > 50000) return false;
    if (finalAmt > (user?.balance || 0)) return false;

    if (method === 'PAYPAL') {
      return paypalEmail.includes('@') && paypalEmail.includes('.');
    }
    if (method === 'BANK') {
      return (
        bank.accountName.trim().length >= 2 &&
        bank.accountNumber.length >= 6 &&
        bank.routingNumber.length >= 6
      );
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setSubmitting(true);
    try {
      const payoutDetails = method === 'PAYPAL'
        ? { email: paypalEmail }
        : { accountName: bank.accountName, accountNumber: bank.accountNumber, routingNumber: bank.routingNumber };

      const result = await withdraw({
        amount: getFinalAmount(),
        payoutMethod: method,
        payoutDetails,
      });

      setSuccess(result);
      toast.success(result.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md relative overflow-hidden border-casino-border shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-casino-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <ArrowDownLeft size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg leading-none">Withdraw</h2>
              <p className="text-xs text-slate-500 mt-0.5">Cash out your balance</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-casino-muted transition-colors text-slate-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success View */}
        {success ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <h3 className="font-display font-bold text-xl text-white">Withdrawal Submitted!</h3>
            <div className="space-y-1 text-sm">
              <p className="text-slate-400">Net payout: <strong className="text-emerald-400">${success.netPayout.toFixed(2)}</strong></p>
              <p className="text-slate-500 text-xs">Processing fee: ${success.processingFee.toFixed(2)}</p>
              <p className="text-slate-500 text-xs">New balance: ${success.balance.toFixed(2)}</p>
            </div>
            <p className="text-xs text-slate-500">Funds typically arrive in 1–3 business days.</p>
            <button
              onClick={handleClose}
              className="btn-primary w-full py-3"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Current Balance */}
            <div className="flex items-center justify-between bg-casino-muted rounded-xl px-4 py-3 border border-casino-border">
              <span className="text-xs text-slate-500">Available Balance</span>
              <span className="font-display font-bold text-gold-400 text-lg">${user?.balance?.toFixed(2) ?? '0.00'}</span>
            </div>

            {/* Amount Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Withdrawal Amount</label>
              <div className="grid grid-cols-5 gap-2">
                {presetAmounts.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleAmountSelect(val)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                      amount === val
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-casino-muted border-casino-border text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="10"
                max="50000"
                step="0.01"
                placeholder="Custom amount ($10 min)"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="input-field w-full text-sm"
              />
            </div>

            {/* Fee Breakdown */}
            {getFinalAmount() >= 10 && (
              <div className="bg-casino-muted rounded-xl p-3.5 border border-casino-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Withdrawal amount</span>
                  <span className="text-slate-300">${getFinalAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Processing fee (5%)</span>
                  <span className="text-red-400">-${processingFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-casino-border/50 pt-2 flex justify-between text-sm">
                  <span className="text-slate-400 font-semibold">You receive</span>
                  <span className="text-emerald-400 font-bold font-display">${netPayout.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Insufficient balance warning */}
            {getFinalAmount() > (user?.balance || 0) && getFinalAmount() >= 10 && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                Insufficient balance for this withdrawal
              </div>
            )}

            {/* Payout Method */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payout Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('PAYPAL')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    method === 'PAYPAL'
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-casino-muted border-casino-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Mail size={16} />
                  PayPal
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('BANK')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    method === 'BANK'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-casino-muted border-casino-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Banknote size={16} />
                  Bank Transfer
                </button>
              </div>

              {/* PayPal Fields */}
              {method === 'PAYPAL' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">PayPal Email</label>
                  <input
                    type="email"
                    placeholder="your@paypal.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="input-field w-full text-sm"
                    required
                  />
                </div>
              )}

              {/* Bank Fields */}
              {method === 'BANK' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={bank.accountName}
                      onChange={(e) => setBank(b => ({ ...b, accountName: e.target.value }))}
                      className="input-field w-full text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Account Number</label>
                      <input
                        type="text"
                        placeholder="••••••1234"
                        value={bank.accountNumber}
                        onChange={(e) => setBank(b => ({ ...b, accountNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                        className="input-field w-full text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Routing Number</label>
                      <input
                        type="text"
                        placeholder="021000021"
                        value={bank.routingNumber}
                        onChange={(e) => setBank(b => ({ ...b, routingNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                        className="input-field w-full text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !isFormValid()}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Processing…
                </span>
              ) : (
                `Withdraw $${getFinalAmount().toFixed(2)}`
              )}
            </button>

            {/* Security footer */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
              <ShieldCheck size={10} />
              Secured with end-to-end encryption · 1-3 business days
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WithdrawModal;
