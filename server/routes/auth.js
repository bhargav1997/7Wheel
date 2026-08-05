const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { verifyJWT } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

const router = express.Router();

// ─────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────

/**
 * Register limiter: max 5 accounts per IP per hour.
 * Prevents mass account creation / bot farming.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many accounts created from this IP. Please try again after an hour.',
  },
  skipSuccessfulRequests: false,
});

/**
 * Login limiter: max 10 attempts per IP per 15 minutes.
 * Prevents brute-force password attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  skipSuccessfulRequests: true, // only count failed attempts
});

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
    const { username, email, password } = req.body;
    // email and username are already trimmed + normalized by validateRegister middleware

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(409).json({ message: `${field} is already in use` });
    }

    let user;
    try {
      user = await User.create({ username, email, password });
    } catch (dbErr) {
      // MongoDB unique index violation (E11000) — race-condition safety net
      if (dbErr.code === 11000) {
        const field = dbErr.keyPattern?.email ? 'Email' : 'Username';
        return res.status(409).json({ message: `${field} is already in use` });
      }
      throw dbErr;
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
      },
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
      // Generic message — never reveal whether email exists
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
