// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const photoRoutes = require('./routes/photos');
// Additional route imports can be added here (events, exhibitions, ai, notifications, reports)

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/photos', photoRoutes);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ DB connection error', err);
    process.exit(1);
  });
