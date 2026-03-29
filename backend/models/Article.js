const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, default: 'General' },
    sentiment_score: { type: Number, default: 0 },
    published_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', ArticleSchema);