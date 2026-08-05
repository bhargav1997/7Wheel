const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/wallet/balance — get current balance
// ─────────────────────────────────────────────
router.get('/balance', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('balance username');
    res.json({ balance: user.balance, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet/deposit — add credits
// ─────────────────────────────────────────────
router.post('/deposit', verifyJWT, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ message: 'Minimum deposit is $1' });
    }
    if (amount > 10000) {
      return res.status(400).json({ message: 'Maximum deposit is $10,000' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: amount } },
      { new: true }
    );

    await Transaction.create({
      userId: req.user._id,
      amount,
      type: 'DEPOSIT',
      balanceAfter: user.balance,
      description: `Deposit of $${amount}`,
    });

    res.json({
      message: `Deposited $${amount} successfully`,
      balance: user.balance,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/wallet/transactions — history
// ─────────────────────────────────────────────
router.get('/transactions', verifyJWT, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
