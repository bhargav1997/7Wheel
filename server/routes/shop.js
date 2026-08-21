const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// ── Catalog of VIP Prestige Cosmetics ─────────────────────────────────────────
const SHOP_ITEMS = [
  // ── 1. AVATAR FRAMES ──
  {
    id: 'frame_default',
    name: 'Classic Slate',
    category: 'FRAME',
    price: 0,
    rarity: 'COMMON',
    description: 'Clean default casino border',
    icon: 'Shield',
    previewClass: 'border-slate-700 bg-slate-900',
    ringEffect: 'ring-1 ring-slate-700',
  },
  {
    id: 'frame_neon_cyan',
    name: 'Cyberpunk Overdrive',
    category: 'FRAME',
    price: 1000,
    rarity: 'RARE',
    description: 'Electric cyan plasma halo with active pulse',
    icon: 'Zap',
    previewClass: 'border-cyan-400 bg-cyan-950 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]',
    ringEffect: 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse',
  },
  {
    id: 'frame_emerald_luck',
    name: 'Emerald Dynasty',
    category: 'FRAME',
    price: 3500,
    rarity: 'RARE',
    description: 'Jeweled radiant jade aura with emerald flares',
    icon: 'Sparkles',
    previewClass: 'border-emerald-400 bg-emerald-950 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.5)]',
    ringEffect: 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]',
  },
  {
    id: 'frame_gold_royale',
    name: '24K High Roller Crown',
    category: 'FRAME',
    price: 10000,
    rarity: 'EPIC',
    description: 'Pure molten 24K gold with shimmering corona',
    icon: 'Crown',
    previewClass: 'border-amber-400 bg-amber-950 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]',
    ringEffect: 'ring-2 ring-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.8)] border-amber-300',
  },
  {
    id: 'frame_dragon_inferno',
    name: 'Dragonfire Inferno',
    category: 'FRAME',
    price: 30000,
    rarity: 'EPIC',
    description: 'Volcanic flame aura with blazing ember pulses',
    icon: 'Flame',
    previewClass: 'border-red-500 bg-red-950 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.7)]',
    ringEffect: 'ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse border-orange-400',
  },
  {
    id: 'frame_diamond_mythic',
    name: 'Cosmic Prism Diamond',
    category: 'FRAME',
    price: 60000,
    rarity: 'LEGENDARY',
    description: 'Iridescent diamond light with violet refraction',
    icon: 'Gem',
    previewClass: 'border-purple-400 bg-purple-950 text-purple-200 shadow-[0_0_30px_rgba(168,85,247,0.8)]',
    ringEffect: 'ring-2 ring-fuchsia-400 shadow-[0_0_30px_rgba(192,132,252,0.9)] border-cyan-300 animate-pulse',
  },
  {
    id: 'frame_void_eclipse',
    name: 'Void Eclipse Sovereign (1 Lakh 🪙)',
    category: 'FRAME',
    price: 100000,
    rarity: 'MYTHIC',
    description: 'Deep space singularity with hyper-violet dark matter accretion ring',
    icon: 'Moon',
    previewClass: 'border-fuchsia-500 bg-slate-950 text-fuchsia-200 shadow-[0_0_35px_rgba(217,70,239,0.9)]',
    ringEffect: 'ring-2 ring-fuchsia-500 border-2 border-indigo-400 shadow-[0_0_35px_rgba(217,70,239,0.95)] animate-pulse',
  },
  {
    id: 'frame_celestial_god',
    name: 'Celestial Godmode (2.5 Lakh 🪙)',
    category: 'FRAME',
    price: 250000,
    rarity: 'MYTHIC',
    description: 'Golden Zeus lightning storm & radiant divine halo',
    icon: 'Sun',
    previewClass: 'border-yellow-300 bg-amber-950 text-yellow-200 shadow-[0_0_40px_rgba(253,224,71,0.95)]',
    ringEffect: 'ring-2 ring-yellow-300 border-2 border-amber-400 shadow-[0_0_45px_rgba(253,224,71,1)] animate-pulse',
  },
  {
    id: 'frame_infinite_multiverse',
    name: 'Infinite Omnipotent (5 Lakh 🪙)',
    category: 'FRAME',
    price: 500000,
    rarity: 'MYTHIC',
    description: 'Multi-spectrum rainbow holographic aura with stardust core',
    icon: 'Infinity',
    previewClass: 'border-teal-300 bg-purple-950 text-cyan-200 shadow-[0_0_50px_rgba(45,212,191,1)]',
    ringEffect: 'ring-2 ring-cyan-400 border-2 border-pink-400 shadow-[0_0_50px_rgba(236,72,153,1)] animate-pulse',
  },

  // ── 2. LUXURY PRESTIGE TITLES & BADGES (Modern Clean Styling) ──
  {
    id: 'title_novice',
    name: 'Standard Player',
    category: 'TITLE',
    price: 0,
    rarity: 'COMMON',
    description: 'Clean default profile without badge',
    icon: 'Star',
    badgeText: null,
    badgeClass: '',
  },
  {
    id: 'title_card_shark',
    name: 'CARD SHARK',
    category: 'TITLE',
    price: 1500,
    rarity: 'RARE',
    description: 'Neon cyan tactical badge with card layers',
    icon: 'Layers',
    badgeText: 'CARD SHARK',
    badgeClass: 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.35)]',
  },
  {
    id: 'title_high_roller',
    name: 'HIGH ROLLER',
    category: 'TITLE',
    price: 2500,
    rarity: 'RARE',
    description: 'Golden metallic badge for bold players',
    icon: 'Coins',
    badgeText: 'HIGH ROLLER',
    badgeClass: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
  },
  {
    id: 'title_apex_predator',
    name: 'APEX PREDATOR',
    category: 'TITLE',
    price: 10000,
    rarity: 'EPIC',
    description: 'Crimson tactical badge for high-win strikers',
    icon: 'Flame',
    badgeText: 'APEX PREDATOR',
    badgeClass: 'bg-gradient-to-r from-red-600/35 to-rose-600/35 text-rose-300 border-red-500/70 shadow-[0_0_15px_rgba(244,63,94,0.45)]',
  },
  {
    id: 'title_casino_whale',
    name: 'CASINO WHALE',
    category: 'TITLE',
    price: 25000,
    rarity: 'EPIC',
    description: 'Deep ocean sapphire badge for massive bankrolls',
    icon: 'Gem',
    badgeText: 'CASINO WHALE',
    badgeClass: 'bg-gradient-to-r from-cyan-500/35 to-blue-600/35 text-cyan-200 border-cyan-400/70 shadow-[0_0_15px_rgba(34,211,238,0.45)]',
  },
  {
    id: 'title_grandmaster',
    name: 'GRANDMASTER',
    category: 'TITLE',
    price: 50000,
    rarity: 'LEGENDARY',
    description: 'Royal amethyst & gold emblem for elite champions',
    icon: 'Crown',
    badgeText: 'GRANDMASTER',
    badgeClass: 'bg-gradient-to-r from-purple-600/40 via-fuchsia-500/40 to-amber-500/40 text-amber-200 border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.6)]',
  },
  {
    id: 'title_platform_sovereign',
    name: 'PLATFORM SOVEREIGN (1 Lakh 🪙)',
    category: 'TITLE',
    price: 100000,
    rarity: 'MYTHIC',
    description: '24K Gold & Platinum iridescent shield badge',
    icon: 'Sparkles',
    badgeText: 'SOVEREIGN 100K',
    badgeClass: 'bg-gradient-to-r from-yellow-500/45 via-amber-400/45 to-yellow-600/45 text-yellow-100 border-yellow-300 shadow-[0_0_25px_rgba(253,224,71,0.8)] ring-1 ring-yellow-400/60',
  },
  {
    id: 'title_immortal_billionaire',
    name: 'IMMORTAL BILLIONAIRE (2.5 Lakh 🪙)',
    category: 'TITLE',
    price: 250000,
    rarity: 'MYTHIC',
    description: 'Prismatic cosmic radiant badge for the top 0.01%',
    icon: 'Award',
    badgeText: 'IMMORTAL VIP',
    badgeClass: 'bg-gradient-to-r from-fuchsia-600/45 via-purple-600/45 to-cyan-500/45 text-fuchsia-100 border-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.9)] ring-1 ring-fuchsia-400/70',
  },
  {
    id: 'title_casino_overlord',
    name: 'THE HOUSE OVERLORD (5 Lakh 🪙)',
    category: 'TITLE',
    price: 500000,
    rarity: 'MYTHIC',
    description: 'Supreme God-tier gold emblem: You own the casino',
    icon: 'Shield',
    badgeText: 'HOUSE OVERLORD',
    badgeClass: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-slate-950 border-white shadow-[0_0_35px_rgba(251,191,36,1)] ring-2 ring-amber-300',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shop/items — Get Catalog and user inventory
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const inventory = user.inventory || ['frame_default', 'title_novice'];
    const equipped = user.equipped || { frame: 'frame_default', title: 'title_novice' };

    return res.json({
      catalog: SHOP_ITEMS,
      inventory,
      equipped,
      balance: user.balance,
    });
  } catch (err) {
    console.error('Shop items error:', err);
    return res.status(500).json({ message: 'Server error loading shop' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shop/buy — Purchase a cosmetic item
// ─────────────────────────────────────────────────────────────────────────────
router.post('/buy', verifyJWT, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ message: 'Item not found in catalog' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const inventory = user.inventory || ['frame_default', 'title_novice'];

    if (inventory.includes(itemId)) {
      return res.status(400).json({ message: 'You already own this item!' });
    }

    if (user.balance < item.price) {
      return res.status(400).json({ message: 'Insufficient credits balance' });
    }

    const fieldToUpdate = item.category === 'FRAME' ? 'equipped.frame' : 'equipped.title';

    // Deduct credits, add to inventory, and automatically equip
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { balance: -item.price },
        $addToSet: { inventory: itemId },
        $set: { [fieldToUpdate]: itemId },
      },
      { new: true }
    );

    await Transaction.create({
      userId: user._id,
      type: 'REWARD',
      amount: item.price,
      balanceAfter: updatedUser.balance,
      description: `VIP Shop: Unlocked "${item.name}" for ${item.price.toLocaleString()} 🪙`,
    });

    return res.json({
      success: true,
      message: `Unlocked "${item.name}"!`,
      item,
      inventory: updatedUser.inventory,
      equipped: updatedUser.equipped || { frame: 'frame_default', title: 'title_novice' },
      balanceAfter: updatedUser.balance,
    });
  } catch (err) {
    console.error('Shop buy error:', err);
    return res.status(500).json({ message: 'Server error processing purchase' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shop/equip — Equip an owned item
// ─────────────────────────────────────────────────────────────────────────────
router.post('/equip', verifyJWT, async (req, res) => {
  try {
    const { itemId, category } = req.body; // category: 'FRAME' or 'TITLE'
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const inventory = user.inventory || ['frame_default', 'title_novice'];
    if (!inventory.includes(itemId)) {
      return res.status(400).json({ message: 'You must purchase this item first!' });
    }

    const fieldToUpdate = category === 'FRAME' ? 'equipped.frame' : 'equipped.title';

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { [fieldToUpdate]: itemId } },
      { new: true }
    );

    return res.json({
      success: true,
      message: `Equipped "${item.name}"!`,
      equipped: updatedUser.equipped,
      item,
    });
  } catch (err) {
    console.error('Shop equip error:', err);
    return res.status(500).json({ message: 'Server error equipping item' });
  }
});

module.exports = router;
