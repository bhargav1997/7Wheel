const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/leaderboard?type=alltime|weekly|monthly
// Returns top 10 users & current user rank
router.get('/', verifyJWT, async (req, res) => {
  try {
    const type = ['weekly', 'monthly', 'alltime'].includes(req.query.type) ? req.query.type : 'alltime';
    const sortField = type === 'weekly' ? 'gamesPlayed' : type === 'monthly' ? 'balance' : 'totalWon';

    const top = await User.find(
      { totalWon: { $gte: 0 } },
      { username: 1, totalWon: 1, gamesPlayed: 1, balance: 1 }
    )
      .sort({ [sortField]: -1, totalWon: -1 })
      .limit(10)
      .lean();

    const userId = req.user._id;
    const userDoc = await User.findById(userId).select('username totalWon gamesPlayed balance').lean();
    const targetVal = type === 'weekly' ? (userDoc?.gamesPlayed || 0) : type === 'monthly' ? (userDoc?.balance || 0) : (userDoc?.totalWon || 0);
    const rankCount = await User.countDocuments({ [sortField]: { $gt: targetVal } });
    const userRank = rankCount + 1;

    res.json({ entries: top, userRank, userStats: userDoc, type });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
