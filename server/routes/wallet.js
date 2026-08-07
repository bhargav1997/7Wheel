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
    const { amount, paymentMethod, paymentDetails } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ message: 'Minimum deposit is $1' });
    }
    if (amount > 10000) {
      return res.status(400).json({ message: 'Maximum deposit is $10,000' });
    }

    if (!['CARD', 'PAYPAL'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (paymentMethod === 'CARD') {
      const { cardNumber, cardExpiry, cardCvc } = paymentDetails || {};
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        return res.status(400).json({ message: 'Invalid card number' });
      }
      if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        return res.status(400).json({ message: 'Expiry format must be MM/YY' });
      }
      if (!cardCvc || cardCvc.length !== 3) {
        return res.status(400).json({ message: 'Invalid CVC' });
      }
    } else if (paymentMethod === 'PAYPAL') {
      const { email } = paymentDetails || {};
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Invalid PayPal account' });
      }
    }

    // Simulate payment processor success delay (handled by client, save here)
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: amount } },
      { new: true }
    );

    const maskedDetail = paymentMethod === 'CARD'
      ? `Card (ending in ${paymentDetails.cardNumber.slice(-4)})`
      : `PayPal (${paymentDetails.email})`;

    await Transaction.create({
      userId: req.user._id,
      amount,
      type: 'DEPOSIT',
      balanceAfter: user.balance,
      description: `Deposit of $${amount} via ${maskedDetail}`,
    });

    res.json({
      message: `Deposited $${amount} successfully via ${paymentMethod}`,
      balance: user.balance,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet/withdraw — request withdrawal
// ─────────────────────────────────────────────
router.post('/withdraw', verifyJWT, async (req, res) => {
  try {
    const { amount, payoutMethod, payoutDetails } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal is $10.00' });
    }
    if (amount > 50000) {
      return res.status(400).json({ message: 'Maximum withdrawal is $50,000' });
    }

    // Check user balance
    const user = await User.findById(req.user._id).select('balance');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ message: `Insufficient balance. You have $${user.balance.toFixed(2)}` });
    }

    // Validate payout method
    if (!['PAYPAL', 'BANK'].includes(payoutMethod)) {
      return res.status(400).json({ message: 'Invalid payout method. Use PAYPAL or BANK.' });
    }

    if (payoutMethod === 'PAYPAL') {
      const { email } = payoutDetails || {};
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid PayPal email is required' });
      }
    } else if (payoutMethod === 'BANK') {
      const { accountName, accountNumber, routingNumber } = payoutDetails || {};
      if (!accountName || accountName.trim().length < 2) {
        return res.status(400).json({ message: 'Account holder name is required' });
      }
      if (!accountNumber || accountNumber.length < 6) {
        return res.status(400).json({ message: 'Valid account number is required' });
      }
      if (!routingNumber || routingNumber.length < 6) {
        return res.status(400).json({ message: 'Valid routing number is required' });
      }
    }

    // Processing fee: 5% of the withdrawal amount
    const processingFee = parseFloat((amount * 0.05).toFixed(2));
    const netPayout = parseFloat((amount - processingFee).toFixed(2));

    // Deduct full amount from user balance
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: -amount } },
      { new: true }
    );

    // Ensure balance didn't go negative (race condition safeguard)
    if (updatedUser.balance < 0) {
      // Revert
      await User.findByIdAndUpdate(req.user._id, { $inc: { balance: amount } });
      return res.status(400).json({ message: 'Withdrawal failed — balance race condition. Try again.' });
    }

    const methodLabel = payoutMethod === 'PAYPAL'
      ? `PayPal (${payoutDetails.email})`
      : `Bank (****${payoutDetails.accountNumber.slice(-4)})`;

    await Transaction.create({
      userId: req.user._id,
      amount: -amount,
      type: 'WITHDRAWAL',
      balanceAfter: updatedUser.balance,
      description: `Withdrawal of $${amount} (fee $${processingFee}, net $${netPayout}) via ${methodLabel}`,
    });

    res.json({
      message: `Withdrawal of $${amount} submitted (fee $${processingFee}, net payout $${netPayout})`,
      balance: updatedUser.balance,
      processingFee,
      netPayout,
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ message: 'Server error processing withdrawal' });
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

// ─────────────────────────────────────────────
// GET /api/wallet/admin/stats — platform margins
// ─────────────────────────────────────────────
const GameRound = require('../models/GameRound');
router.get('/admin/stats', verifyJWT, async (req, res) => {
  try {
    // Secure guard for admin role
    const userObj = await User.findById(req.user._id);
    if (!userObj || userObj.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin role required' });
    }

    // 1. Total money deposited
    const deposits = await Transaction.aggregate([
      { $match: { type: 'DEPOSIT' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // 2. Total money wagered
    const wagers = await Transaction.aggregate([
      { $match: { type: 'BET_PLACED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // 3. Platform commission / earnings from rounds
    const earnings = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$platformEarnings' } } },
    ]);

    const totalRounds = await GameRound.countDocuments({ status: 'RESULT' });

    res.json({
      totalDeposited: deposits[0]?.total || 0,
      totalWagered: wagers[0]?.total || 0,
      platformEarnings: earnings[0]?.total || 0,
      totalRounds,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error retrieving statistics' });
  }
});

module.exports = router;
