/**
 * flipOrFlopSocket.js — 7 Wheel Rapid Flip or Flop Socket Engine
 *
 * Game State Machine:
 *   WAITING (idle, no bets) → BETTING (countdown 5s, ≥1 bet placed) → SPINNING (2s) → RESULT (3s) → WAITING
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

let flipState = {
  status: 'WAITING',   // WAITING, BETTING, SPINNING, RESULT
  roundNumber: 1,
  bets: [],            // { userId, username, socketId, choice: 'FLIP' | 'FLOP', amount }
  timeLeft: 5,
  result: null,        // number 1–12
  winningChoice: null, // 'FLIP' (1–6) or 'FLOP' (7–12)
  winners: [],
  playerSockets: {},   // socketId -> { userId, username }
  roundStarted: false, // true once first bet triggers the countdown
};

let userStreaks = {}; // userId -> current streak count

let roundInterval = null;

const getChoice = (num) => (num <= 6 ? 'FLIP' : 'FLOP');

const calculateMultiplier = (streak) => {
  if (streak >= 10) return 3.0;
  if (streak >= 5) return 2.25;
  if (streak >= 3) return 2.0;
  return 1.85;
};

const broadcastState = (io) => {
  io.to('flip-or-flop-room').emit('flip:state', {
    status: flipState.status,
    roundNumber: flipState.roundNumber,
    timeLeft: flipState.timeLeft,
    result: flipState.result,
    winningChoice: flipState.winningChoice,
    winners: flipState.winners,
    bettorCount: flipState.bets.length,
    totalPlayers: Object.keys(flipState.playerSockets).length,
    roundStarted: flipState.roundStarted,
  });
};

const startFlipLoop = (io) => {
  if (roundInterval) return;

  roundInterval = setInterval(async () => {
    // WAITING — do nothing until first bet triggers the round
    if (flipState.status === 'WAITING') {
      broadcastState(io);
      return;
    }

    if (flipState.status === 'BETTING') {
      flipState.timeLeft--;
      if (flipState.timeLeft <= 0) {
        // Transition to SPINNING
        flipState.status = 'SPINNING';
        flipState.timeLeft = 2;
        // Spin the wheel (1-12) using cryptographically secure randomInt
        flipState.result = crypto.randomInt(1, 13);
        flipState.winningChoice = getChoice(flipState.result);
      }
    } else if (flipState.status === 'SPINNING') {
      flipState.timeLeft--;
      if (flipState.timeLeft <= 0) {
        // Resolve round outcomes
        flipState.status = 'RESULT';
        flipState.timeLeft = 3;

        const resolvedWinners = [];

        for (const bet of flipState.bets) {
          const won = bet.choice === flipState.winningChoice;
          const currentStreak = won ? (userStreaks[bet.userId] || 0) + 1 : 0;
          userStreaks[bet.userId] = currentStreak;

          let payout = 0;
          if (won) {
            const mult = calculateMultiplier(currentStreak);
            payout = Math.round(bet.amount * mult);

            // Credit user atomically
            try {
              const updatedUser = await User.findByIdAndUpdate(
                bet.userId,
                { $inc: { balance: payout } },
                { new: true }
              );

              await Transaction.create({
                userId: bet.userId,
                type: 'BET_WON',
                amount: payout,
                balanceAfter: updatedUser.balance,
                description: `Flip or Flop Win (${bet.choice} landed on ${flipState.result} - ${mult}x streak multiplier)`,
              });

              // Send private balance update
              const sock = io.sockets.sockets.get(bet.socketId);
              if (sock) {
                sock.emit('balance:update', { credits: updatedUser.balance });
              }
            } catch (err) {
              console.error('[FlipOrFlop] Error crediting win:', err);
            }
          }

          resolvedWinners.push({
            username: bet.username,
            choice: bet.choice,
            amount: bet.amount,
            won,
            payout,
            streak: currentStreak,
          });
        }

        flipState.winners = resolvedWinners;
      }
    } else if (flipState.status === 'RESULT') {
      flipState.timeLeft--;
      if (flipState.timeLeft <= 0) {
        // Transition back to WAITING for next round
        flipState.roundNumber++;
        flipState.status = 'WAITING';
        flipState.timeLeft = 5;
        flipState.bets = [];
        flipState.result = null;
        flipState.winningChoice = null;
        flipState.winners = [];
        flipState.roundStarted = false;
      }
    }

    broadcastState(io);
  }, 1000);
};

const verifyToken = (rawToken) => {
  if (!rawToken) return null;
  const cleanToken = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;
  try {
    return jwt.verify(cleanToken, process.env.JWT_SECRET || 'secret');
  } catch (err) {
    return null;
  }
};

const initFlipOrFlopSocket = (io) => {
  startFlipLoop(io);

  io.on('connection', (socket) => {
    socket.on('flip:join', async (token) => {
      try {
        const decoded = verifyToken(token);
        const user = decoded ? await User.findById(decoded.id) : null;
        const userId = user ? user._id.toString() : null;
        const username = user ? user.username : `Guest_${socket.id.slice(0, 4)}`;

        socket.join('flip-or-flop-room');
        flipState.playerSockets[socket.id] = {
          userId,
          username,
          streak: userId ? (userStreaks[userId] || 0) : 0,
        };

        socket.emit('flip:init', {
          ...flipState,
          userStreak: userId ? (userStreaks[userId] || 0) : 0,
        });

        broadcastState(io);
        console.log(`[${flipState.roundNumber}] 👤 ${username} joined lobby (${Object.keys(flipState.playerSockets).length} total)`);
      } catch (err) {
        // Silent join fallback
      }
    });

    socket.on('flip:bet', async ({ amount, choice, token }) => {
      try {
        // Only allow bets in WAITING or BETTING phase
        if (flipState.status !== 'WAITING' && flipState.status !== 'BETTING') {
          return socket.emit('flip:error', 'Betting window is closed for this round!');
        }

        if (!['FLIP', 'FLOP'].includes(choice)) {
          return socket.emit('flip:error', 'Invalid choice! Select FLIP (1-6) or FLOP (7-12).');
        }

        const betAmount = parseInt(amount, 10);
        if (isNaN(betAmount) || betAmount < 1) {
          return socket.emit('flip:error', 'Minimum bet is 1 credit!');
        }

        const decoded = verifyToken(token);
        if (!decoded) {
          return socket.emit('flip:error', 'Authentication required to place bets!');
        }

        const user = await User.findById(decoded.id);

        if (!user || user.balance < betAmount) {
          return socket.emit('flip:error', 'Insufficient credits balance!');
        }

        // Check if user already placed a bet this round
        const existingBet = flipState.bets.find((b) => b.userId === user._id.toString());
        if (existingBet) {
          return socket.emit('flip:error', 'You have already placed a bet for this round!');
        }

        // Deduct balance atomically
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $inc: { balance: -betAmount } },
          { new: true }
        );

        if (!updatedUser) {
          return socket.emit('flip:error', 'Failed to update balance. Please try again.');
        }

        await Transaction.create({
          userId: user._id,
          type: 'BET_PLACED',
          amount: betAmount,
          balanceAfter: updatedUser.balance,
          description: `Flip or Flop Bet (${choice} - ${betAmount} 🪙)`,
        });

        flipState.bets.push({
          userId: user._id.toString(),
          username: user.username,
          socketId: socket.id,
          choice,
          amount: betAmount,
        });

        // If this is the first bet, kick off the countdown
        if (!flipState.roundStarted) {
          flipState.roundStarted = true;
          flipState.status = 'BETTING';
          flipState.timeLeft = 5;
          // Notify all players the round has started
          io.to('flip-or-flop-room').emit('flip:roundStarting', {
            by: user.username,
            timeLeft: 5,
          });
        }

        socket.emit('balance:update', { credits: updatedUser.balance });
        socket.emit('flip:betConfirmed', { choice, amount: betAmount });

        broadcastState(io);
      } catch (err) {
        console.error('[FlipOrFlop] Bet error:', err);
        socket.emit('flip:error', err.message || 'Failed to place bet');
      }
    });

    socket.on('disconnect', () => {
      delete flipState.playerSockets[socket.id];
      broadcastState(io);
    });
  });
};

module.exports = { initFlipOrFlopSocket };
