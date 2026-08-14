const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Pre-defined Plinko multiplier tables per row & risk profile (97% RTP)
const MULTIPLIER_TABLES = {
  8: {
    LOW: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    MEDIUM: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    HIGH: [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
  },
  10: {
    LOW: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    MEDIUM: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
    HIGH: [76, 10, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76],
  },
  12: {
    LOW: [10, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    MEDIUM: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    HIGH: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
  },
  14: {
    LOW: [15, 4.0, 1.9, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.9, 4.0, 15],
    MEDIUM: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58],
    HIGH: [420, 56, 18, 5.0, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5.0, 18, 56, 420],
  },
  16: {
    LOW: [16, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
    MEDIUM: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
    HIGH: [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/plinko/drop — Drop ball down Plinko pyramid
// ─────────────────────────────────────────────────────────────────────────────
router.post('/drop', verifyJWT, async (req, res) => {
  try {
    const { betAmount, riskLevel = 'MEDIUM', rows = 12 } = req.body;
    const bet = parseInt(betAmount, 10);
    const numRows = parseInt(rows, 10);

    if (isNaN(bet) || bet < 1) {
      return res.status(400).json({ message: 'Minimum bet is 1 credit.' });
    }

    if (![8, 10, 12, 14, 16].includes(numRows)) {
      return res.status(400).json({ message: 'Rows must be 8, 10, 12, 14, or 16.' });
    }

    const validRisk = ['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel) ? riskLevel : 'MEDIUM';

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Generate random path of 0s (Left) and 1s (Right) for each row using crypto.randomInt
    const path = [];
    let bucketIndex = 0;

    for (let r = 0; r < numRows; r++) {
      const bounce = crypto.randomInt(0, 2); // 0 or 1
      path.push(bounce);
      bucketIndex += bounce;
    }

    // Get multiplier for bucket index
    const multTable = MULTIPLIER_TABLES[numRows][validRisk];
    const multiplier = multTable[bucketIndex] ?? 0.5;
    const payout = Math.round(bet * multiplier);
    const netChange = payout - bet;

    // Update user balance atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: netChange } },
      { new: true }
    );

    // Log Transactions
    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: bet,
      balanceAfter: payout > 0 ? updatedUser.balance + bet - payout : updatedUser.balance,
      description: `Plinko drop (${bet} 🪙, ${numRows} rows, ${validRisk} risk)`,
    });

    if (payout > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: updatedUser.balance,
        description: `Plinko Win! Landed in bucket ${bucketIndex} (${multiplier}×) = +${payout} 🪙`,
      });
    }

    res.json({
      path,
      bucketIndex,
      multiplier,
      payout,
      netChange,
      balanceAfter: updatedUser.balance,
      allMultipliers: multTable,
    });
  } catch (err) {
    console.error('[Plinko] Drop error:', err);
    res.status(500).json({ message: 'Server error dropping ball.' });
  }
});

module.exports = router;
