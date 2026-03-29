const express = require('express');
const router = express.Router();
const Article = require('../models/Article');

// Seed Data for Testing
router.post('/seed', async (req, res) => {
    try {
        const sample = new Article({
            title: "RBI Holds Rates, Shifts to Neutral Stance",
            content: "The Reserve Bank of India kept the repo rate unchanged at 6.5% today but signaled a shift in stance, potentially leading to cuts in Q3 2026.",
            category: "Markets",
            sentiment_score: 0.5
        });
        await sample.save();
        res.status(201).json({ message: "Seed data added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Latest News (for the Bento Grid)
router.get('/latest', async (req, res) => {
    try {
        const news = await Article.find().sort({ published_at: -1 }).limit(10);
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;