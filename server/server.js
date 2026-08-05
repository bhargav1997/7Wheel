require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const initGameSocket = require('./sockets/gameSocket');

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
connectDB();

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// Socket.io Game Engine
// ─────────────────────────────────────────────
initGameSocket(io);

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 7 Wheel Central Hub server running on port ${PORT}`);
  console.log(`   → REST API: http://localhost:${PORT}/api`);
  console.log(`   → Socket.io ready`);
});
