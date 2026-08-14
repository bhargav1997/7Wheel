const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health — Full System & Database Health Check
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  const healthInfo = {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStateMap[dbState] || 'unknown',
      connected: isHealthy,
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };

  res.status(isHealthy ? 200 : 503).json(healthInfo);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health/ping — Fast Ping Endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

module.exports = router;
