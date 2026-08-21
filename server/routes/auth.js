const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// ─────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this IP. Please try again after an hour.' },
  skipSuccessfulRequests: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please wait 15 minutes.' },
});

// ─────────────────────────────────────────────
// Helper: generate a short unique referral code
// ─────────────────────────────────────────────
const generateReferralCode = () =>
  crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F7B2C1"

// ─────────────────────────────────────────────
// Helper: sign JWT
// ─────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
// router.post('/register', registerLimiter, validateRegister, async (req, res) => {
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { username, email, password, inviteCode } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(409).json({ message: `${field} is already in use` });
    }

    // ── Resolve invite code ────────────────────────────────
    let referrer = null;
    if (inviteCode && inviteCode.trim()) {
      referrer = await User.findOne({ referralCode: inviteCode.trim().toUpperCase() });
      if (!referrer) {
        return res.status(400).json({ message: 'Invalid invite code. Please double-check and try again.' });
      }
    }

    // Generate a unique referral code for the new user
    let referralCode;
    let codeConflict = true;
    while (codeConflict) {
      referralCode = generateReferralCode();
      const existing = await User.findOne({ referralCode });
      if (!existing) codeConflict = false;
    }

    // ── Create user ────────────────────────────────────────
    let user;
    try {
      const role = (email === 'admin@7wheel.com' || email === 'admin@admin.com') ? 'admin' : 'user';
      user = await User.create({
        username,
        email,
        password,
        role,
        referralCode,
        referredBy: referrer?._id || null,
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        const field = dbErr.keyPattern?.email ? 'Email' : 'Username';
        return res.status(409).json({ message: `${field} is already in use` });
      }
      throw dbErr;
    }

    // ── Record signup bonus transaction ────────────────────
    await Transaction.create({
      userId: user._id,
      amount: 0,
      type: 'BONUS_CREDITS',
      creditsPurchased: user.balance,
      balanceAfter: user.balance,
      description: `Welcome bonus: ${user.balance} free credits on signup`,
    });

    // ── Referral bonus — award 50 credits to both ──────────
    if (referrer) {
      const REFERRAL_BONUS = 50;

      // Award 50 to the new user
      await User.findByIdAndUpdate(user._id, { $inc: { balance: REFERRAL_BONUS } });
      user.balance += REFERRAL_BONUS;

      await Transaction.create({
        userId: user._id,
        amount: 0,
        type: 'BONUS_CREDITS',
        creditsPurchased: REFERRAL_BONUS,
        balanceAfter: user.balance,
        description: `Referral bonus: +${REFERRAL_BONUS} credits for using invite code ${referralCode}`,
      });

      // Award 50 to the referrer
      const updatedReferrer = await User.findByIdAndUpdate(
        referrer._id,
        { $inc: { balance: REFERRAL_BONUS, referralCount: 1 } },
        { new: true }
      );

      await Transaction.create({
        userId: referrer._id,
        amount: 0,
        type: 'BONUS_CREDITS',
        creditsPurchased: REFERRAL_BONUS,
        balanceAfter: updatedReferrer.balance,
        description: `Referral bonus: +${REFERRAL_BONUS} credits — ${username} joined using your invite code`,
      });

      console.log(`✅ Referral: ${username} used code from ${referrer.username}. Both received ${REFERRAL_BONUS} credits.`);
    }

    const token = signToken(user._id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        referralCode: user.referralCode,
        referralCount: user.referralCount,
      },
      referralBonusApplied: !!referrer,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.referralCode) {
      let referralCode;
      let codeConflict = true;
      while (codeConflict) {
        referralCode = generateReferralCode();
        const existing = await User.findOne({ referralCode });
        if (!existing) codeConflict = false;
      }
      user.referralCode = referralCode;
      await user.save();
    }

    const token = signToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        totalWon: user.totalWon,
        gamesPlayed: user.gamesPlayed,
        role: user.role,
        referralCode: user.referralCode,
        referralCount: user.referralCount || 0,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me — protected
// ─────────────────────────────────────────────
router.get('/me', verifyJWT, async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let modified = false;
    if (!user.referralCode) {
      let referralCode;
      let codeConflict = true;
      while (codeConflict) {
        referralCode = generateReferralCode();
        const existing = await User.findOne({ referralCode });
        if (!existing) codeConflict = false;
      }
      user.referralCode = referralCode;
      modified = true;
    }

    if (!user.inventory || user.inventory.length === 0) {
      user.inventory = ['frame_default', 'title_novice'];
      modified = true;
    }
    if (!user.equipped || !user.equipped.frame) {
      user.equipped = { frame: 'frame_default', title: 'title_novice' };
      modified = true;
    }

    if (modified) {
      await user.save();
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/auth/account — delete account
// ─────────────────────────────────────────────
router.delete('/account', verifyJWT, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete your account' });
    }

    // Re-fetch user with all fields (comparePassword needs the hashed password)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Account deletion cancelled.' });
    }

    // Delete all transactions
    await Transaction.deleteMany({ userId: user._id });

    // Delete the user document
    await User.findByIdAndDelete(user._id);

    console.log(`🗑️  Account deleted: ${user.username} (${user.email})`);

    res.json({ message: 'Account deleted successfully. We are sorry to see you go.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
      await user.save();

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`✅ Password reset successful for ${user.email}`);

    res.json({ message: 'Password has been reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
