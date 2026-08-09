const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');
const { CREDIT_PACKS, getPackById } = require('../data/creditPacks');

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
// GET /api/wallet/packs — list available credit packs
// ─────────────────────────────────────────────
router.get('/packs', verifyJWT, async (req, res) => {
  res.json({ packs: CREDIT_PACKS });
});

// ─────────────────────────────────────────────
// POST /api/wallet/purchase-credits — buy a credit pack
// ─────────────────────────────────────────────
// NOTE: Credits are virtual entertainment tokens.
//       They have NO real-world monetary value and
//       CANNOT be withdrawn or redeemed for cash.
// ─────────────────────────────────────────────
router.post('/purchase-credits', verifyJWT, async (req, res) => {
  try {
    const { packId, paymentMethod, paymentDetails } = req.body;

    // Validate pack
    const pack = getPackById(packId);
    if (!pack) {
      return res.status(400).json({ message: 'Invalid credit pack selected' });
    }

    // Only card payments accepted
    if (paymentMethod !== 'CARD') {
      return res.status(400).json({ message: 'Only card payments are accepted' });
    }

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

    // Total credits to award
    const totalCredits = pack.credits + pack.bonusCredits;

    // Credit the user's balance
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $inc: {
          balance: totalCredits,
          creditsEarned: totalCredits,
        },
      },
      { new: true }
    );

    const maskedDetail = `Card ending in ${paymentDetails.cardNumber.slice(-4)}`;

    await Transaction.create({
      userId: req.user._id,
      amount: pack.priceUSD,
      type: 'CREDIT_PURCHASE',
      packId: pack.id,
      creditsPurchased: totalCredits,
      balanceAfter: user.balance,
      description: `Purchased ${pack.label}: ${pack.credits} credits${pack.bonusCredits > 0 ? ` + ${pack.bonusCredits} bonus` : ''} for $${pack.priceUSD} via ${maskedDetail}`,
    });

    res.json({
      message: `Purchased ${totalCredits.toLocaleString()} credits!`,
      balance: user.balance,
      creditsPurchased: totalCredits,
      pack: {
        id: pack.id,
        label: pack.label,
        credits: pack.credits,
        bonusCredits: pack.bonusCredits,
        priceUSD: pack.priceUSD,
      },
    });
  } catch (err) {
    console.error('Purchase credits error:', err);
    res.status(500).json({ message: 'Server error processing credit purchase' });
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
    const userObj = await User.findById(req.user._id);
    if (!userObj || userObj.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin role required' });
    }

    // 1. Total real money taken in from credit purchases
    const purchases = await Transaction.aggregate([
      { $match: { type: 'CREDIT_PURCHASE' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCredits: { $sum: '$creditsPurchased' } } },
    ]);

    // 2. Total credits wagered
    const wagers = await Transaction.aggregate([
      { $match: { type: 'BET_PLACED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // 3. Platform commission from rounds
    const earnings = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$platformEarnings' } } },
    ]);

    const totalRounds = await GameRound.countDocuments({ status: 'RESULT' });
    const totalUsers = await User.countDocuments({ role: 'user' });

    res.json({
      totalRevenue: purchases[0]?.totalRevenue || 0,
      totalCreditsSold: purchases[0]?.totalCredits || 0,
      totalWagered: wagers[0]?.total || 0,
      platformEarnings: earnings[0]?.total || 0,
      totalRounds,
      totalUsers,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error retrieving statistics' });
  }
});

module.exports = router;
