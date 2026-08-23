const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Active Hi-Lo sessions in memory (userId -> gameState)
const activeHiLoGames = new Map();

const SUITS = ['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS'];
const RANKS = [
  { rank: 1, label: 'A', name: 'Ace' },
  { rank: 2, label: '2', name: '2' },
  { rank: 3, label: '3', name: '3' },
  { rank: 4, label: '4', name: '4' },
  { rank: 5, label: '5', name: '5' },
  { rank: 6, label: '6', name: '6' },
  { rank: 7, label: '7', name: '7' },
  { rank: 8, label: '8', name: '8' },
  { rank: 9, label: '9', name: '9' },
  { rank: 10, label: '10', name: '10' },
  { rank: 11, label: 'J', name: 'Jack' },
  { rank: 12, label: 'Q', name: 'Queen' },
  { rank: 13, label: 'K', name: 'King' },
];

// Generate a random card using crypto
const drawRandomCard = () => {
  const rankIdx = crypto.randomInt(0, 13);
  const suitIdx = crypto.randomInt(0, 4);
  const rankObj = RANKS[rankIdx];
  const suit = SUITS[suitIdx];
  const color = suit === 'HEARTS' || suit === 'DIAMONDS' ? 'RED' : 'BLACK';

  return {
    rank: rankObj.rank,
    label: rankObj.label,
    name: rankObj.name,
    suit,
    color,
  };
};

// Calculate multipliers and win probabilities based on current card rank
const calculateOdds = (currentRank) => {
  // Higher or equal: ranks from currentRank to 13
  const higherCount = 14 - currentRank;
  const higherProb = higherCount / 13;
  const higherMult = Math.max(1.05, parseFloat(((1 / higherProb) * 0.97).toFixed(2)));

  // Lower or equal: ranks from 1 to currentRank
  const lowerCount = currentRank;
  const lowerProb = lowerCount / 13;
  const lowerMult = Math.max(1.05, parseFloat(((1 / lowerProb) * 0.97).toFixed(2)));

  return {
    HI: {
      multiplier: higherMult,
      probability: Math.round(higherProb * 100),
    },
    LO: {
      multiplier: lowerMult,
      probability: Math.round(lowerProb * 100),
    },
    RED: {
      multiplier: 1.96,
      probability: 50,
    },
    BLACK: {
      multiplier: 1.96,
      probability: 50,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hilo/start — Start a new Hi-Lo session
// Body: { betAmount: number }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', verifyJWT, async (req, res) => {
  try {
    const { betAmount } = req.body;
    const bet = parseInt(betAmount, 10);

    if (isNaN(bet) || bet < 1) {
      return res.status(400).json({ message: 'Minimum bet is 1 credit.' });
    }

    const userId = req.user._id.toString();

    // Check if player has an existing uncompleted session
    if (activeHiLoGames.has(userId)) {
      const existing = activeHiLoGames.get(userId);
      const odds = calculateOdds(existing.currentCard.rank);
      return res.json({
        message: 'Resuming active Hi-Lo session.',
        game: {
          betAmount: existing.betAmount,
          currentCard: existing.currentCard,
          streak: existing.streak,
          currentMultiplier: existing.currentMultiplier,
          currentPayout: Math.floor(existing.betAmount * existing.currentMultiplier),
          skipsRemaining: existing.skipsRemaining,
          cardHistory: existing.cardHistory,
          odds,
        },
      });
    }

    // Check user balance
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
      description: `Hi-Lo Card Streak started — bet ${bet} 🪙`,
    });

    const startingCard = drawRandomCard();
    const odds = calculateOdds(startingCard.rank);

    const gameState = {
      userId,
      betAmount: bet,
      currentCard: startingCard,
      streak: 0,
      currentMultiplier: 1.0,
      skipsRemaining: 2,
      cardHistory: [startingCard],
    };

    activeHiLoGames.set(userId, gameState);

    return res.json({
      message: 'Hi-Lo round started!',
      balance: updatedUser.balance,
      game: {
        betAmount: bet,
        currentCard: startingCard,
        streak: 0,
        currentMultiplier: 1.0,
        currentPayout: bet,
        skipsRemaining: 2,
        cardHistory: [startingCard],
        odds,
      },
    });
  } catch (err) {
    console.error('Hi-Lo start error:', err);
    return res.status(500).json({ message: 'Server error starting Hi-Lo round.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hilo/guess — Make a guess on next card
// Body: { action: 'HI' | 'LO' | 'RED' | 'BLACK' | 'SKIP' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/guess', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const gameState = activeHiLoGames.get(userId);

    if (!gameState) {
      return res.status(400).json({ message: 'No active Hi-Lo game found. Start a new game!' });
    }

    const { action } = req.body;
    const act = String(action).toUpperCase();

    if (!['HI', 'LO', 'RED', 'BLACK', 'SKIP'].includes(act)) {
      return res.status(400).json({ message: 'Invalid guess action.' });
    }

    // Handle Skip action
    if (act === 'SKIP') {
      if (gameState.skipsRemaining <= 0) {
        return res.status(400).json({ message: 'No skips remaining for this round.' });
      }

      const newCard = drawRandomCard();
      gameState.skipsRemaining -= 1;
      gameState.currentCard = newCard;
      gameState.cardHistory.push(newCard);

      const odds = calculateOdds(newCard.rank);
      const currentPayout = Math.floor(gameState.betAmount * gameState.currentMultiplier);

      return res.json({
        status: 'SKIPPED',
        isWin: true,
        newCard,
        streak: gameState.streak,
        currentMultiplier: gameState.currentMultiplier,
        currentPayout,
        skipsRemaining: gameState.skipsRemaining,
        cardHistory: gameState.cardHistory,
        odds,
        message: `Card skipped! ${gameState.skipsRemaining} skip(s) left.`,
      });
    }

    const currentCard = gameState.currentCard;
    const odds = calculateOdds(currentCard.rank);
    const stepMult = odds[act]?.multiplier || 1.0;

    const drawnCard = drawRandomCard();
    let isWin = false;

    if (act === 'HI') {
      isWin = drawnCard.rank >= currentCard.rank;
    } else if (act === 'LO') {
      isWin = drawnCard.rank <= currentCard.rank;
    } else if (act === 'RED') {
      isWin = drawnCard.color === 'RED';
    } else if (act === 'BLACK') {
      isWin = drawnCard.color === 'BLACK';
    }

    if (!isWin) {
      // Bust! Round is lost
      activeHiLoGames.delete(userId);
      await User.findByIdAndUpdate(userId, { $inc: { gamesPlayed: 1 } });

      return res.json({
        status: 'BUSTED',
        isWin: false,
        guess: act,
        previousCard: currentCard,
        drawnCard,
        streak: gameState.streak,
        message: `💥 Lost guess on ${drawnCard.label} of ${drawnCard.suit}. Round over!`,
      });
    }

    // Win! Update progressive multiplier and streak
    const newTotalMultiplier = parseFloat((gameState.currentMultiplier * stepMult).toFixed(2));
    gameState.streak += 1;
    gameState.currentMultiplier = newTotalMultiplier;
    gameState.currentCard = drawnCard;
    gameState.cardHistory.push(drawnCard);

    const nextOdds = calculateOdds(drawnCard.rank);
    const currentPayout = Math.floor(gameState.betAmount * newTotalMultiplier);

    return res.json({
      status: 'WIN',
      isWin: true,
      guess: act,
      previousCard: currentCard,
      drawnCard,
      stepMultiplier: stepMult,
      streak: gameState.streak,
      currentMultiplier: newTotalMultiplier,
      currentPayout,
      skipsRemaining: gameState.skipsRemaining,
      cardHistory: gameState.cardHistory,
      odds: nextOdds,
      message: `🎉 Correct! Multiplier is now ${newTotalMultiplier}×. Cash out or continue!`,
    });
  } catch (err) {
    console.error('Hi-Lo guess error:', err);
    return res.status(500).json({ message: 'Server error processing guess.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hilo/cashout — Cash out current accrued winnings
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cashout', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const gameState = activeHiLoGames.get(userId);

    if (!gameState) {
      return res.status(400).json({ message: 'No active Hi-Lo round to cash out.' });
    }

    if (gameState.streak === 0) {
      return res.status(400).json({ message: 'Win at least 1 guess before cashing out.' });
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
      description: `Hi-Lo Card Streak cashout (${gameState.streak} streak) — won ${payout} 🪙 (${multiplier}×)`,
    });

    activeHiLoGames.delete(userId);

    return res.json({
      status: 'CASHED_OUT',
      payout,
      multiplier,
      streak: gameState.streak,
      balance: updatedUser.balance,
      message: `💰 Cashed out +${payout.toLocaleString()} Credits (${multiplier}×, ${gameState.streak} streak)!`,
    });
  } catch (err) {
    console.error('Hi-Lo cashout error:', err);
    return res.status(500).json({ message: 'Server error cashing out.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hilo/state — Get active session state
// ─────────────────────────────────────────────────────────────────────────────
router.get('/state', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const gameState = activeHiLoGames.get(userId);

    if (!gameState) {
      return res.json({ active: false });
    }

    const odds = calculateOdds(gameState.currentCard.rank);
    return res.json({
      active: true,
      game: {
        betAmount: gameState.betAmount,
        currentCard: gameState.currentCard,
        streak: gameState.streak,
        currentMultiplier: gameState.currentMultiplier,
        currentPayout: Math.floor(gameState.betAmount * gameState.currentMultiplier),
        skipsRemaining: gameState.skipsRemaining,
        cardHistory: gameState.cardHistory,
        odds,
      },
    });
  } catch (err) {
    console.error('Hi-Lo state error:', err);
    return res.status(500).json({ message: 'Server error fetching Hi-Lo state.' });
  }
});

module.exports = router;
