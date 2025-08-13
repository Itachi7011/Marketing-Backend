
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ContactInfoSchema = new mongoose.Schema({
    // ========== CORE CONTACT INFORMATION ==========
    contactDetails: {
        email: {
            type: String,
            required: true,
            unique: true,
            validate: {
                validator: function(v) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                }
            }
        },
        phone: {
            type: String,
            required: true,
            validate: {
                validator: function(v) {
                    return /^\+?[1-9]\d{1,14}$/.test(v); // E.164 format
                }
            }
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String },
            postalCode: { type: String },
            country: { type: String, required: true },
            coordinates: {
                lat: Number,
                lng: Number
            }
        }
    },

    // ========== BUSINESS OPERATIONS ==========
    operations: {
        businessHours: {
            type: String,
            default: 'Mon-Fri: 9AM-6PM EST',
            required: true
        },
        timezone: {
            type: String,
            default: 'America/New_York'
        },
        holidays: [{
            name: String,
            date: Date,
            observed: Boolean
        }]
    },

    // ========== CONTACT PREFERENCES ==========
    preferences: {
        preferredContactMethod: {
            type: String,
            enum: ['email', 'phone', 'sms', 'whatsapp'],
            default: 'email'
        },
        notificationSettings: {
            emailAlerts: { type: Boolean, default: true },
            smsAlerts: { type: Boolean, default: false },
            pushNotifications: { type: Boolean, default: true }
        },
        responseTimeExpectation: {
            type: String,
            enum: ['1-hour', '4-hours', '24-hours', '48-hours'],
            default: '24-hours'
        }
    },

    // ========== STATUS & ACTIVITY ==========
    status: {
        isActive: {
            type: Boolean,
            default: true
        },
        lastVerified: Date,
        verificationMethod: {
            type: String,
            enum: ['email', 'phone', 'manual', 'none'],
            default: 'none'
        }
    },

    // ========== SYSTEM FIELDS ==========
    metadata: {
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add index for frequently queried fields
// ContactInfoSchema.index({ 'contactDetails.email': 1 });
ContactInfoSchema.index({ 'contactDetails.phone': 1 });
ContactInfoSchema.index({ 'status.isActive': 1 });

const ContactInfo = mongoose.model("Marketing_ContactInfo", ContactInfoSchema);

module.exports = ContactInfo;