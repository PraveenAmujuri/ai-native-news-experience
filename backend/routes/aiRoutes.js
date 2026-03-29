const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const { generateNavigatorBriefing } = require('../services/aiService');

router.post('/navigator', async (req, res) => {
    const { query, persona } = req.body;

    try {
        const articles = await Article.find().sort({ published_at: -1 }).limit(3);
        
        if (!articles || articles.length === 0) {
            return res.status(404).json({ error: "Seed the database first at /api/news/seed" });
        }

        const answer = await generateNavigatorBriefing(query, persona, articles);
        
        res.json({ 
            answer,
            sources: articles.map(a => a.title),
            engine: "Gemini 2.5 Flash"
        });
    } catch (error) {
        res.status(500).json({ error: "Latest Model failed. Check API credits." });
    }
});

module.exports = router;