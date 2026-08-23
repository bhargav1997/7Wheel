const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// ── Keno Paytable (1-100 Numbers Grid, 20 Balls Drawn) ──────────────────────
// Payouts based on how many numbers the player picked and how many matched.
// Key: picksCount → Map(matchesCount → multiplier)
const KENO_PAYTABLE = {
  1:  { 1: 4.5 },
  2:  { 2: 24 },
  3:  { 2: 3, 3: 120 },
  4:  { 2: 2, 3: 25, 4: 700 },
  5:  { 2: 1.5, 3: 10, 4: 120, 5: 3500 },
  6:  { 3: 5, 4: 50, 5: 600, 6: 5000 },
  7:  { 3: 3, 4: 20, 5: 180, 6: 1500, 7: 8000 },
  8:  { 4: 10, 5: 75, 6: 600, 7: 3500, 8: 10000 },
  9:  { 4: 6, 5: 35, 6: 250, 7: 1800, 8: 8000, 9: 20000 },
  10: { 4: 4, 5: 18, 6: 100, 7: 800, 8: 4000, 9: 15000, 10: 50000 },
};

// ── Draw 20 unique numbers from 1-100 using crypto.randomInt ─────────────────
const drawKenoNumbers = () => {
  const drawn = new Set();
  while (drawn.size < 20) {
    drawn.add(crypto.randomInt(1, 101)); // 1 to 100 inclusive
  }
  return [...drawn].sort((a, b) => a - b);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/keno/play — Single-round Keno game
// Body: { betAmount: number, picks: number[] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/play', verifyJWT, async (req, res) => {
  try {
    const { betAmount, picks } = req.body;
    const bet = parseInt(betAmount, 10);

    // Validate bet
    if (isNaN(bet) || bet < 1) {
      return res.status(400).json({ message: 'Minimum bet is 1 credit.' });
    }

    // Validate picks
    if (!Array.isArray(picks) || picks.length < 1 || picks.length > 10) {
      return res.status(400).json({ message: 'Pick between 1 and 10 numbers.' });
    }

    const uniquePicks = [...new Set(picks)].filter(
      (n) => Number.isInteger(n) && n >= 1 && n <= 100
    );

    if (uniquePicks.length < 1 || uniquePicks.length > 10) {
      return res.status(400).json({ message: 'Pick 1-10 valid numbers between 1 and 100.' });
    }

    if (uniquePicks.length !== picks.length) {
      return res.status(400).json({ message: 'Duplicate or invalid numbers detected.' });
    }

    // Check user balance
    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Deduct bet
    const afterBet = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: -bet } },
      { new: true }
    );

    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: bet,
      balanceAfter: afterBet.balance,
      description: `Keno round — bet ${bet} 🪙, picked ${uniquePicks.length} numbers`,
    });

    // Draw 20 numbers
    const drawnNumbers = drawKenoNumbers();

    // Calculate hits
    const hits = uniquePicks.filter((n) => drawnNumbers.includes(n));
    const matchCount = hits.length;
    const pickCount = uniquePicks.length;

    // Look up payout multiplier
    const payoutTable = KENO_PAYTABLE[pickCount] || {};
    const multiplier = payoutTable[matchCount] || 0;
    const payout = Math.floor(bet * multiplier);

    // Award winnings
    let balanceAfter;
    if (payout > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            balance: payout,
            creditsEarned: payout,
          },
        },
        { new: true }
      );
      balanceAfter = updatedUser.balance;

      await Transaction.create({
        userId: req.user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter,
        description: `Keno WIN! ${matchCount}/${pickCount} matched — ${multiplier}× → +${payout} 🪙`,
      });
    } else {
      balanceAfter = afterBet.balance;
      // Bet already logged as BET_PLACED — no duplicate loss transaction needed
    }

    return res.json({
      drawnNumbers,
      picks: uniquePicks,
      hits,
      matchCount,
      pickCount,
      multiplier,
      payout,
      balanceAfter,
    });
  } catch (err) {
    console.error('Keno play error:', err);
    return res.status(500).json({ message: 'Server error playing Keno.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/keno/paytable — Return the full paytable for client display
// ─────────────────────────────────────────────────────────────────────────────
router.get('/paytable', (req, res) => {
  res.json({ paytable: KENO_PAYTABLE });
});

module.exports = router;
