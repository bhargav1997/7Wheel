const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Active tower sessions in memory (userId -> gameState)
const activeTowerGames = new Map();

// ── Difficulty Configurations ────────────────────────────────────────────────
// 9 Floors total (Floor 0 to 8)
const TOWER_CONFIGS = {
  EASY: {
    doorsPerFloor: 4,
    trapsPerFloor: 1, // 3 Safe, 1 Trap (75% win chance per floor)
    multipliers: [1.29, 1.69, 2.21, 2.89, 3.78, 4.94, 6.46, 8.45, 11.05],
  },
  MEDIUM: {
    doorsPerFloor: 3,
    trapsPerFloor: 1, // 2 Safe, 1 Trap (66.6% win chance per floor)
    multipliers: [1.45, 2.13, 3.12, 4.58, 6.72, 9.86, 14.47, 21.23, 31.14],
  },
  HARD: {
    doorsPerFloor: 2,
    trapsPerFloor: 1, // 1 Safe, 1 Trap (50% win chance per floor)
    multipliers: [1.94, 3.80, 7.45, 14.60, 28.62, 56.09, 109.94, 215.48, 422.34],
  },
  MASTER: {
    doorsPerFloor: 3,
    trapsPerFloor: 2, // 1 Safe, 2 Traps (33.3% win chance per floor)
    multipliers: [2.91, 8.55, 25.14, 73.91, 217.30, 638.86, 1878.25, 5522.05, 16234.80],
  },
};

// ── Generate 9-Floor Secret Layout ───────────────────────────────────────────
// For each floor, create an array of booleans where true = safe, false = trap
const generateTowerLayout = (difficulty) => {
  const cfg = TOWER_CONFIGS[difficulty] || TOWER_CONFIGS.MEDIUM;
  const floors = [];

  for (let f = 0; f < 9; f++) {
    const floorDoors = new Array(cfg.doorsPerFloor).fill(true);
    // Assign trap indices
    const trapIndices = new Set();
    while (trapIndices.size < cfg.trapsPerFloor) {
      trapIndices.add(crypto.randomInt(0, cfg.doorsPerFloor));
    }
    trapIndices.forEach((idx) => {
      floorDoors[idx] = false;
    });
    floors.push(floorDoors);
  }

  return floors;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tower/start — Start a new Tower Climb session
// Body: { betAmount: number, difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MASTER' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', verifyJWT, async (req, res) => {
  try {
    const { betAmount, difficulty = 'MEDIUM' } = req.body;
    const bet = parseInt(betAmount, 10);
    const diffKey = String(difficulty).toUpperCase();

    if (!TOWER_CONFIGS[diffKey]) {
      return res.status(400).json({ message: 'Invalid difficulty selected.' });
    }

    if (isNaN(bet) || bet < 1) {
      return res.status(400).json({ message: 'Minimum bet is 1 credit.' });
    }

    const userId = req.user._id.toString();

    // Check if player has an existing uncompleted session
    if (activeTowerGames.has(userId)) {
      const existing = activeTowerGames.get(userId);
      return res.json({
        message: 'Resuming active climb session.',
        game: {
          difficulty: existing.difficulty,
          betAmount: existing.betAmount,
          currentFloor: existing.currentFloor,
          currentMultiplier: existing.currentMultiplier,
          currentPayout: Math.floor(existing.betAmount * existing.currentMultiplier),
          history: existing.history,
          doorsPerFloor: existing.doorsPerFloor,
          multipliers: TOWER_CONFIGS[existing.difficulty].multipliers,
        },
      });
    }

    // Check balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // Deduct bet from balance
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: -bet } },
      { new: true }
    );

    // Record Bet Transaction
    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: bet,
      balanceAfter: updatedUser.balance,
      description: `Tower of Fortune climb started (${diffKey}) — bet ${bet} 🪙`,
    });

    const layout = generateTowerLayout(diffKey);

    const gameState = {
      userId,
      difficulty: diffKey,
      betAmount: bet,
      currentFloor: 0, // 0 = ready to pick floor 0 (1st floor)
      currentMultiplier: 1.0,
      layout, // Secret 9-floor layout
      history: [], // [{ floor: 0, doorIndex: 1, isSafe: true }]
      doorsPerFloor: TOWER_CONFIGS[diffKey].doorsPerFloor,
    };

    activeTowerGames.set(userId, gameState);

    return res.json({
      message: 'Tower climb started!',
      balance: updatedUser.balance,
      game: {
        difficulty: diffKey,
        betAmount: bet,
        currentFloor: 0,
        currentMultiplier: 1.0,
        currentPayout: bet,
        history: [],
        doorsPerFloor: TOWER_CONFIGS[diffKey].doorsPerFloor,
        multipliers: TOWER_CONFIGS[diffKey].multipliers,
      },
    });
  } catch (err) {
    console.error('Tower start error:', err);
    return res.status(500).json({ message: 'Server error starting Tower climb.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tower/step — Pick a door on the active floor
// Body: { doorIndex: number }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/step', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const gameState = activeTowerGames.get(userId);

    if (!gameState) {
      return res.status(400).json({ message: 'No active Tower climb found. Start a new game!' });
    }

    const { doorIndex } = req.body;
    const door = parseInt(doorIndex, 10);
    const cfg = TOWER_CONFIGS[gameState.difficulty];

    if (isNaN(door) || door < 0 || door >= cfg.doorsPerFloor) {
      return res.status(400).json({ message: `Invalid door selection (0 to ${cfg.doorsPerFloor - 1}).` });
    }

    const currentFloor = gameState.currentFloor;
    if (currentFloor >= 9) {
      return res.status(400).json({ message: 'Tower already completed!' });
    }

    const floorLayout = gameState.layout[currentFloor];
    const isSafe = floorLayout[door] === true;

    if (!isSafe) {
      // Hit a trap skull! Round is lost
      const fullLayout = gameState.layout;
      activeTowerGames.delete(userId);

      // Increment games played
      await User.findByIdAndUpdate(userId, { $inc: { gamesPlayed: 1 } });

      return res.json({
        status: 'BUSTED',
        isSafe: false,
        pickedFloor: currentFloor,
        pickedDoor: door,
        revealedFloor: floorLayout,
        fullLayout, // Reveal all floors on loss
        message: '💥 Skull Trap hit! Better luck on the next climb.',
      });
    }

    // Safe door picked!
    const newMultiplier = cfg.multipliers[currentFloor];
    gameState.currentFloor += 1;
    gameState.currentMultiplier = newMultiplier;
    gameState.history.push({ floor: currentFloor, doorIndex: door, isSafe: true });

    // Check if reached top of the Tower (Floor 9 cleared)
    if (gameState.currentFloor === 9) {
      const payout = Math.floor(gameState.betAmount * newMultiplier);
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: payout, gamesPlayed: 1 } },
        { new: true }
      );

      // Record Win Transaction
      await Transaction.create({
        userId,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: updatedUser.balance,
        description: `Tower of Fortune CONQUERED (${gameState.difficulty}) — won ${payout} 🪙 (${newMultiplier}×)`,
      });

      const fullLayout = gameState.layout;
      activeTowerGames.delete(userId);

      return res.json({
        status: 'CONQUERED',
        isSafe: true,
        pickedFloor: currentFloor,
        pickedDoor: door,
        currentFloor: 9,
        currentMultiplier: newMultiplier,
        payout,
        balance: updatedUser.balance,
        fullLayout,
        message: `🏆 TOWER CONQUERED! Won +${payout.toLocaleString()} Credits (${newMultiplier}×)!`,
      });
    }

    // Continue climbing
    const currentPayout = Math.floor(gameState.betAmount * newMultiplier);
    return res.json({
      status: 'SAFE',
      isSafe: true,
      pickedFloor: currentFloor,
      pickedDoor: door,
      currentFloor: gameState.currentFloor,
      currentMultiplier: newMultiplier,
      currentPayout,
      history: gameState.history,
      message: `💎 Safe! Multiplier is now ${newMultiplier}×. Climb higher or Cash Out!`,
    });
  } catch (err) {
    console.error('Tower step error:', err);
    return res.status(500).json({ message: 'Server error stepping on Tower.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tower/cashout — Cash out current accrued profit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cashout', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const gameState = activeTowerGames.get(userId);

    if (!gameState) {
      return res.status(400).json({ message: 'No active Tower climb to cash out.' });
    }

    if (gameState.currentFloor === 0) {
      return res.status(400).json({ message: 'Climb at least 1 floor before cashing out.' });
    }

    const multiplier = gameState.currentMultiplier;
    const payout = Math.floor(gameState.betAmount * multiplier);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: payout, gamesPlayed: 1 } },
      { new: true }
    );

    // Record Win Transaction
    await Transaction.create({
      userId,
      type: 'BET_WON',
      amount: payout,
      balanceAfter: updatedUser.balance,
      description: `Tower of Fortune cashout (${gameState.difficulty}, Floor ${gameState.currentFloor}) — won ${payout} 🪙 (${multiplier}×)`,
    });

    const fullLayout = gameState.layout;
    activeTowerGames.delete(userId);

    return res.json({
      status: 'CASHED_OUT',
      payout,
      multiplier,
      floorReached: gameState.currentFloor,
      balance: updatedUser.balance,
      fullLayout,
      message: `💰 Cashed out +${payout.toLocaleString()} Credits at ${multiplier}×!`,
    });
  } catch (err) {
    console.error('Tower cashout error:', err);
    return res.status(500).json({ message: 'Server error during Tower cashout.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tower/state — Get active climb session
// ─────────────────────────────────────────────────────────────────────────────
router.get('/state', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const gameState = activeTowerGames.get(userId);

    if (!gameState) {
      return res.json({ active: false });
    }

    const cfg = TOWER_CONFIGS[gameState.difficulty];
    return res.json({
      active: true,
      game: {
        difficulty: gameState.difficulty,
        betAmount: gameState.betAmount,
        currentFloor: gameState.currentFloor,
        currentMultiplier: gameState.currentMultiplier,
        currentPayout: Math.floor(gameState.betAmount * gameState.currentMultiplier),
        history: gameState.history,
        doorsPerFloor: gameState.doorsPerFloor,
        multipliers: cfg.multipliers,
      },
    });
  } catch (err) {
    console.error('Tower state error:', err);
    return res.status(500).json({ message: 'Server error fetching Tower state.' });
  }
});

module.exports = router;
