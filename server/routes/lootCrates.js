const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// GET /api/loot-crates/status
router.get('/status', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const lastClaim = user.lastLootCrateClaim ? new Date(user.lastLootCrateClaim) : null;
    const timeSinceLast = lastClaim ? now.getTime() - lastClaim.getTime() : Infinity;
    const canClaim = timeSinceLast >= COOLDOWN_MS;
    const nextClaimIn = canClaim ? 0 : Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000);

    res.json({
      canClaim,
      nextClaimIn,
      streak: user.lootCrateStreak || 0,
      pity: user.lootCratePity || 0,
    });
  } catch (err) {
    console.error('[LootCrates] Status error:', err);
    res.status(500).json({ message: 'Failed to fetch crate status' });
  }
});

// POST /api/loot-crates/claim
router.post('/claim', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const lastClaim = user.lastLootCrateClaim ? new Date(user.lastLootCrateClaim) : null;
    const timeSinceLast = lastClaim ? now.getTime() - lastClaim.getTime() : Infinity;

    if (timeSinceLast < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000);
      return res.status(400).json({
        message: 'Loot crate is on cooldown',
        nextClaimIn: remainingSeconds,
      });
    }

    let pity = user.lootCratePity || 0;
    let isGuaranteedLegendary = pity >= 9;

    // Roll rarity
    let rarity = 'Common';
    const rand = Math.random() * 100;

    if (isGuaranteedLegendary || rand < 5) {
      rarity = 'Legendary';
      pity = 0;
    } else if (rand < 15) {
      rarity = 'Epic';
      pity++;
    } else if (rand < 40) {
      rarity = 'Rare';
      pity++;
    } else {
      rarity = 'Common';
      pity++;
    }

    // Generate rewards based on rarity
    let creditsAwarded = 0;
    let xpAwarded = 0;

    if (rarity === 'Legendary') {
      creditsAwarded = Math.floor(Math.random() * 1501) + 1500; // 1500-3000
      xpAwarded = 1000;
    } else if (rarity === 'Epic') {
      creditsAwarded = Math.floor(Math.random() * 501) + 500;   // 500-1000
      xpAwarded = 500;
    } else if (rarity === 'Rare') {
      creditsAwarded = Math.floor(Math.random() * 251) + 200;   // 200-450
      xpAwarded = 250;
    } else {
      creditsAwarded = Math.floor(Math.random() * 101) + 50;    // 50-150
      xpAwarded = 100;
    }

    const items = [
      { name: `${creditsAwarded.toLocaleString()} Virtual Credits`, type: 'credits', value: creditsAwarded, rarity },
      { name: `${xpAwarded} XP Points`, type: 'xp', value: xpAwarded, rarity },
      { name: rarity === 'Legendary' ? 'Crown Avatar Frame' : 'Mystery Booster Token', type: 'cosmetic', rarity },
    ];

    const updatedStreak = (user.lootCrateStreak || 0) + 1;

    user.credits = (user.credits || 0) + creditsAwarded;
    user.lastLootCrateClaim = now;
    user.lootCrateStreak = updatedStreak;
    user.lootCratePity = pity;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'REWARD',
      amount: creditsAwarded,
      balanceAfter: user.credits,
      description: `Daily Loot Crate Claim (${rarity} Drop +${creditsAwarded} 🪙)`,
    });

    res.json({
      rarity,
      items,
      creditsAwarded,
      newBalance: user.credits,
      streak: updatedStreak,
      pity,
    });
  } catch (err) {
    console.error('[LootCrates] Claim error:', err);
    res.status(500).json({ message: 'Failed to claim loot crate' });
  }
});

module.exports = router;
