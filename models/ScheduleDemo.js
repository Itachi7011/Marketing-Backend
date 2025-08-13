const mongoose = require("mongoose");

const ScheduleDemoSchema = new mongoose.Schema({
    // ========== REQUESTER INFORMATION ==========
    requester: {
        personalInfo: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            jobTitle: { type: String },
            timezone: { type: String },
            preferredLanguage: { type: String, default: "en" }
        },
        contactInfo: {
            email: {
                type: String,
                required: true,
                validate: {
                    validator: function(v) {
                        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                    }
                }
            },
            phone: {
                type: String,
                validate: {
                    validator: function(v) {
                        return /^\+?[1-9]\d{1,14}$/.test(v); // E.164 format
                    }
                }
            },
            communicationPreference: {
                type: String,
                enum: ['email', 'phone', 'whatsapp', 'any'],
                default: 'email'
            }
        }
    },

    // ========== COMPANY INFORMATION ==========
    company: {
        name: { type: String, required: true },
        website: {
            type: String,
            validate: {
                validator: function(v) {
                    return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
                }
            }
        },
        industry: {
            type: String,
            enum: [
                'ecommerce', 'saas', 'agency', 'education', 'finance',
                'healthcare', 'entertainment', 'real-estate', 'manufacturing',
                'retail', 'other'
            ]
        },
        size: {
            type: String,
            enum: ['solopreneur', '2-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
        },
        marketingTeamSize: {
            type: String,
            enum: ['none', '1-3', '4-7', '8-15', '16+']
        }
    },

    // ========== DEMO DETAILS ==========
    demoDetails: {
        preferredDate: { type: Date, required: true },
        preferredTime: { type: String, required: true },
        duration: {
            type: String,
            enum: ['30-min', '45-min', '60-min'],
            default: '30-min'
        },
        demoType: {
            type: String,
            enum: [
                'platform-overview', 
                'ai-content-creation', 
                'campaign-automation',
                'analytics-dashboard',
                'integrations',
                'custom'
            ],
            required: true
        },
        customTopics: [String],
        attendees: [{
            name: String,
            email: String,
            role: String
        }],
        specialRequirements: String
    },

    // ========== MARKETING CONTEXT ==========
    marketingContext: {
        currentChallenges: [{
            type: String,
            enum: [
                'content-creation', 'team-bandwidth', 'ad-performance',
                'lead-generation', 'roi-measurement', 'multi-channel',
                'personalization', 'data-integration', 'other'
            ]
        }],
        currentTools: [String],
        monthlyAdBudget: {
            type: String,
            enum: ['none', '<1k', '1k-5k', '5k-20k', '20k-100k', '100k+']
        },
        desiredFeatures: [{
            type: String,
            enum: [
                'ai-copywriting', 'visual-content', 'automation',
                'predictive-analytics', 'multi-user', 'api-access',
                'white-label', 'custom-models', 'other'
            ]
        }]
    },

    // ========== DEMO STATUS ==========
    status: {
        current: {
            type: String,
            enum: ['scheduled', 'confirmed', 'rescheduled', 'completed', 'canceled', 'no-show'],
            default: 'scheduled'
        },
        confirmationSent: { type: Boolean, default: false },
        reminderSent: { type: Boolean, default: false },
        followUpRequired: { type: Boolean, default: false },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        calendarEventId: String,
        videoConferenceLink: String
    },

    // ========== FOLLOW-UP INFORMATION ==========
    followUp: {
        notes: [{
            content: String,
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
        }],
        nextSteps: [{
            action: String,
            dueDate: Date,
            completed: { type: Boolean, default: false }
        }],
        satisfactionScore: {
            type: Number,
            min: 1,
            max: 5
        }
    },

    // ========== SYSTEM FIELDS ==========
    metadata: {
        source: {
            type: String,
            enum: ['website', 'landing-page', 'referral', 'sales-outreach', 'other'],
            default: 'website'
        },
        utmParameters: {
            source: String,
            medium: String,
            campaign: String,
            content: String
        },
        ipAddress: String,
        userAgent: String,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },

    // ========== RELATIONSHIPS ==========
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Marketing_User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for quick querying
ScheduleDemoSchema.index({ 'requester.contactInfo.email': 1 });
ScheduleDemoSchema.index({ 'demoDetails.preferredDate': 1 });
ScheduleDemoSchema.index({ 'status.current': 1 });
ScheduleDemoSchema.index({ 'company.name': 1 });

// Virtual for full name
ScheduleDemoSchema.virtual('requester.fullName').get(function() {
    return `${this.requester.personalInfo.firstName} ${this.requester.personalInfo.lastName}`;
});

// Pre-save hook for data validation
ScheduleDemoSchema.pre('save', function(next) {
    if (this.demoDetails.demoType === 'custom' && (!this.demoDetails.customTopics || this.demoDetails.customTopics.length === 0)) {
        throw new Error('Custom demo requires at least one custom topic');
    }
    next();
});

const ScheduleDemo = mongoose.model("Marketing_ScheduleDemo", ScheduleDemoSchema);
module.exports = ScheduleDemo;