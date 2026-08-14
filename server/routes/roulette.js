const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

/**
 * Evaluate a single bet on winning pocket `pocket` (0-36).
 * Returns payout multiplier (0 if lost).
 */
const evaluateBet = (betType, target, pocket) => {
  const isRed = RED_NUMBERS.includes(pocket);
  const isBlack = BLACK_NUMBERS.includes(pocket);
  const isEven = pocket !== 0 && pocket % 2 === 0;
  const isOdd = pocket !== 0 && pocket % 2 !== 0;

  switch (betType) {
    case 'STRAIGHT':
      return parseInt(target, 10) === pocket ? 36 : 0; // 35:1 -> 36x payout
    case 'RED':
      return isRed ? 2 : 0;
    case 'BLACK':
      return isBlack ? 2 : 0;
    case 'EVEN':
      return isEven ? 2 : 0;
    case 'ODD':
      return isOdd ? 2 : 0;
    case 'LOW':
      return pocket >= 1 && pocket <= 18 ? 2 : 0;
    case 'HIGH':
      return pocket >= 19 && pocket <= 36 ? 2 : 0;
    case 'DOZEN_1':
      return pocket >= 1 && pocket <= 12 ? 3 : 0;
    case 'DOZEN_2':
      return pocket >= 13 && pocket <= 24 ? 3 : 0;
    case 'DOZEN_3':
      return pocket >= 25 && pocket <= 36 ? 3 : 0;
    default:
      return 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/roulette/spin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/spin', verifyJWT, async (req, res) => {
  try {
    const { bets } = req.body; // array of { betType, target, amount }

    if (!Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({ message: 'Please place at least one chip on the table.' });
    }

    let totalBet = 0;
    for (const b of bets) {
      const amt = parseInt(b.amount, 10);
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ message: 'Invalid chip wager amount.' });
      }
      totalBet += amt;
    }

    if (totalBet < 10) {
      return res.status(400).json({ message: 'Minimum total wager is 10 credits.' });
    }

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.balance < totalBet) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Spin European Roulette wheel (pocket 0 to 36) using cryptographically secure randomInt
    const pocket = crypto.randomInt(0, 37);
    const color = pocket === 0 ? 'GREEN' : RED_NUMBERS.includes(pocket) ? 'RED' : 'BLACK';

    // Calculate total payout across all chip placements
    let totalPayout = 0;
    const betResults = bets.map((b) => {
      const mult = evaluateBet(b.betType, b.target, pocket);
      const payout = Math.round(parseInt(b.amount, 10) * mult);
      totalPayout += payout;
      return {
        ...b,
        won: mult > 0,
        mult,
        payout,
      };
    });

    const netChange = totalPayout - totalBet;

    // Update balance atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: netChange } },
      { new: true }
    );

    // Record Transaction
    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: totalBet,
      balanceAfter: totalPayout > 0 ? updatedUser.balance + totalBet - totalPayout : updatedUser.balance,
      description: `Roulette spin bet (${totalBet} 🪙 across ${bets.length} chips)`,
    });

    if (totalPayout > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'BET_WON',
        amount: totalPayout,
        balanceAfter: updatedUser.balance,
        description: `Roulette Win on ${pocket} (${color}) = +${totalPayout} 🪙`,
      });
    }

    res.json({
      pocket,
      color,
      totalBet,
      totalPayout,
      netChange,
      betResults,
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('[Roulette] Spin error:', err);
    res.status(500).json({ message: 'Server error spinning roulette wheel.' });
  }
});

module.exports = router;
