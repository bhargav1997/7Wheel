const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Active active game sessions in-memory (userId -> gameState)
const activeMinesGames = new Map();

/**
 * Calculate the exact multiplier for revealing `k` safe tiles out of 25 with `m` mines.
 * Fair probability multiplier with a 97% RTP (3% house edge).
 */
const calculateMinesMultiplier = (totalTiles, mineCount, revealedCount) => {
  if (revealedCount === 0) return 1.0;
  
  let probability = 1.0;
  const safeCount = totalTiles - mineCount;

  for (let i = 0; i < revealedCount; i++) {
    probability *= (safeCount - i) / (totalTiles - i);
  }

  // Fair multiplier = (1 / probability) * 0.97 (97% RTP)
  const rawMult = (1 / probability) * 0.97;
  return Math.max(1.01, parseFloat(rawMult.toFixed(2)));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mines/start — Start a new Mines game session
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', verifyJWT, async (req, res) => {
  try {
    const { betAmount, mineCount } = req.body;
    const bet = parseInt(betAmount, 10);
    const mines = parseInt(mineCount, 10);

    if (isNaN(bet) || bet < 1) {
      return res.status(400).json({ message: 'Minimum bet is 1 credit.' });
    }

    if (isNaN(mines) || mines < 1 || mines > 24) {
      return res.status(400).json({ message: 'Mines count must be between 1 and 24.' });
    }

    const userId = req.user._id.toString();

    // Check balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Generate random mine indices on a 25-tile grid (0 to 24) using cryptographically secure randomInt
    const minePositions = new Set();
    while (minePositions.size < mines) {
      const pos = crypto.randomInt(0, 25);
      minePositions.add(pos);
    }

    // Deduct bet from balance
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: -bet } },
      { new: true }
    );

    // Record Transaction
    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: bet,
      balanceAfter: updatedUser.balance,
      description: `Mines game started — bet ${bet} 🪙 with ${mines} mines`,
    });

    // Store active game session
    const gameState = {
      userId,
      betAmount: bet,
      mineCount: mines,
      minePositions: Array.from(minePositions),
      revealedTiles: [], // array of tile indices revealed so far
      status: 'IN_PROGRESS', // IN_PROGRESS, CASHOUT, BUSTED
    };

    activeMinesGames.set(userId, gameState);

    res.json({
      status: 'IN_PROGRESS',
      betAmount: bet,
      mineCount: mines,
      revealedTiles: [],
      currentMultiplier: 1.0,
      nextMultiplier: calculateMinesMultiplier(25, mines, 1),
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('[Mines] Start error:', err);
    res.status(500).json({ message: 'Server error starting game.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mines/reveal — Reveal a tile (0 to 24)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reveal', verifyJWT, async (req, res) => {
  try {
    const { tileIndex } = req.body;
    const tile = parseInt(tileIndex, 10);
    const userId = req.user._id.toString();

    const game = activeMinesGames.get(userId);
    if (!game || game.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active Mines game found. Please start a new game.' });
    }

    if (isNaN(tile) || tile < 0 || tile > 24) {
      return res.status(400).json({ message: 'Invalid tile index.' });
    }

    if (game.revealedTiles.includes(tile)) {
      return res.status(400).json({ message: 'Tile already revealed.' });
    }

    // Check if tile is a mine!
    const isMine = game.minePositions.includes(tile);

    if (isMine) {
      // Game over — BUSTED
      game.status = 'BUSTED';
      game.revealedTiles.push(tile);
      activeMinesGames.delete(userId);

      return res.json({
        status: 'BUSTED',
        hitTile: tile,
        minePositions: game.minePositions, // reveal all mines to client
        payout: 0,
        currentMultiplier: 0,
      });
    }

    // Safe tile revealed!
    game.revealedTiles.push(tile);
    const revealedCount = game.revealedTiles.length;
    const maxSafe = 25 - game.mineCount;

    const currentMultiplier = calculateMinesMultiplier(25, game.mineCount, revealedCount);
    const nextMultiplier = revealedCount < maxSafe ? calculateMinesMultiplier(25, game.mineCount, revealedCount + 1) : currentMultiplier;

    // If all safe tiles revealed -> Auto Cashout!
    if (revealedCount === maxSafe) {
      game.status = 'CASHOUT';
      activeMinesGames.delete(userId);

      const payout = Math.round(game.betAmount * currentMultiplier);

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: payout } },
        { new: true }
      );

      await Transaction.create({
        userId: req.user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: updatedUser.balance,
        description: `Mines MAX Win! Uncovered all ${maxSafe} gems (${currentMultiplier}×) = +${payout} 🪙`,
      });

      return res.json({
        status: 'CASHOUT',
        hitTile: null,
        minePositions: game.minePositions,
        revealedTiles: game.revealedTiles,
        payout,
        currentMultiplier,
        balanceAfter: updatedUser.balance,
        maxCleared: true,
      });
    }

    res.json({
      status: 'IN_PROGRESS',
      hitTile: null,
      revealedTiles: game.revealedTiles,
      currentMultiplier,
      nextMultiplier,
      payout: Math.round(game.betAmount * currentMultiplier),
    });
  } catch (err) {
    console.error('[Mines] Reveal error:', err);
    res.status(500).json({ message: 'Server error revealing tile.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mines/cashout — Cash out current multiplier
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cashout', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const game = activeMinesGames.get(userId);

    if (!game || game.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active Mines game to cash out.' });
    }

    if (game.revealedTiles.length === 0) {
      return res.status(400).json({ message: 'Must reveal at least 1 safe tile before cashing out.' });
    }

    const currentMultiplier = calculateMinesMultiplier(25, game.mineCount, game.revealedTiles.length);
    const payout = Math.round(game.betAmount * currentMultiplier);

    game.status = 'CASHOUT';
    activeMinesGames.delete(userId);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: payout } },
      { new: true }
    );

    await Transaction.create({
      userId: req.user._id,
      type: 'BET_WON',
      amount: payout,
      balanceAfter: updatedUser.balance,
      description: `Mines Cashout (${game.revealedTiles.length} gems revealed, ${currentMultiplier}×) = +${payout} 🪙`,
    });

    res.json({
      status: 'CASHOUT',
      minePositions: game.minePositions,
      revealedTiles: game.revealedTiles,
      payout,
      currentMultiplier,
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('[Mines] Cashout error:', err);
    res.status(500).json({ message: 'Server error cashing out.' });
  }
});

module.exports = router;
