import { useState } from 'react';
import { X, Trash2, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DeleteAccountModal = () => {
  const { user, deleteAccount, showDeleteModal, setShowDeleteModal } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showDeleteModal) return null;

  const handleClose = () => {
    if (loading) return;
    setShowDeleteModal(false);
    setPassword('');
    setConfirmed(false);
    setError('');
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!password || !confirmed) return;
    setError('');
    setLoading(true);
    try {
      await deleteAccount(password);
      toast.success('Your account has been permanently deleted.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-casino-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="card max-w-md w-full border border-red-500/20 shadow-2xl shadow-red-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-casino-border bg-red-500/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Trash2 size={15} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Delete Account</h3>
              <p className="text-[10px] text-red-400">This action is permanent and irreversible</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Warning */}
          <div className="flex gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-red-300">What will be deleted:</p>
              <ul className="space-y-0.5 list-disc list-inside text-slate-500">
                <li>Your account <span className="text-white font-semibold">@{user?.username}</span></li>
                <li>All {(user?.balance ?? 0).toLocaleString()} remaining credits (non-refundable)</li>
                <li>Your full transaction history</li>
                <li>All game statistics</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleDelete} className="space-y-4">
            {/* Password */}
            <div>
              <label htmlFor="delete-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                <Lock size={11} className="inline mr-1 text-slate-400" />
                Confirm with your password
              </label>
              <div className="relative">
                <input
                  id="delete-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  className="input-field pr-11 text-sm"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="sr-only"
                  disabled={loading}
                />
                <div className={`w-4 h-4 rounded border transition-all ${
                  confirmed
                    ? 'bg-red-500 border-red-500'
                    : 'bg-transparent border-slate-600 group-hover:border-slate-400'
                } flex items-center justify-center`}>
                  {confirmed && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
              </div>
              <span className="text-xs text-slate-400 leading-relaxed">
                I understand this is <strong className="text-red-400">permanent</strong> and cannot be undone.
                My credits and data will be lost forever.
              </span>
            </label>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                <AlertTriangle size={12} /> {error}
              </motion.p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-casino-border text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                type="submit"
                disabled={loading || !password || !confirmed}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 size={14} /> Delete My Account</>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteAccountModal;
