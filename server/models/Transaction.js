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
      enum: [
        'CREDIT_PURCHASE',
        'BONUS_CREDITS',
        'BET_PLACED',
        'BET_WON',
        'GAME_WIN',
        'REFUND',
        'REWARD',
        'CREDIT_TRANSFER_SENT',
        'CREDIT_TRANSFER_RECEIVED',
      ],
      required: true,
    },
    packId: {
      type: String,
      default: null, // set on CREDIT_PURCHASE
    },
    creditsPurchased: {
      type: Number,
      default: 0, // total credits awarded (base + bonus)
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
