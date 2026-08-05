const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Ensure unique indexes are enforced (email, username on User).
    // syncIndexes() creates missing indexes and drops obsolete ones.
    // This is critical when the collection already exists without indexes.
    const User = require('../models/User');
    await User.syncIndexes();
    console.log('✅ MongoDB indexes synced');
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

