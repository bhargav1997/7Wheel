const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');
const GameRound = require('../models/GameRound');

// GET /api/bets/history?page=1&limit=10
router.get('/history', verifyJWT, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 15);
    const skip = (page - 1) * limit;
    const userId = req.user._id.toString();

    // Find rounds where this user placed a bet
    const rounds = await GameRound.find(
      { 'bets.userId': req.user._id, status: 'RESULT' },
      { roundNumber: 1, result: 1, winningCategory: 1, totalPot: 1, endedAt: 1, 'bets.$': 1 }
    )
      .sort({ endedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await GameRound.countDocuments({ 'bets.userId': req.user._id, status: 'RESULT' });

    const history = rounds.map((r) => {
      // bets.$: 1 projection returns only first matching bet — use filter to be safe
      const myBet = r.bets.find((b) => b.userId.toString() === userId);
      return {
        roundNumber: r.roundNumber,
        result: r.result,
        winningCategory: r.winningCategory,
        totalPot: r.totalPot,
        endedAt: r.endedAt,
        bet: myBet
          ? {
              choice: myBet.choice,
              amount: myBet.amount,
              payout: myBet.payout,
              won: myBet.won,
            }
          : null,
      };
    });

    res.json({ history, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error('Bet history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
