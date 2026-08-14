const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/leaderboard?type=alltime|weekly
// Returns top 10 users by totalWon
router.get('/', verifyJWT, async (req, res) => {
  try {
    const type = req.query.type === 'weekly' ? 'weekly' : 'alltime';

    // For weekly we use gamesPlayed as a proxy until we add a weeklyWon field
    // For all-time we sort by totalWon
    const sortField = type === 'weekly' ? 'gamesPlayed' : 'totalWon';

    const top = await User.find(
      { totalWon: { $gt: 0 } },
      { username: 1, totalWon: 1, gamesPlayed: 1, balance: 1 }
    )
      .sort({ [sortField]: -1 })
      .limit(10)
      .lean();

    // Also get current user's rank
    const userId = req.user._id;
    const userDoc = await User.findById(userId).select('username totalWon gamesPlayed').lean();
    const rankCount = await User.countDocuments({ totalWon: { $gt: userDoc?.totalWon || 0 } });
    const userRank = rankCount + 1;

    res.json({ entries: top, userRank, type });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
