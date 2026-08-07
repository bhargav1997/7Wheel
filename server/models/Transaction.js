const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['DEPOSIT', 'BET_PLACED', 'BET_WON', 'REFUND', 'WITHDRAWAL'],
      required: true,
    },
    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameRound',
      default: null,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
