const mongoose = require('mongoose');

const jackpotSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, default: 0.0 }, // Base seed is $0.00
  },
  { timestamps: true }
);

module.exports = mongoose.model('Jackpot', jackpotSchema);
