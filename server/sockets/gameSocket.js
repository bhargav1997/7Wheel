/**
 * gameSocket.js — 7 Wheel Central Hub Real-Time Game Engine
 *
 * Game State Machine:
 *   WAITING_FOR_PLAYERS → BETTING → SPINNING → RESULT → WAITING_FOR_PLAYERS
 *
 * Security rules:
 *  - Bets are NEVER broadcast to other clients during BETTING phase
 *  - Wheel result generated server-side only
 *  - Balance deducted atomically before bet is accepted
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GameRound = require('../models/GameRound');
const Transaction = require('../models/Transaction');

// ─────────────────────────────────────────────
// Game State (in-memory, single instance)
// ─────────────────────────────────────────────
let gameState = {
  status: 'WAITING_FOR_PLAYERS',
  roundNumber: 0,
  currentRoundId: null,
  bets: [],          // Full bet objects (server only, never broadcast)
  playerSockets: {}, // socketId → { userId, username, balance, hasBet }
  timer: null,
  timeLeft: 0,
  pot: 0,
  result: null,
  winningCategory: null,
  winners: [],
};

let bettingCountdown = null;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getCategory = (num) => {
  if (num < 7) return 'UNDER_7';
  if (num === 7) return 'EXACT_7';
  return 'OVER_7';
};

/**
 * Build a "public" game state snapshot safe to broadcast.
 * Individual bet choices are HIDDEN.
 */
const buildPublicState = () => ({
  status: gameState.status,
  roundNumber: gameState.roundNumber,
  playerCount: Object.values(gameState.playerSockets).filter((p) => p.role !== 'admin').length,
  bettorCount: gameState.bets.length,
  pot: gameState.pot,
  timeLeft: gameState.timeLeft,
  result: gameState.result,
  winningCategory: gameState.winningCategory,
  winners: gameState.winners,
  // Players list (no bet choices exposed, excluding admins)
  players: Object.values(gameState.playerSockets)
    .filter((p) => p.role !== 'admin')
    .map((p) => ({
      username: p.username,
      hasBet: p.hasBet,
      balance: p.balance,
      totalWon: p.totalWon || 0,
    })),
});

/**
 * Broadcast public game state to all connected clients
 */
const broadcastState = (io) => {
  io.to('lobby').emit('gameState', buildPublicState());
};

// ─────────────────────────────────────────────
// Payout Logic (2x for Under/Over 7, 7x for Exact 7)
// ─────────────────────────────────────────────
const MULTIPLIERS = {
  UNDER_7: 2,
  EXACT_7: 7,
  OVER_7: 2,
};

const computePayouts = (bets, result) => {
  const winningCategory = getCategory(result);
  const totalPot = bets.reduce((sum, b) => sum + b.amount, 0);

  const payouts = [];

  bets.forEach((bet) => {
    if (bet.choice === winningCategory) {
      const mult = MULTIPLIERS[winningCategory] || 2;
      const payoutAmount = Math.round(bet.amount * mult * 100) / 100;
      payouts.push({
        userId: bet.userId,
        username: bet.username,
        won: true,
        payout: payoutAmount,
        refund: 0,
      });
    } else {
      payouts.push({
        userId: bet.userId,
        username: bet.username,
        won: false,
        payout: 0,
        refund: 0,
      });
    }
  });

  const totalDistributed = payouts.reduce((sum, p) => sum + p.payout, 0);
  const platformEarnings = parseFloat((totalPot - totalDistributed).toFixed(2));

  return {
    payouts,
    winningCategory,
    totalPot,
    hadWinners: payouts.some((p) => p.won),
    platformEarnings,
  };
};

// ─────────────────────────────────────────────
// Game Phase Transitions
// ─────────────────────────────────────────────

const startBettingPhase = async (io) => {
  gameState.status = 'BETTING';
  gameState.timeLeft = 30;

  // Update round status in DB to BETTING
  if (gameState.currentRoundId) {
    await GameRound.findByIdAndUpdate(gameState.currentRoundId, {
      status: 'BETTING',
      bettingStartedAt: new Date(),
    });
  }

  broadcastState(io);

  // 30-second countdown
  bettingCountdown = setInterval(() => {
    gameState.timeLeft -= 1;
    broadcastState(io);

    if (gameState.timeLeft <= 0) {
      clearInterval(bettingCountdown);
      bettingCountdown = null;
      spinWheel(io);
    }
  }, 1000);
};

const spinWheel = async (io) => {
  if (bettingCountdown) {
    clearInterval(bettingCountdown);
    bettingCountdown = null;
  }

  gameState.status = 'SPINNING';
  broadcastState(io);

  // Generate result server-side (1–12 inclusive)
  const result = Math.floor(Math.random() * 12) + 1;

  // Wait 4 seconds for wheel spin animation on clients
  await new Promise((res) => setTimeout(res, 4000));

  await resolveRound(io, result);
};

const resolveRound = async (io, result) => {
  gameState.status = 'RESULT';
  gameState.result = result;

  const { payouts, winningCategory, totalPot, hadWinners, platformEarnings } = computePayouts(
    gameState.bets,
    result
  );

  gameState.winningCategory = winningCategory;
  gameState.winners = payouts;



  // Apply standard payouts to DB
  for (const payout of payouts) {
    const credit = payout.won ? payout.payout : payout.refund;
    if (credit > 0) {
      const user = await User.findByIdAndUpdate(
        payout.userId,
        { $inc: { balance: credit, totalWon: payout.won ? credit : 0 } },
        { new: true }
      );

      await Transaction.create({
        userId: payout.userId,
        amount: credit,
        type: payout.won ? 'BET_WON' : 'REFUND',
        roundId: gameState.currentRoundId,
        balanceAfter: user.balance,
        description: payout.won
          ? `Won round #${gameState.roundNumber}: $${credit}`
          : `Refund round #${gameState.roundNumber}: $${credit}`,
      });

      // Notify the specific player's socket of their balance update
      const playerSocket = Object.entries(gameState.playerSockets).find(
        ([, p]) => p.userId === payout.userId.toString()
      );
      if (playerSocket) {
        io.to(playerSocket[0]).emit('balanceUpdate', { newBalance: user.balance });
        gameState.playerSockets[playerSocket[0]].balance = user.balance;
        gameState.playerSockets[playerSocket[0]].totalWon = user.totalWon || 0;
      }
    }
  }

  // Update gamesPlayed for all bettors
  const bettorIds = gameState.bets.map((b) => b.userId);
  await User.updateMany({ _id: { $in: bettorIds } }, { $inc: { gamesPlayed: 1 } });

  // Persist round result
  await GameRound.findByIdAndUpdate(gameState.currentRoundId, {
    status: 'RESULT',
    result,
    winningCategory,
    totalPot,
    hadWinners,
    platformEarnings,
    bets: gameState.bets.map((b) => {
      const p = payouts.find((pay) => pay.userId === b.userId);
      return {
        ...b,
        won: p?.won || false,
        payout: p?.payout || p?.refund || 0,
      };
    }),
    endedAt: new Date(),
  });

  broadcastState(io);

  // Show result for 6 seconds then loop
  await new Promise((res) => setTimeout(res, 6000));
  await returnToWaiting(io);
};

const returnToWaiting = async (io) => {
  gameState.status = 'WAITING_FOR_PLAYERS';
  gameState.bets = [];
  gameState.pot = 0;
  gameState.timeLeft = 0;
  gameState.currentRoundId = null;

  // Refresh balances and reset hasBet for connected players
  for (const [sid, player] of Object.entries(gameState.playerSockets)) {
    player.hasBet = false;
    const user = await User.findById(player.userId).select('balance');
    if (user) player.balance = user.balance;
  }

  broadcastState(io);
};


// ─────────────────────────────────────────────
// Socket Connection Handler
// ─────────────────────────────────────────────
const initGameSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ── joinLobby ──────────────────────────────
    socket.on('joinLobby', async ({ token }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return socket.emit('error', { message: 'User not found' });

        const userId = user._id.toString();

        // ── Duplicate session guard ──────────────────────────────────
        // If this userId is already connected on another socket, evict it.
        // This prevents the same account appearing twice (e.g. two tabs).
        const existingEntry = Object.entries(gameState.playerSockets).find(
          ([, p]) => p.userId === userId
        );
        if (existingEntry) {
          const [oldSocketId] = existingEntry;
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            // Notify the old tab before disconnecting
            oldSocket.emit('kicked', {
              message: 'You joined the lobby from another tab. This session has been closed.',
            });
            oldSocket.leave('lobby');
            oldSocket.disconnect(true);
          }
          // Remove the stale entry regardless of whether the socket is still alive
          delete gameState.playerSockets[oldSocketId];
          console.log(`⚠️  Evicted duplicate session for ${user.username} (old socket: ${oldSocketId})`);
        }
        // ─────────────────────────────────────────────────────────────

        // Register player under the NEW socket
        gameState.playerSockets[socket.id] = {
          userId,
          username: user.username,
          balance: user.balance,
          totalWon: user.totalWon || 0,
          role: user.role,
          hasBet: false,
        };

        socket.join('lobby');

        // Send full state to newly connected player
        socket.emit('gameState', buildPublicState());

        // Tell player their personal balance
        socket.emit('balanceUpdate', { newBalance: user.balance });

        // Notify others of new player
        broadcastState(io);

        // If we now have >= 4 players connected and >= 2 have already placed bets, start the timer
        if (
          gameState.status === 'WAITING_FOR_PLAYERS' &&
          Object.keys(gameState.playerSockets).length >= 4 &&
          gameState.bets.length >= 2
        ) {
          await startBettingPhase(io);
        }

        console.log(`👤 ${user.username} joined lobby (${Object.keys(gameState.playerSockets).length} total)`);
      } catch (err) {
        console.error('joinLobby error:', err.message);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });


    // ── placeBet ───────────────────────────────
    socket.on('placeBet', async ({ token, amount, choice }) => {
      try {
        if (gameState.status !== 'WAITING_FOR_PLAYERS' && gameState.status !== 'BETTING') {
          return socket.emit('betError', { message: 'Betting is closed for this round' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Prevent admins from betting
        const userObj = await User.findById(userId);
        if (userObj && userObj.role === 'admin') {
          return socket.emit('betError', { message: 'Administrators cannot place wagers' });
        }

        // Check if already bet this round
        const alreadyBet = gameState.bets.find((b) => b.userId === userId);
        if (alreadyBet) {
          return socket.emit('betError', { message: 'You have already placed a bet this round' });
        }

        // Validate choice
        if (!['UNDER_7', 'EXACT_7', 'OVER_7'].includes(choice)) {
          return socket.emit('betError', { message: 'Invalid bet choice' });
        }

        // Validate amount
        const betAmount = parseFloat(amount);
        if (isNaN(betAmount) || betAmount < 1) {
          return socket.emit('betError', { message: 'Minimum bet is $1' });
        }

        // If this is the first bet of the round, initialize GameRound in DB
        if (!gameState.currentRoundId) {
          gameState.roundNumber += 1;
          const round = await GameRound.create({
            roundNumber: gameState.roundNumber,
            status: 'WAITING_FOR_PLAYERS',
            startedAt: new Date(),
          });
          gameState.currentRoundId = round._id;
        }

        // Deduct balance atomically
        const user = await User.findOneAndUpdate(
          { _id: userId, balance: { $gte: betAmount } },
          { $inc: { balance: -betAmount, totalBet: betAmount } },
          { new: true }
        );

        if (!user) {
          return socket.emit('betError', { message: 'Insufficient balance' });
        }

        // Record transaction
        await Transaction.create({
          userId,
          amount: betAmount,
          type: 'BET_PLACED',
          roundId: gameState.currentRoundId,
          balanceAfter: user.balance,
          description: `Bet $${betAmount} on ${choice} — Round #${gameState.roundNumber}`,
        });

        // Store bet server-side only
        gameState.bets.push({
          userId,
          username: user.username,
          amount: betAmount,
          choice,
        });

        gameState.pot += betAmount;



        // Mark player as having bet
        if (gameState.playerSockets[socket.id]) {
          gameState.playerSockets[socket.id].hasBet = true;
          gameState.playerSockets[socket.id].balance = user.balance;
        }

        // Confirm to the bettor only
        socket.emit('betConfirmed', {
          amount: betAmount,
          choice,
          newBalance: user.balance,
        });

        // Broadcast public state (pot + bettor count updated, choices hidden)
        broadcastState(io);

        // Trigger condition check
        const totalPlayers = Object.keys(gameState.playerSockets).length;
        const bettors = gameState.bets.length;

        if (totalPlayers >= 4) {
          if (gameState.status === 'WAITING_FOR_PLAYERS') {
            if (bettors >= 2) {
              // 4+ connected and 2+ have bet -> start the 30-second countdown
              await startBettingPhase(io);
            }
          } else if (gameState.status === 'BETTING') {
            if (bettors >= totalPlayers) {
              // All connected players have bet -> spin instantly!
              if (gameState.currentRoundId) {
                await GameRound.findByIdAndUpdate(gameState.currentRoundId, {
                  status: 'SPINNING',
                });
              }
              clearInterval(bettingCountdown);
              bettingCountdown = null;
              await spinWheel(io);
            }
          }
        }
      } catch (err) {
        console.error('placeBet error:', err);
        socket.emit('betError', { message: 'Failed to place bet' });
      }
    });

    // ── disconnect ─────────────────────────────
    socket.on('disconnect', () => {
      const player = gameState.playerSockets[socket.id];
      if (player) {
        console.log(`👋 ${player.username} left lobby`);
        delete gameState.playerSockets[socket.id];
        broadcastState(io);

        // Check if this disconnection means all remaining players have bet
        if (gameState.status === 'BETTING') {
          const totalPlayers = Object.keys(gameState.playerSockets).length;
          const bettors = gameState.bets.length;
          if (totalPlayers >= 4 && bettors >= totalPlayers) {
            clearInterval(bettingCountdown);
            bettingCountdown = null;
            spinWheel(io);
          }
        }
      }
    });
  });

  // Load last round from DB when starting up
  const initLastRoundState = async () => {
    try {
      // Load last completed round
      const lastRound = await GameRound.findOne({ status: 'RESULT' }).sort({ roundNumber: -1 });
      if (lastRound) {
        gameState.roundNumber = lastRound.roundNumber;
        gameState.result = lastRound.result;
        gameState.winningCategory = lastRound.winningCategory;
        // Keep the historic winners list structure
        gameState.winners = lastRound.bets.map((b) => ({
          userId: b.userId.toString(),
          username: b.username,
          won: b.won,
          payout: b.payout,
          refund: 0,
        }));
        console.log(`Loaded last completed round #${gameState.roundNumber} from DB.`);
      }
    } catch (err) {
      console.error('Failed to load last round state:', err);
    }
  };
  initLastRoundState();
};

module.exports = initGameSocket;
