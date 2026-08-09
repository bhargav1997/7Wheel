/**
 * creditPacks.js
 * ─────────────────────────────────────────────────────────────
 * Defines the available credit packs users can purchase.
 * Credits are virtual entertainment tokens with no real-world
 * monetary value and CANNOT be withdrawn or redeemed for cash.
 * ─────────────────────────────────────────────────────────────
 */

const CREDIT_PACKS = [
  {
    id: 'starter',
    label: 'Starter Pack',
    credits: 500,
    bonusCredits: 0,
    priceUSD: 4.99,
    popular: false,
    description: 'Perfect to get started',
  },
  {
    id: 'popular',
    label: 'Popular Pack',
    credits: 1500,
    bonusCredits: 200,
    priceUSD: 9.99,
    popular: true,
    description: 'Best value for most players',
  },
  {
    id: 'highroller',
    label: 'High Roller',
    credits: 5000,
    bonusCredits: 1000,
    priceUSD: 24.99,
    popular: false,
    description: 'For serious players',
  },
  {
    id: 'vip',
    label: 'VIP Pack',
    credits: 15000,
    bonusCredits: 5000,
    priceUSD: 49.99,
    popular: false,
    description: 'Maximum credits, maximum fun',
  },
];

/**
 * Lookup a pack by its ID.
 * Returns undefined if not found.
 */
const getPackById = (id) => CREDIT_PACKS.find((p) => p.id === id);

module.exports = { CREDIT_PACKS, getPackById };
