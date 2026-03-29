require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const aiRoutes = require('./routes/aiRoutes');
const newsRoutes = require('./routes/newsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/news', newsRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB & Compass Synced"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 AI Server 2026 running on port ${PORT}`));