// backend/src/config/db.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not defined in environment');
}

module.exports.connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return; // already connected
  await mongoose.connect(MONGODB_URI, {
    // options can be added if needed
  });
  console.log('✅ Connected to MongoDB');
};
