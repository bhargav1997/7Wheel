const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    balance: {
      type: Number,
      default: 100,  // 100 free credits on signup
      min: [0, 'Balance cannot be negative'],
      set: (val) => Math.round(val * 100) / 100,
      get: (val) => Math.round(val * 100) / 100,
    },
    creditsEarned: {
      type: Number,
      default: 0, // lifetime credits purchased (for VIP tier logic)
    },
    totalWon: {
      type: Number,
      default: 0,
    },
    totalBet: {
      type: Number,
      default: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    // ── Referral system ─────────────────────────
    referralCode: {
      type: String,
      unique: true,
      sparse: true, // allows null for existing users without breaking unique index
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralCount: {
      type: Number,
      default: 0, // how many users this user has referred
    },
    // ── Daily Streak system ──────────────────────
    loginStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // ── Loot Crate Gacha system ─────────────────
    lastLootCrateClaim: {
      type: Date,
      default: null,
    },
    lootCrateStreak: {
      type: Number,
      default: 0,
    },
    lootCratePity: {
      type: Number,
      default: 0, // resets to 0 on Legendary drop; at 10 guarantees Legendary
    },
    // ── VIP Prestige & Cosmetics ────────────────
    inventory: {
      type: [String],
      default: ['frame_default', 'title_novice'],
    },
    equipped: {
      frame: { type: String, default: 'frame_default' },
      title: { type: String, default: 'title_novice' },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
