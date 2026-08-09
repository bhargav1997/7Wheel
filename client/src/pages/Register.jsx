import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, UserPlus, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
// Client-side validation mirrors (server is authoritative)
// ─────────────────────────────────────────────
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
  return null; // null = valid
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

// ─────────────────────────────────────────────
// Register page
// ─────────────────────────────────────────────
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

  // Live field errors
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
      await register(form); // includes inviteCode
      navigate('/play');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    '100 free credits on signup',
    'Invite friends · earn 50 credits each',
    'Real-time multiplayer rounds',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
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
          <h1 className="font-display font-black text-4xl text-white mb-1">Join the Hub</h1>
          <p className="text-slate-400">Create your free account</p>
        </div>

        {/* Perks */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          {perks.map((perk, i) => (
            <motion.div
              key={perk}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-1.5 text-xs text-emerald-400"
            >
              <CheckCircle size={12} />
              {perk}
            </motion.div>
          ))}
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} className="space-y-5" id="register-form" noValidate>

            {/* Username */}
            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium text-slate-300 mb-2">
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
                  className={`input-field pl-11 pr-10 ${
                    touched.username && usernameErr
                      ? 'border-red-500 focus:ring-red-500'
                      : touched.username && usernameErr === null
                      ? 'border-emerald-500 focus:ring-emerald-500'
                      : ''
                  }`}
                  placeholder="coolplayer99"
                />
                {touched.username && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameErr === null
                      ? <CheckCircle size={15} className="text-emerald-400" />
                      : <AlertCircle size={15} className="text-red-400" />
                    }
                  </div>
                )}
              </div>
              <AnimatePresence>
                {touched.username && usernameErr && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                  >
                    <AlertCircle size={11} /> {usernameErr}
                  </motion.p>
                )}
              </AnimatePresence>
              <p className="text-xs text-slate-600 mt-1">3–20 chars · letters, numbers, underscores</p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-2">
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
                  className={`input-field pl-11 pr-10 ${
                    touched.email && emailErr
                      ? 'border-red-500 focus:ring-red-500'
                      : touched.email && emailErr === null
                      ? 'border-emerald-500 focus:ring-emerald-500'
                      : ''
                  }`}
                  placeholder="you@example.com"
                />
                {touched.email && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {emailErr === null
                      ? <CheckCircle size={15} className="text-emerald-400" />
                      : <AlertCircle size={15} className="text-red-400" />
                    }
                  </div>
                )}
              </div>
              <AnimatePresence>
                {touched.email && emailErr && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                  >
                    <AlertCircle size={11} /> {emailErr}
                  </motion.p>
                )}
              </AnimatePresence>
              <p className="text-xs text-slate-600 mt-1">Temporary and disposable emails are not allowed</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-2">
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
                  className="input-field pl-11 pr-11"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                             hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {form.password && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 space-y-2"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-casino-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${
                      passwordStrength.score <= 2 ? 'text-red-400' :
                      passwordStrength.score <= 3 ? 'text-yellow-400' :
                      passwordStrength.score <= 4 ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                    {passwordStrength.score >= 5 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <ShieldCheck size={11} /> Secure
                      </span>
                    )}
                  </div>

                  {/* Requirement checklist */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                    <PasswordRule met={passwordStrength.checks?.length}    label="8+ characters" />
                    <PasswordRule met={passwordStrength.checks?.uppercase}  label="Uppercase letter" />
                    <PasswordRule met={passwordStrength.checks?.lowercase}  label="Lowercase letter" />
                    <PasswordRule met={passwordStrength.checks?.number}     label="Number (0-9)" />
                    <PasswordRule met={passwordStrength.checks?.special}    label="Special char (!@#…)" />
                    <PasswordRule met={passwordStrength.checks?.long}       label="12+ chars (bonus)" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Invite Code (optional) */}
            <div>
              <label htmlFor="reg-invite" className="block text-sm font-medium text-slate-300 mb-2">
                Invite Code
                <span className="ml-2 text-[10px] font-normal text-slate-500 bg-casino-muted border border-casino-border rounded px-1.5 py-0.5">
                  Optional
                </span>
              </label>
              <div className="relative">
                <Ticket size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="reg-invite"
                  name="inviteCode"
                  type="text"
                  autoComplete="off"
                  value={form.inviteCode}
                  onChange={handleChange}
                  className="input-field pl-11 uppercase tracking-widest font-mono"
                  placeholder="e.g. A3F7B2C1"
                  maxLength={8}
                />
              </div>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" />
                You and your friend both get +50 bonus credits!
              </p>
            </div>

            {/* Server error */}
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10
                             border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {serverError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-brand-400 font-semibold hover:text-brand-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
