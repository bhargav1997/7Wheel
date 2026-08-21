const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const CreditRequest = require('../models/CreditRequest');
const { verifyJWT } = require('../middleware/auth');
// const { CREDIT_PACKS, getPackById } = require('../data/creditPacks');

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
// REAL-MONEY PURCHASE ROUTES (COMMENTED OUT FOR PURE FREE-TO-PLAY SOCIAL GAMING)
// ─────────────────────────────────────────────
/*
router.get('/packs', verifyJWT, async (req, res) => {
  res.json({ packs: CREDIT_PACKS });
});

router.post('/purchase-credits', verifyJWT, async (req, res) => {
  try {
    const { packId, paymentMethod, paymentDetails } = req.body;
    const pack = getPackById(packId);
    if (!pack) return res.status(400).json({ message: 'Invalid credit pack' });
    ...
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
*/

// ─────────────────────────────────────────────
// GET /api/wallet/search-users — search players for credit sharing
// ─────────────────────────────────────────────
router.get('/search-users', verifyJWT, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }

    const cleanQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      _id: { $ne: req.user._id },
      username: { $regex: cleanQuery, $options: 'i' },
    })
      .select('username equipped')
      .limit(8);

    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ message: 'Server error searching players' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet/send-credits — Transfer credits to another player
// ─────────────────────────────────────────────
router.post('/send-credits', verifyJWT, async (req, res) => {
  try {
    const { recipientUsername, amount, note } = req.body;

    const transferAmount = Math.floor(Number(amount));
    if (isNaN(transferAmount) || transferAmount < 1) {
      return res.status(400).json({ message: 'Transfer amount must be at least 1 credit' });
    }

    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return res.status(400).json({ message: 'Recipient username is required' });
    }

    const cleanRecipient = recipientUsername.trim();
    const sender = await User.findById(req.user._id);
    if (!sender) return res.status(404).json({ message: 'Sender not found' });

    if (sender.username.toLowerCase() === cleanRecipient.toLowerCase()) {
      return res.status(400).json({ message: 'You cannot send credits to yourself' });
    }

    if (sender.balance < transferAmount) {
      return res.status(400).json({ message: 'Insufficient credit balance' });
    }

    // Find recipient
    const recipient = await User.findOne({
      username: { $regex: `^${cleanRecipient.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (!recipient) {
      return res.status(404).json({ message: `Player "${cleanRecipient}" not found` });
    }

    // Deduct from sender
    const updatedSender = await User.findByIdAndUpdate(
      sender._id,
      { $inc: { balance: -transferAmount } },
      { new: true }
    );

    // Credit recipient
    const updatedRecipient = await User.findByIdAndUpdate(
      recipient._id,
      { $inc: { balance: transferAmount, creditsEarned: transferAmount } },
      { new: true }
    );

    const cleanNote = note && typeof note === 'string' ? note.trim().slice(0, 120) : '';

    // Record sender transaction
    await Transaction.create({
      userId: sender._id,
      amount: transferAmount,
      type: 'CREDIT_TRANSFER_SENT',
      balanceAfter: updatedSender.balance,
      description: `Sent ${transferAmount.toLocaleString()} credits to @${recipient.username}${cleanNote ? ` ("${cleanNote}")` : ''}`,
    });

    // Record recipient transaction
    await Transaction.create({
      userId: recipient._id,
      amount: transferAmount,
      type: 'CREDIT_TRANSFER_RECEIVED',
      balanceAfter: updatedRecipient.balance,
      description: `Received ${transferAmount.toLocaleString()} credits from @${sender.username}${cleanNote ? ` ("${cleanNote}")` : ''}`,
    });

    // Real-time socket notification to recipient if online
    const io = req.app.get('io');
    if (io) {
      io.emit('credit:transfer_received', {
        recipientId: recipient._id.toString(),
        senderUsername: sender.username,
        amount: transferAmount,
        note: cleanNote,
        recipientNewBalance: updatedRecipient.balance,
      });
    }

    res.json({
      success: true,
      message: `Successfully transferred ${transferAmount.toLocaleString()} credits to @${recipient.username}!`,
      balance: updatedSender.balance,
      recipient: recipient.username,
      amount: transferAmount,
    });
  } catch (err) {
    console.error('Send credits error:', err);
    res.status(500).json({ message: 'Server error processing credit transfer' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet/request-credits — Request credits from another player
// ─────────────────────────────────────────────
router.post('/request-credits', verifyJWT, async (req, res) => {
  try {
    const { recipientUsername, amount, note } = req.body;

    const requestAmount = Math.floor(Number(amount));
    if (isNaN(requestAmount) || requestAmount < 1) {
      return res.status(400).json({ message: 'Requested amount must be at least 1 credit' });
    }

    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return res.status(400).json({ message: 'Target username is required' });
    }

    const cleanRecipient = recipientUsername.trim();
    const requester = await User.findById(req.user._id);
    if (!requester) return res.status(404).json({ message: 'User not found' });

    if (requester.username.toLowerCase() === cleanRecipient.toLowerCase()) {
      return res.status(400).json({ message: 'You cannot request credits from yourself' });
    }

    // Find recipient
    const recipient = await User.findOne({
      username: { $regex: `^${cleanRecipient.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (!recipient) {
      return res.status(404).json({ message: `Player "${cleanRecipient}" not found` });
    }

    // Check if duplicate pending request exists
    const existingPending = await CreditRequest.findOne({
      requesterId: requester._id,
      recipientId: recipient._id,
      status: 'PENDING',
    });

    if (existingPending) {
      return res.status(400).json({ message: `You already have a pending credit request with @${recipient.username}` });
    }

    const cleanNote = note && typeof note === 'string' ? note.trim().slice(0, 120) : '';

    const newRequest = await CreditRequest.create({
      requesterId: requester._id,
      requesterUsername: requester.username,
      recipientId: recipient._id,
      recipientUsername: recipient.username,
      amount: requestAmount,
      note: cleanNote,
      status: 'PENDING',
    });

    // Socket notification
    const io = req.app.get('io');
    if (io) {
      io.emit('credit:request_received', {
        recipientId: recipient._id.toString(),
        requesterUsername: requester.username,
        amount: requestAmount,
        note: cleanNote,
        requestId: newRequest._id,
      });
    }

    res.json({
      success: true,
      message: `Credit request of ${requestAmount.toLocaleString()} credits sent to @${recipient.username}!`,
      request: newRequest,
    });
  } catch (err) {
    console.error('Request credits error:', err);
    res.status(500).json({ message: 'Server error submitting credit request' });
  }
});

// ─────────────────────────────────────────────
// GET /api/wallet/requests — List incoming & outgoing requests
// ─────────────────────────────────────────────
router.get('/requests', verifyJWT, async (req, res) => {
  try {
    const incoming = await CreditRequest.find({
      recipientId: req.user._id,
      status: 'PENDING',
    }).sort({ createdAt: -1 });

    const outgoing = await CreditRequest.find({
      requesterId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      incoming,
      outgoing,
    });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ message: 'Server error fetching requests' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet/respond-request — Accept or Decline incoming request
// ─────────────────────────────────────────────
router.post('/respond-request', verifyJWT, async (req, res) => {
  try {
    const { requestId, action } = req.body; // 'ACCEPT' | 'DECLINE'

    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return res.status(400).json({ message: 'Action must be ACCEPT or DECLINE' });
    }

    const creditReq = await CreditRequest.findById(requestId);
    if (!creditReq) {
      return res.status(404).json({ message: 'Credit request not found' });
    }

    if (creditReq.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });
    }

    if (creditReq.status !== 'PENDING') {
      return res.status(400).json({ message: `This request has already been ${creditReq.status.toLowerCase()}` });
    }

    if (action === 'DECLINE') {
      creditReq.status = 'DECLINED';
      await creditReq.save();
      return res.json({
        success: true,
        message: `Declined credit request from @${creditReq.requesterUsername}`,
        request: creditReq,
      });
    }

    // Handle ACCEPT (Transfer credits)
    const payer = await User.findById(req.user._id);
    if (payer.balance < creditReq.amount) {
      return res.status(400).json({ message: 'Insufficient credit balance to fulfill this request' });
    }

    const requester = await User.findById(creditReq.requesterId);
    if (!requester) {
      return res.status(404).json({ message: 'Requester account no longer exists' });
    }

    // Deduct from payer (user responding)
    const updatedPayer = await User.findByIdAndUpdate(
      payer._id,
      { $inc: { balance: -creditReq.amount } },
      { new: true }
    );

    // Credit requester
    const updatedRequester = await User.findByIdAndUpdate(
      requester._id,
      { $inc: { balance: creditReq.amount, creditsEarned: creditReq.amount } },
      { new: true }
    );

    creditReq.status = 'ACCEPTED';
    await creditReq.save();

    // Transactions
    await Transaction.create({
      userId: payer._id,
      amount: creditReq.amount,
      type: 'CREDIT_TRANSFER_SENT',
      balanceAfter: updatedPayer.balance,
      description: `Fulfilled credit request from @${requester.username} (${creditReq.amount.toLocaleString()} 🪙)`,
    });

    await Transaction.create({
      userId: requester._id,
      amount: creditReq.amount,
      type: 'CREDIT_TRANSFER_RECEIVED',
      balanceAfter: updatedRequester.balance,
      description: `@${payer.username} accepted your request for ${creditReq.amount.toLocaleString()} 🪙`,
    });

    // Notify requester via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('credit:request_accepted', {
        requesterId: requester._id.toString(),
        payerUsername: payer.username,
        amount: creditReq.amount,
        requesterNewBalance: updatedRequester.balance,
      });
    }

    res.json({
      success: true,
      message: `Accepted request! Sent ${creditReq.amount.toLocaleString()} credits to @${requester.username}`,
      balance: updatedPayer.balance,
      request: creditReq,
    });
  } catch (err) {
    console.error('Respond request error:', err);
    res.status(500).json({ message: 'Server error responding to request' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet/cancel-request — Cancel an outgoing request
// ─────────────────────────────────────────────
router.post('/cancel-request', verifyJWT, async (req, res) => {
  try {
    const { requestId } = req.body;
    const creditReq = await CreditRequest.findById(requestId);
    if (!creditReq) return res.status(404).json({ message: 'Request not found' });

    if (creditReq.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (creditReq.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled' });
    }

    creditReq.status = 'CANCELLED';
    await creditReq.save();

    res.json({ success: true, message: 'Request cancelled', request: creditReq });
  } catch (err) {
    res.status(500).json({ message: 'Server error cancelling request' });
  }
});

// ─────────────────────────────────────────────
// GET /api/wallet/transactions — history
// ─────────────────────────────────────────────
router.get('/transactions', verifyJWT, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);
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

    const transfers = await Transaction.aggregate([
      { $match: { type: 'CREDIT_TRANSFER_SENT' } },
      { $group: { _id: null, totalTransferred: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const wagers = await Transaction.aggregate([
      { $match: { type: 'BET_PLACED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const earnings = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$platformEarnings' } } },
    ]);

    const totalRounds = await GameRound.countDocuments({ status: 'RESULT' });
    const totalUsers = await User.countDocuments({ role: 'user' });

    res.json({
      totalTransferredCredits: transfers[0]?.totalTransferred || 0,
      totalTransfersCount: transfers[0]?.count || 0,
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
