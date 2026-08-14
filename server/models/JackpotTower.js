const mongoose = require('mongoose');

const jackpotTowerSchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD'],
      required: true,
      unique: true,
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    maxAmount: {
      type: Number,
      required: true,
    },
    recentWinners: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        amountWon: Number,
        wonAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('JackpotTower', jackpotTowerSchema);
