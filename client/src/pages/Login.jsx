import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
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
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
            Welcome Back
          </h1>
          <p className="text-slate-400">Sign in to enter the Hub</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="••••••••"
                />
              </div>
            </div>

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
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-brand-400 font-semibold hover:text-brand-300 transition-colors"
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Decorative credits note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          New accounts start with 100 free credits 🎰
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
