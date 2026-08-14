const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

const activeBlackjackGames = new Map(); // userId -> gameSession

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Generate a full 52-card deck and shuffle using cryptographically secure randomInt
const createShuffledDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let val = parseInt(rank, 10);
      if (['J', 'Q', 'K'].includes(rank)) val = 10;
      if (rank === 'A') val = 11;
      deck.push({ suit, rank, val, isRed: ['♥', '♦'].includes(suit) });
    }
  }

  // Fisher-Yates shuffle with crypto.randomInt
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

// Calculate hand total taking Ace values (11 or 1) into account
const calculateHandScore = (cards) => {
  let total = 0;
  let aceCount = 0;

  for (const c of cards) {
    total += c.val;
    if (c.rank === 'A') aceCount++;
  }

  let isSoft = aceCount > 0 && total <= 21;

  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  if (aceCount === 0) isSoft = false;

  const isBust = total > 21;
  const isBlackjack = cards.length === 2 && total === 21;

  return { total, isSoft, isBust, isBlackjack };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blackjack/start — Start a new Blackjack hand
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', verifyJWT, async (req, res) => {
  try {
    const { betAmount } = req.body;
    const bet = parseInt(betAmount, 10);

    if (isNaN(bet) || bet < 10) {
      return res.status(400).json({ message: 'Minimum bet is 10 credits.' });
    }

    const userId = req.user._id.toString();
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

    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: bet,
      balanceAfter: updatedUser.balance,
      description: `Blackjack hand started — bet ${bet} 🪙`,
    });

    const deck = createShuffledDeck();
    const playerCards = [deck.pop(), deck.pop()];
    const dealerCards = [deck.pop(), deck.pop()];

    const playerEval = calculateHandScore(playerCards);
    const dealerEval = calculateHandScore(dealerCards);

    // Natural Blackjack Check!
    if (playerEval.isBlackjack) {
      let payout = 0;
      let status = 'BLACKJACK';

      if (dealerEval.isBlackjack) {
        // Push — both got Blackjack
        status = 'PUSH';
        payout = bet; // return original wager
      } else {
        // 3:2 Natural Blackjack payout (2.5x total payout)
        payout = Math.round(bet * 2.5);
      }

      const finalUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: payout } },
        { new: true }
      );

      await Transaction.create({
        userId: user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: finalUser.balance,
        description: `Blackjack ${status}! Payout = +${payout} 🪙`,
      });

      return res.json({
        status,
        betAmount: bet,
        playerCards,
        dealerCards, // reveal all dealer cards
        playerEval,
        dealerEval,
        payout,
        balanceAfter: finalUser.balance,
      });
    }

    // Normal hand in progress — hide dealer's 2nd card from client response
    const gameState = {
      userId,
      betAmount: bet,
      deck,
      playerCards,
      dealerCards,
      status: 'IN_PROGRESS',
    };

    activeBlackjackGames.set(userId, gameState);

    res.json({
      status: 'IN_PROGRESS',
      betAmount: bet,
      playerCards,
      dealerCards: [dealerCards[0], { hidden: true }], // 1 card hidden
      playerEval,
      dealerEval: { total: dealerCards[0].val, isHidden: true },
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('[Blackjack] Start error:', err);
    res.status(500).json({ message: 'Server error starting hand.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blackjack/hit — Draw a card
// ─────────────────────────────────────────────────────────────────────────────
router.post('/hit', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const game = activeBlackjackGames.get(userId);

    if (!game || game.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active Blackjack hand in progress.' });
    }

    const newCard = game.deck.pop();
    game.playerCards.push(newCard);

    const playerEval = calculateHandScore(game.playerCards);

    if (playerEval.isBust) {
      // Player BUSTED!
      game.status = 'BUSTED';
      activeBlackjackGames.delete(userId);

      const user = await User.findById(userId);

      return res.json({
        status: 'BUSTED',
        playerCards: game.playerCards,
        dealerCards: game.dealerCards, // reveal dealer cards
        playerEval,
        dealerEval: calculateHandScore(game.dealerCards),
        payout: 0,
        balanceAfter: user ? user.balance : 0,
      });
    }

    res.json({
      status: 'IN_PROGRESS',
      playerCards: game.playerCards,
      dealerCards: [game.dealerCards[0], { hidden: true }],
      playerEval,
    });
  } catch (err) {
    console.error('[Blackjack] Hit error:', err);
    res.status(500).json({ message: 'Server error drawing card.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blackjack/stand — Stand and play Dealer turn
// ─────────────────────────────────────────────────────────────────────────────
router.post('/stand', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const game = activeBlackjackGames.get(userId);

    if (!game || game.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active Blackjack hand.' });
    }

    const playerEval = calculateHandScore(game.playerCards);

    // Dealer AI — Dealer hits on 16 or lower, stands on 17+
    let dealerEval = calculateHandScore(game.dealerCards);
    while (dealerEval.total < 17) {
      game.dealerCards.push(game.deck.pop());
      dealerEval = calculateHandScore(game.dealerCards);
    }

    let status = 'LOST';
    let payout = 0;

    if (dealerEval.isBust || playerEval.total > dealerEval.total) {
      status = 'WON';
      payout = game.betAmount * 2; // 1:1 payout
    } else if (playerEval.total === dealerEval.total) {
      status = 'PUSH';
      payout = game.betAmount; // refund wager
    } else {
      status = 'LOST';
      payout = 0;
    }

    game.status = status;
    activeBlackjackGames.delete(userId);

    let updatedUser = await User.findById(userId);
    if (payout > 0) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: payout } },
        { new: true }
      );

      await Transaction.create({
        userId: req.user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: updatedUser.balance,
        description: `Blackjack ${status}! (${playerEval.total} vs ${dealerEval.total}) = +${payout} 🪙`,
      });
    }

    res.json({
      status,
      playerCards: game.playerCards,
      dealerCards: game.dealerCards,
      playerEval,
      dealerEval,
      payout,
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('[Blackjack] Stand error:', err);
    res.status(500).json({ message: 'Server error processing stand.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blackjack/double — Double Down wager & draw 1 final card
// ─────────────────────────────────────────────────────────────────────────────
router.post('/double', verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const game = activeBlackjackGames.get(userId);

    if (!game || game.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'No active hand.' });
    }

    if (game.playerCards.length !== 2) {
      return res.status(400).json({ message: 'Can only Double Down on initial 2 cards.' });
    }

    const user = await User.findById(userId);
    if (user.balance < game.betAmount) {
      return res.status(400).json({ message: 'Insufficient balance to Double Down.' });
    }

    // Deduct additional wager
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: -game.betAmount } },
      { new: true }
    );

    game.betAmount = game.betAmount * 2;

    await Transaction.create({
      userId: user._id,
      type: 'BET_PLACED',
      amount: game.betAmount / 2,
      balanceAfter: updatedUser.balance,
      description: `Blackjack Double Down additional bet (${game.betAmount / 2} 🪙)`,
    });

    // Draw 1 card
    game.playerCards.push(game.deck.pop());
    const playerEval = calculateHandScore(game.playerCards);

    if (playerEval.isBust) {
      game.status = 'BUSTED';
      activeBlackjackGames.delete(userId);

      return res.json({
        status: 'BUSTED',
        playerCards: game.playerCards,
        dealerCards: game.dealerCards,
        playerEval,
        dealerEval: calculateHandScore(game.dealerCards),
        payout: 0,
        balanceAfter: updatedUser.balance,
      });
    }

    // Dealer turn
    let dealerEval = calculateHandScore(game.dealerCards);
    while (dealerEval.total < 17) {
      game.dealerCards.push(game.deck.pop());
      dealerEval = calculateHandScore(game.dealerCards);
    }

    let status = 'LOST';
    let payout = 0;

    if (dealerEval.isBust || playerEval.total > dealerEval.total) {
      status = 'WON';
      payout = game.betAmount * 2;
    } else if (playerEval.total === dealerEval.total) {
      status = 'PUSH';
      payout = game.betAmount;
    } else {
      status = 'LOST';
      payout = 0;
    }

    game.status = status;
    activeBlackjackGames.delete(userId);

    let finalUser = updatedUser;
    if (payout > 0) {
      finalUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: payout } },
        { new: true }
      );

      await Transaction.create({
        userId: req.user._id,
        type: 'BET_WON',
        amount: payout,
        balanceAfter: finalUser.balance,
        description: `Blackjack Double Down ${status}! (${playerEval.total} vs ${dealerEval.total}) = +${payout} 🪙`,
      });
    }

    res.json({
      status,
      playerCards: game.playerCards,
      dealerCards: game.dealerCards,
      playerEval,
      dealerEval,
      payout,
      balanceAfter: finalUser.balance,
    });
  } catch (err) {
    console.error('[Blackjack] Double error:', err);
    res.status(500).json({ message: 'Server error processing Double Down.' });
  }
});

module.exports = router;
