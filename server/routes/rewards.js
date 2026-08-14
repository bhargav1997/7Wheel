const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ─────────────────────────────────────────────
// Daily streak rewards table
// ─────────────────────────────────────────────
const STREAK_REWARDS = [
  { day: 1, credits: 25,  emoji: '🌟' },
  { day: 2, credits: 35,  emoji: '⚡' },
  { day: 3, credits: 50,  emoji: '🔥' },
  { day: 4, credits: 75,  emoji: '💎' },
  { day: 5, credits: 100, emoji: '🏆' },
  { day: 6, credits: 150, emoji: '👑' },
  { day: 7, credits: 300, emoji: '🎰', bonus: true },
];

const getRewardForStreak = (streak) => {
  const index = Math.min(streak - 1, STREAK_REWARDS.length - 1);
  return STREAK_REWARDS[index];
};

// GET /api/rewards/streak
router.get('/streak', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loginStreak longestStreak lastLoginAt balance');
    const now = new Date();
    const last = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const hoursSinceLast = last ? (now - last) / (1000 * 60 * 60) : Infinity;
    const canClaim = hoursSinceLast >= 20;
    const currentStreak = user.loginStreak || 0;
    const nextStreak = canClaim ? currentStreak + 1 : currentStreak;
    const reward = getRewardForStreak(Math.max(nextStreak, 1));
    let nextClaimAt = null;
    if (!canClaim && last) {
      nextClaimAt = new Date(last.getTime() + 20 * 60 * 60 * 1000).toISOString();
    }
    res.json({ currentStreak, longestStreak: user.longestStreak || 0, canClaim, nextClaimAt, reward, allRewards: STREAK_REWARDS });
  } catch (err) {
    console.error('Streak GET error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/rewards/claim-daily
router.post('/claim-daily', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();
    const last = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const hoursSinceLast = last ? (now - last) / (1000 * 60 * 60) : Infinity;

    if (hoursSinceLast < 20) {
      const nextClaimAt = new Date(last.getTime() + 20 * 60 * 60 * 1000);
      return res.status(400).json({ message: 'Already claimed today. Come back later!', nextClaimAt: nextClaimAt.toISOString() });
    }

    const streakBroken = last && hoursSinceLast > 48;
    const newStreak = streakBroken ? 1 : (user.loginStreak || 0) + 1;
    const reward = getRewardForStreak(newStreak);

    user.loginStreak = newStreak;
    user.longestStreak = Math.max(user.longestStreak || 0, newStreak);
    user.lastLoginAt = now;
    user.balance += reward.credits;
    await user.save();

    await Transaction.create({
      userId: user._id,
      amount: 0,
      type: 'BONUS_CREDITS',
      creditsPurchased: reward.credits,
      balanceAfter: user.balance,
      description: `Daily streak Day ${newStreak}: +${reward.credits} credits ${reward.emoji}`,
    });

    console.log(`🔥 Streak: ${user.username} Day ${newStreak} → +${reward.credits} credits`);
    res.json({ success: true, newStreak, longestStreak: user.longestStreak, reward, newBalance: user.balance, streakBroken });
  } catch (err) {
    console.error('Claim daily error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
