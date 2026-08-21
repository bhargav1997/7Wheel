require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const rewardsRoutes = require('./routes/rewards');
const betsRoutes = require('./routes/bets');
const leaderboardRoutes = require('./routes/leaderboard');
const lootCratesRoutes = require('./routes/lootCrates');
const jackpotRoutes = require('./routes/jackpot');
const slotsRoutes = require('./routes/slots');
const minesRoutes = require('./routes/mines');
const rouletteRoutes = require('./routes/roulette');
const blackjackRoutes = require('./routes/blackjack');
const plinkoRoutes = require('./routes/plinko');
const kenoRoutes = require('./routes/keno');
const shopRoutes = require('./routes/shop');
const healthRoutes = require('./routes/health');
const initGameSocket = require('./sockets/gameSocket');
const { initFlipOrFlopSocket } = require('./sockets/flipOrFlopSocket');
const { initCrashSocket } = require('./sockets/crashSocket');

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
connectDB();

const app = express();
const httpServer = http.createServer(app);

// Determine allowed origins (support comma-separated origins, e.g. "https://7-wheel.vercel.app,http://localhost:5173")
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000'];

const isOriginAllowed = (origin, callback) => {
  if (!origin) return callback(null, true);
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (
    allowedOrigins.includes(cleanOrigin) ||
    allowedOrigins.includes('*') ||
    cleanOrigin.endsWith('.vercel.app')
  ) {
    return callback(null, true);
  }
  return callback(null, true);
};

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: isOriginAllowed,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: isOriginAllowed,
    credentials: true,
  })
);
app.use(express.json());
app.set('io', io);

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/loot-crates', lootCratesRoutes);
app.use('/api/jackpot', jackpotRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/mines', minesRoutes);
app.use('/api/roulette', rouletteRoutes);
app.use('/api/blackjack', blackjackRoutes);
app.use('/api/plinko', plinkoRoutes);
app.use('/api/keno', kenoRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/health', healthRoutes);

// ─────────────────────────────────────────────
// Socket.io Game Engines
// ─────────────────────────────────────────────
initGameSocket(io);
initFlipOrFlopSocket(io);
initCrashSocket(io);

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 7 Wheel Central Hub server running on port ${PORT}`);
  console.log(`   → REST API: http://localhost:${PORT}/api`);
  console.log(`   → Socket.io ready`);
});
