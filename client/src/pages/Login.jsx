import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, ArrowLeft, Sparkles, Shield, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/play');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-brand-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[140px] pointer-events-none" />

      {/* Top Floating Header Bar */}
      <header className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-brand-500/50 px-4 py-2.5 rounded-2xl transition-all shadow-xl backdrop-blur-md group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-brand-400" />
          <span>Back to Home</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl">
          <Coins size={14} />
          <span>100 Free Virtual Credits</span>
        </div>
      </header>

      {/* Main Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10 pt-16 sm:pt-0"
      >
        {/* Logo & Header Title */}
        <div className="text-center mb-6 space-y-2">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 via-purple-600 to-pink-600 items-center justify-center text-3xl font-black text-white glow-brand shadow-2xl shadow-brand-500/30 border border-white/10"
          >
            7
          </motion.div>
          <h1 className="font-display font-black text-3xl text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs font-medium text-slate-400">Sign in to access your 7Wheel Casino Hub</p>
        </div>

        {/* Card */}
        <div className="card p-7 md:p-8 border-2 border-slate-800/90 bg-slate-950/80 backdrop-blur-2xl rounded-3xl shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
            
            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-extrabold text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="input-field pl-11 text-xs py-3 bg-slate-900/90 border-slate-800 focus:border-brand-500 rounded-xl"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-extrabold text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors font-bold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-11 text-xs py-3 bg-slate-900/90 border-slate-800 focus:border-brand-500 rounded-xl"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3"
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Signing in…</span>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In to Play
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-brand-400 font-extrabold hover:text-brand-300 transition-colors ml-1"
              >
                Create one free (100 Credits Bonus)
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <p className="text-center text-[11px] text-slate-500 mt-6 flex items-center justify-center gap-1 font-medium">
          <Shield size={12} className="text-emerald-400" /> Free Social Gaming · 100 Virtual Tokens Included
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
