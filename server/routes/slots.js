const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Symbol table & paytable
// ─────────────────────────────────────────────────────────────────────────────

// Weighted reel strip — more common symbols appear more often
const REEL_STRIP = [
  'cherry', 'cherry', 'cherry', 'cherry',  // 4/20 = 20%
  'lemon',  'lemon',  'lemon',             // 3/20 = 15%
  'bell',   'bell',   'bell',              // 3/20 = 15%
  'star',   'star',   'star',              // 3/20 = 15%
  'gem',    'gem',                         // 2/20 = 10%
  'bar',    'bar',                         // 2/20 = 10%
  'seven',                                 // 1/20 =  5%
  'wild',                                  // 1/20 =  5% — substitutes any
];

// Returns a random symbol from the reel strip
const spinReel = () => REEL_STRIP[Math.floor(Math.random() * REEL_STRIP.length)];

// Paytable: multiplier on bet for 3-of-a-kind (or special rules)
const PAYTABLE = {
  seven:  50,
  gem:    25,
  bar:    15,
  star:   10,
  lemon:   5,
  bell:    8,
  cherry:  3,
};

/**
 * Evaluate the three reels and return { win: bool, payout: number, combo: string }.
 * Wild substitutes any symbol.
 */
const evaluateSpin = (reels, betAmount) => {
  const [a, b, c] = reels;

  // Resolve wilds — collect non-wild symbols
  const nonWild = reels.filter((s) => s !== 'wild');

  // All wilds → treat as seven (jackpot)
  if (nonWild.length === 0) {
    const mult = PAYTABLE['seven'];
    return { win: true, payout: Math.round(betAmount * mult), combo: 'seven', multiplier: mult };
  }

  // Check 3-of-a-kind (with wild substitution)
  const base = nonWild[0];
  const isThreeOfAKind = nonWild.every((s) => s === base);

  if (isThreeOfAKind) {
    const mult = PAYTABLE[base] ?? 1;
    return { win: true, payout: Math.round(betAmount * mult), combo: base, multiplier: mult };
  }

  // Any two cherries → 1.5×
  const cherryCount = reels.filter((s) => s === 'cherry' || s === 'wild').length;
  if (cherryCount >= 2 && (a === 'cherry' || b === 'cherry' || c === 'cherry')) {
    const mult = 1.5;
    return { win: true, payout: Math.round(betAmount * mult), combo: 'cherry2', multiplier: mult };
  }

  return { win: false, payout: 0, combo: 'none', multiplier: 0 };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/slots/spin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/spin', verifyJWT, async (req, res) => {
  try {
    const { betAmount } = req.body;
    const bet = parseInt(betAmount, 10);

    if (isNaN(bet) || bet < 10) {
      return res.status(400).json({ message: 'Minimum bet is 10 credits.' });
    }

    // Fetch fresh balance
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Spin all three reels server-side
    const reels = [spinReel(), spinReel(), spinReel()];
    const { win, payout, combo, multiplier } = evaluateSpin(reels, bet);

    // Net change: deduct bet, add payout
    const netChange = payout - bet;
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { balance: netChange } },
      { new: true }
    );

    // Record bet transaction
    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: bet,
      balanceAfter: win ? updatedUser.balance + bet - payout : updatedUser.balance, // balance after deduction
      description: `Slot Machine spin — bet ${bet} 🪙`,
    });

    // Record win transaction if applicable
    if (win && payout > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: updatedUser.balance,
        description: `Slot Machine win — ${combo} (${multiplier}×) = +${payout} 🪙`,
      });
    }

    res.json({
      reels,
      win,
      payout,
      combo,
      multiplier,
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('[Slots] Spin error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;
