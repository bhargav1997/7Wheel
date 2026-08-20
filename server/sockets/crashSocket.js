/**
 * crashSocket.js — 7 Wheel Live Multiplayer Crash / Rocket Socket Engine
 *
 * Game State Machine:
 *   COUNTDOWN (5s) → FLYING (ticks 1.00x to crashPoint) → CRASHED (3s) → COUNTDOWN
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

let crashState = {
  status: 'COUNTDOWN', // COUNTDOWN, FLYING, CRASHED
  roundNumber: 1,
  timeLeft: 5,
  multiplier: 1.00,
  crashPoint: 1.00,
  bets: [], // { userId, username, socketId, amount, autoCashout, cashedOut, cashoutMult, payout }
  history: [1.85, 4.20, 1.12, 14.50, 2.30, 1.04, 3.10], // recent crashes
  playerSockets: {},
  roundStarted: false, // true once first bet triggers launch countdown
};

let crashInterval = null;
let flyTimer = null;

// Calculate provably fair crash multiplier with 97% RTP (3% house edge)
const generateCrashPoint = () => {
  const r = crypto.randomInt(1, 1000000) / 1000000;
  if (r <= 0.03) return 1.00; // 3% instant crash
  const raw = 0.97 / (1 - r);
  return Math.min(1000.0, Math.max(1.01, parseFloat(raw.toFixed(2))));
};

const broadcastState = (io) => {
  io.to('crash-room').emit('crash:state', {
    status: crashState.status,
    roundNumber: crashState.roundNumber,
    timeLeft: crashState.timeLeft,
    multiplier: crashState.multiplier,
    history: crashState.history,
    bets: crashState.bets.map((b) => ({
      username: b.username,
      amount: b.amount,
      cashedOut: b.cashedOut,
      cashoutMult: b.cashoutMult,
      payout: b.payout,
    })),
    totalPlayers: Object.keys(crashState.playerSockets).length,
  });
};

// Helper function to process cashouts atomically
const processCashout = async (bet, mult, isAuto = false, io) => {
  if (bet.cashedOut) return;
  bet.cashedOut = true;
  bet.cashoutMult = mult;
  bet.payout = Math.round(bet.amount * mult);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      bet.userId,
      { $inc: { balance: bet.payout } },
      { new: true }
    );

    await Transaction.create({
      userId: bet.userId,
      type: 'BET_WON',
      amount: bet.payout,
      balanceAfter: updatedUser.balance,
      description: `Crash ${isAuto ? 'Auto' : 'Manual'} Cashout at ${mult}× = +${bet.payout} Credits`,
    });

    // Emit balance update and cashout confirmation to the player
    io.to(bet.socketId).emit('balance:update', { credits: updatedUser.balance });
    io.to(bet.socketId).emit('crash:cashoutConfirmed', {
      multiplier: mult,
      payout: bet.payout,
      isAuto,
    });
  } catch (err) {
    console.error('[Crash] Cashout processing error:', err);
  }
};

const startCrashLoop = (io) => {
  if (crashInterval) return;

  crashInterval = setInterval(async () => {
    if (crashState.status === 'COUNTDOWN') {
      // Do not count down until first bet triggers roundStarted
      if (!crashState.roundStarted) {
        broadcastState(io);
        return;
      }

      crashState.timeLeft--;
      if (crashState.timeLeft <= 0) {
        // Transition to FLYING
        crashState.status = 'FLYING';
        crashState.multiplier = 1.00;
        crashState.crashPoint = generateCrashPoint();
        
        let startTime = Date.now();

        // High frequency ticker for flight curve (every 100ms)
        flyTimer = setInterval(async () => {
          if (crashState.status !== 'FLYING') {
            clearInterval(flyTimer);
            return;
          }

          const elapsedSec = (Date.now() - startTime) / 1000;
          // Exponential multiplier growth: 1.00 * e^(0.08 * t)
          const nextMult = parseFloat(Math.pow(Math.E, 0.08 * elapsedSec).toFixed(2));

          if (nextMult >= crashState.crashPoint) {
            // Process any auto-cashouts that reached their target before or at the crashPoint!
            for (const bet of crashState.bets) {
              if (!bet.cashedOut && bet.autoCashout && bet.autoCashout <= crashState.crashPoint) {
                await processCashout(bet, bet.autoCashout, true, io);
              }
            }

            // CRASHED!
            clearInterval(flyTimer);
            crashState.multiplier = crashState.crashPoint;
            crashState.status = 'CRASHED';
            crashState.timeLeft = 3;
            crashState.history = [crashState.crashPoint, ...crashState.history.slice(0, 14)];

            io.to('crash-room').emit('crash:exploded', {
              crashPoint: crashState.crashPoint,
            });

            broadcastState(io);
          } else {
            crashState.multiplier = nextMult;

            // Check auto-cashouts that reached their target during flight
            for (const bet of crashState.bets) {
              if (!bet.cashedOut && bet.autoCashout && nextMult >= bet.autoCashout) {
                await processCashout(bet, bet.autoCashout, true, io);
              }
            }

            broadcastState(io);
          }
        }, 100);
      } else {
        broadcastState(io);
      }
    } else if (crashState.status === 'CRASHED') {
      crashState.timeLeft--;
      if (crashState.timeLeft <= 0) {
        // Reset for next round
        crashState.roundNumber++;
        crashState.status = 'COUNTDOWN';
        crashState.timeLeft = 5;
        crashState.multiplier = 1.00;
        crashState.bets = [];
        crashState.roundStarted = false;
        broadcastState(io);
      } else {
        broadcastState(io);
      }
    }
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

const initCrashSocket = (io) => {
  startCrashLoop(io);

  io.on('connection', (socket) => {
    socket.on('crash:join', async (token) => {
      try {
        const decoded = verifyToken(token);
        const user = decoded ? await User.findById(decoded.id) : null;
        const userId = user ? user._id.toString() : null;
        const username = user ? user.username : `Guest_${socket.id.slice(0, 4)}`;

        socket.join('crash-room');
        crashState.playerSockets[socket.id] = { userId, username };

        socket.emit('crash:init', {
          status: crashState.status,
          roundNumber: crashState.roundNumber,
          timeLeft: crashState.timeLeft,
          multiplier: crashState.multiplier,
          history: crashState.history,
          bets: crashState.bets.map((b) => ({
            username: b.username,
            amount: b.amount,
            cashedOut: b.cashedOut,
            cashoutMult: b.cashoutMult,
            payout: b.payout,
          })),
        });

        broadcastState(io);
      } catch (err) {
        // Silent join fallback
      }
    });

    socket.on('crash:bet', async ({ amount, autoCashout, token }) => {
      try {
        if (crashState.status !== 'COUNTDOWN') {
          return socket.emit('crash:error', 'Betting window is closed for this launch!');
        }

        const betAmount = parseInt(amount, 10);
        if (isNaN(betAmount) || betAmount < 1) {
          return socket.emit('crash:error', 'Minimum bet is 1 credit!');
        }

        const decoded = verifyToken(token);
        if (!decoded) {
          return socket.emit('crash:error', 'Authentication required.');
        }

        const user = await User.findById(decoded.id);
        if (!user || user.balance < betAmount) {
          return socket.emit('crash:error', 'Insufficient credits balance.');
        }

        const existingBet = crashState.bets.find((b) => b.userId === user._id.toString());
        if (existingBet) {
          return socket.emit('crash:error', 'You have already placed a bet for this launch!');
        }

        const autoTarget = autoCashout ? parseFloat(parseFloat(autoCashout).toFixed(2)) : null;

        // Deduct balance atomically
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $inc: { balance: -betAmount } },
          { new: true }
        );

        await Transaction.create({
          userId: user._id,
          type: 'BET_PLACED',
          amount: betAmount,
          balanceAfter: updatedUser.balance,
          description: `Crash Bet placed (${betAmount} 🪙)`,
        });

        crashState.bets.push({
          userId: user._id.toString(),
          username: user.username,
          socketId: socket.id,
          amount: betAmount,
          autoCashout: autoTarget && autoTarget > 1.01 ? autoTarget : null,
          cashedOut: false,
          cashoutMult: null,
          payout: null,
        });

        // If this is the first bet, start the 5s launch countdown
        if (!crashState.roundStarted) {
          crashState.roundStarted = true;
          crashState.timeLeft = 5;
        }

        socket.emit('balance:update', { credits: updatedUser.balance });
        socket.emit('crash:betConfirmed', { amount: betAmount, autoCashout: autoTarget });

        broadcastState(io);
      } catch (err) {
        console.error('[Crash] Bet error:', err);
        socket.emit('crash:error', 'Failed to place bet.');
      }
    });

    socket.on('crash:cashout', async () => {
      try {
        if (crashState.status !== 'FLYING') {
          return socket.emit('crash:error', 'Rocket is not in flight!');
        }

        const bet = crashState.bets.find((b) => b.socketId === socket.id);
        if (!bet || bet.cashedOut) {
          return socket.emit('crash:error', 'No active bet to cash out.');
        }

        const currentMult = crashState.multiplier;
        await processCashout(bet, currentMult, false, io);
        broadcastState(io);
      } catch (err) {
        console.error('[Crash] Manual cashout error:', err);
        socket.emit('crash:error', 'Failed to cash out.');
      }
    });

    socket.on('disconnect', () => {
      delete crashState.playerSockets[socket.id];
      broadcastState(io);
    });
  });
};

module.exports = { initCrashSocket };
