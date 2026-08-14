const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// GET /api/bets/history?page=1&limit=15
router.get('/history', verifyJWT, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 15);
    const skip = (page - 1) * limit;

    // Fetch user transactions across ALL casino mini-games & rewards
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments({ userId: req.user._id });

    res.json({
      history: transactions,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('[Bets] History error:', err);
    res.status(500).json({ message: 'Server error fetching history.' });
  }
});

module.exports = router;
