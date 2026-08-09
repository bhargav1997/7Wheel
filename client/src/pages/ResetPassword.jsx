import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex w-20 h-20 rounded-2xl bg-brand-gradient items-center
                       justify-center text-4xl font-black text-white mb-4 glow-brand
                       animate-float shadow-2xl"
          >
            7
          </motion.div>
          <h1 className="font-display font-black text-4xl text-white mb-1">
            Reset Password
          </h1>
          <p className="text-slate-400">Choose a strong new password</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl shadow-black/50">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h3 className="font-display font-bold text-xl text-white">Password Reset!</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-4"
              >
                <ArrowLeft size={14} />
                Go to Login
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" id="reset-password-form">
              {/* New Password */}
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-11"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-11"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Password strength hint */}
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-amber-400">Password must be at least 6 characters</p>
              )}
              {password.length >= 6 && confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10
                             border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                id="reset-submit-btn"
                type="submit"
                disabled={loading || password.length < 6 || password !== confirmPassword}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Resetting…
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              <Link
                to="/login"
                className="text-brand-400 font-semibold hover:text-brand-300 transition-colors"
              >
                ← Back to Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
