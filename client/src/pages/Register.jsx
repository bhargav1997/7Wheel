import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, UserPlus, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck, Ticket, ArrowLeft, Coins, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const RESERVED_NAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support',
  'moderator', 'mod', 'staff', 'bot', 'official',
  'help', 'info', 'null', 'undefined', 'anonymous',
  'test', 'demo', 'guest', '7wheel', 'wheel',
]);

const validateUsername = (v) => {
  if (!v) return '';
  if (v.length < 3) return 'At least 3 characters';
  if (v.length > 20) return 'At most 20 characters';
  if (!USERNAME_REGEX.test(v)) return 'Letters, numbers and underscores only';
  if (v.startsWith('_') || v.endsWith('_')) return 'Cannot start or end with _';
  if (v.includes('__')) return 'No consecutive underscores';
  if (/^\d+$/.test(v)) return 'Cannot be only numbers';
  if (RESERVED_NAMES.has(v.toLowerCase())) return `"${v}" is a reserved name`;
  return null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validateEmail = (v) => {
  if (!v) return '';
  if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address';
  return null;
};

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password),
    long:      password.length >= 12,
  };
  score = Object.values(checks).filter(Boolean).length;

  const levels = [
    { score: 0, label: '',          color: '' },
    { score: 1, label: 'Very Weak', color: 'bg-red-600' },
    { score: 2, label: 'Weak',      color: 'bg-orange-500' },
    { score: 3, label: 'Fair',      color: 'bg-yellow-500' },
    { score: 4, label: 'Good',      color: 'bg-blue-500' },
    { score: 5, label: 'Strong',    color: 'bg-emerald-500' },
    { score: 6, label: 'Very Strong', color: 'bg-emerald-400' },
  ];

  return { ...levels[Math.min(score, 6)], score, checks };
};

const PasswordRule = ({ met, label }) => (
  <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
    {met
      ? <CheckCircle size={10} className="flex-shrink-0" />
      : <div className="w-2.5 h-2.5 rounded-full border border-slate-600 flex-shrink-0" />
    }
    {label}
  </div>
);

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', inviteCode: '' });
  const [touched, setTouched] = useState({ username: false, email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setServerError('');
  };

  const handleBlur = (e) =>
    setTouched((t) => ({ ...t, [e.target.name]: true }));

  const usernameErr  = useMemo(() => validateUsername(form.username),  [form.username]);
  const emailErr     = useMemo(() => validateEmail(form.email),        [form.email]);
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const isFormValid =
    usernameErr === null &&
    emailErr === null &&
    form.password.length >= 8 &&
    passwordStrength.checks?.uppercase &&
    passwordStrength.checks?.lowercase &&
    passwordStrength.checks?.number &&
    passwordStrength.checks?.special;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    if (!isFormValid) return;

    setServerError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/play');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    '100 free credits on signup',
    'Invite friends · earn +50 credits each',
    'Real-time multiplayer rounds',
  ];

  return (
    <div className="min-h-screen bg-[#05050a] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-brand-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[140px] pointer-events-none" />

      {/* Top Floating Header Bar */}
      <header className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-brand-500/50 px-4 py-2.5 rounded-2xl transition-all shadow-xl backdrop-blur-md group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-brand-400" />
          <span>Back to Home</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
          <Sparkles size={14} />
          <span>100 🪙 Bonus Included</span>
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
            Join the Hub
          </h1>
          <p className="text-xs font-medium text-slate-400">Create your account and claim 100 🪙 Free Credits</p>
        </div>

        {/* Perks Bar */}
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          {perks.map((perk) => (
            <span key={perk} className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <CheckCircle size={11} /> {perk}
            </span>
          ))}
        </div>

        {/* Card */}
        <div className="card p-7 md:p-8 border-2 border-slate-800/90 bg-slate-950/80 backdrop-blur-2xl rounded-3xl shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4" id="register-form" noValidate>

            {/* Username */}
            <div className="space-y-1">
              <label htmlFor="reg-username" className="block text-xs font-extrabold text-slate-300">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={form.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="input-field pl-11 text-xs py-3 bg-slate-900/90 border-slate-800 focus:border-brand-500 rounded-xl"
                  placeholder="coolplayer99"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="reg-email" className="block text-xs font-extrabold text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="input-field pl-11 text-xs py-3 bg-slate-900/90 border-slate-800 focus:border-brand-500 rounded-xl"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="reg-password" className="block text-xs font-extrabold text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="input-field pl-11 pr-11 text-xs py-3 bg-slate-900/90 border-slate-800 focus:border-brand-500 rounded-xl"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength checklist */}
              {form.password && (
                <div className="mt-2 space-y-1.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <PasswordRule met={passwordStrength.checks?.length}    label="8+ characters" />
                    <PasswordRule met={passwordStrength.checks?.uppercase}  label="Uppercase letter" />
                    <PasswordRule met={passwordStrength.checks?.lowercase}  label="Lowercase letter" />
                    <PasswordRule met={passwordStrength.checks?.number}     label="Number (0-9)" />
                    <PasswordRule met={passwordStrength.checks?.special}    label="Special char (!@#…)" />
                  </div>
                </div>
              )}
            </div>

            {/* Server Error */}
            {serverError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle size={14} className="flex-shrink-0" />
                {serverError}
              </div>
            )}

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-purple-600 via-brand-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-brand-500/30 border border-brand-400/40 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? (
                <span>Creating Account…</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create Account & Claim 100 🪙
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Already registered?{' '}
              <Link
                to="/login"
                className="text-brand-400 font-extrabold hover:text-brand-300 transition-colors ml-1"
              >
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
