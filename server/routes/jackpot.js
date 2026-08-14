const express = require('express');
const router = express.Router();
const JackpotTower = require('../models/JackpotTower');

const INITIAL_TOWERS = [
  { tier: 'BRONZE', maxAmount: 500, currentAmount: 125 },
  { tier: 'SILVER', maxAmount: 5000, currentAmount: 1450 },
  { tier: 'GOLD', maxAmount: 50000, currentAmount: 18200 },
];

// GET /api/jackpot/status
router.get('/status', async (req, res) => {
  try {
    let towers = await JackpotTower.find().sort({ maxAmount: 1 });

    if (towers.length === 0) {
      towers = await JackpotTower.insertMany(INITIAL_TOWERS);
    }

    res.json({ towers });
  } catch (err) {
    console.error('[Jackpot] Status fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch jackpot status' });
  }
});

module.exports = router;
