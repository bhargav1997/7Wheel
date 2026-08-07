const mongoose = require('mongoose');

const betSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    choice: {
      type: String,
      enum: ['UNDER_7', 'EXACT_7', 'OVER_7'],
      required: true,
    },
    payout: { type: Number, default: 0 },
    won: { type: Boolean, default: false },
  },
  { _id: false }
);

const gameRoundSchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ['WAITING_FOR_PLAYERS', 'BETTING', 'SPINNING', 'RESULT'],
      default: 'WAITING_FOR_PLAYERS',
    },
    bets: [betSchema],
    result: { type: Number, min: 1, max: 12, default: null },
    winningCategory: {
      type: String,
      enum: ['UNDER_7', 'EXACT_7', 'OVER_7', null],
      default: null,
    },
    totalPot: { type: Number, default: 0 },
    hadWinners: { type: Boolean, default: false },
    platformEarnings: { type: Number, default: 0 },
    startedAt: { type: Date },
    bettingStartedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GameRound', gameRoundSchema);
