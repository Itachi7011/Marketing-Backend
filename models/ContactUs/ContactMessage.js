const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const ContactMessageSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    company: String,
    phone: String,
    subject: String,
    message: { type: String, required: true },
    serviceType: { type: String, default: 'general' },
    budget: String,
    timeline: String,
    ipAddress: String,
    userAgent: String,
    source: { type: String, default: 'website' },
    status: { type: String, default: 'new' },
    priority: { type: String, default: 'medium' },
    readAt: Date,
    repliedAt: Date,
    metadata: {
        spamScore: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

ContactMessageSchema.index({ createdAt: -1 });

// Pre-save hook for spam detection
ContactMessageSchema.pre('save', function (next) {
    // Simple spam score calculation (can be enhanced)
    this.metadata.spamScore = calculateSpamScore(this);
    next();
});

function calculateSpamScore(message) {
    let score = 0;

    // Check if message exists and is a string
    if (typeof message.message === 'string') {
        // Example simple spam detection logic
        if (message.message.includes('http://') || message.message.includes('https://')) {
            score += 20;
        }
        if (message.message.length < 20) {
            score += 10;
        }
    }

    return score;
}

const ContactMessage = mongoose.model("Marketing_ContactMessage", ContactMessageSchema);

module.exports = ContactMessage;
