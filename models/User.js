const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const MarketingUserSchema = new mongoose.Schema({
    // ========== CORE IDENTITY ==========
    personalInfo: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        displayName: { type: String },
        gender: {
            type: String,
            enum: [
                'male', 'female', 'others',
            ]
        },
        avatar: {
            url: String,
            publicId: String
        },
        bio: { type: String, maxlength: 250 },
        userType: { type: String, default: "Client" },
        timezone: { type: String },
        preferredLanguage: { type: String, default: "en" }
    },

    // ========== AUTHENTICATION ==========
    auth: {
        email: {
            type: String,
            required: true,
            unique: true,
            validate: {
                validator: function (v) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                }
            }
        },
        phone: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^\+?[1-9]\d{1,14}$/.test(v); // E.164 format
                }
            }
        },

        password: { type: String, required: true },
        emailVerified: { type: Boolean, default: false },
        phoneVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false },
        lastPasswordChange: { type: Date },
        failedLoginAttempts: { type: Number, default: 0 },
        accountLockedUntil: { type: Date }
    },
    otp: { type: String },

    // ========== BUSINESS PROFILE ==========
    business: {
        companyName: { type: String },
        companyLogo: {
            url: String,
            publicId: String
        },
        website: {
            type: String,
            validate: {
                validator: function (v) {
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
        businessType: {
            type: String,
            enum: ['b2b', 'b2c', 'both']
        },
        companySize: {
            type: String,
            enum: ['solopreneur', '2-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
        },
        taxID: { type: String },
        companyDescription: { type: String }
    },

    // ========== MARKETING PROFILE ==========
    marketingProfile: {
        role: {
            type: String,
            enum: [
                'owner', 'cmio', 'marketing-director', 'social-media-manager',
                'content-creator', 'seo-specialist', 'ppc-expert', 'growth-hacker',
                'freelancer', 'student', 'other'
            ]
        },
        experienceLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        },
        monthlyAdBudget: {
            type: String,
            enum: ['none', '<1k', '1k-5k', '5k-20k', '20k-100k', '100k+']
        },
        marketingGoals: [{
            type: String,
            enum: [
                'brand-awareness', 'lead-generation', 'sales-conversion',
                'customer-retention', 'community-building', 'traffic-growth',
                'product-launch', 'reputation-management'
            ]
        }],
        challenges: [{
            type: String,
            enum: [
                'budget-constraints', 'measuring-roi', 'team-bandwidth',
                'platform-changes', 'audience-targeting', 'content-creation',
                'ad-fatigue', 'competition', 'tech-integration'
            ]
        }]
    },

    // ========== SOCIAL & PLATFORM INTEGRATIONS ==========
    integrations: {
        // Traditional Social
        facebook: {
            pageId: String,
            pageName: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        instagram: {
            username: String,
            businessId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        twitter: {
            userId: String,
            username: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        linkedin: {
            companyId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },

        // Emerging Platforms
        tiktok: {
            username: String,
            businessId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        whatsapp: {
            businessId: String,
            connected: Boolean,
            lastSynced: Date
        },
        telegram: {
            botToken: String,
            connected: Boolean
        },
        discord: {
            serverId: String,
            connected: Boolean
        },

        // E-commerce & Marketplaces
        shopify: {
            storeName: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        woocommerce: {
            storeUrl: String,
            consumerKey: String,
            consumerSecret: String,
            connected: Boolean,
            lastSynced: Date
        },
        amazonSeller: {
            sellerId: String,
            connected: Boolean
        },

        // Advertising Platforms
        googleAds: {
            customerId: String,
            refreshToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        metaAds: {
            adAccountId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        tiktokAds: {
            adAccountId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },

        // Analytics & SEO
        googleAnalytics: {
            propertyId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        googleSearchConsole: {
            siteUrl: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        googleMyBusiness: {
            locationId: String,
            connected: Boolean
        },

        // Email Marketing
        mailchimp: {
            accountId: String,
            apiKey: String,
            connected: Boolean,
            lastSynced: Date
        },
        klaviyo: {
            accountId: String,
            apiKey: String,
            connected: Boolean,
            lastSynced: Date
        },

        // CRM
        hubspot: {
            portalId: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },
        salesforce: {
            instanceUrl: String,
            accessToken: String,
            connected: Boolean,
            lastSynced: Date
        },

        // Other Tools
        zapier: {
            apiKey: String,
            connected: Boolean
        },
        slack: {
            teamId: String,
            accessToken: String,
            connected: Boolean
        }
    },

    // ========== TARGET AUDIENCE ==========
    targetAudience: {
        demographics: {
            ageRange: {
                min: { type: Number, min: 13, max: 100 },
                max: { type: Number, min: 13, max: 100 }
            },
            genders: [{
                type: String,
                enum: ['male', 'female', 'non-binary', 'other']
            }],
            locations: [{
                country: String,
                region: String,
                city: String
            }],
            languages: [String],
            incomeLevels: [{
                type: String,
                enum: ['low', 'middle', 'high', 'luxury']
            }]
        },
        psychographics: {
            interests: [String],
            values: [String],
            lifestyles: [String],
            painPoints: [String]
        },
        behavior: {
            buyingHabits: [String],
            brandLoyalty: { type: String, enum: ['low', 'medium', 'high'] },
            deviceUsage: [{
                type: String,
                enum: ['mobile', 'desktop', 'tablet']
            }]
        }
    },

    // ========== AI & AUTOMATION PREFERENCES ==========
    aiPreferences: {
        contentGeneration: {
            brandVoice: {
                type: String,
                enum: ['professional', 'friendly', 'authoritative', 'quirky', 'enthusiastic']
            },
            toneVariations: [String],
            prohibitedTerms: [String],
            styleGuide: String
        },
        automationSettings: {
            postScheduling: { type: Boolean, default: true },
            autoResponses: { type: Boolean, default: false },
            sentimentAnalysis: { type: Boolean, default: true },
            competitorMonitoring: { type: Boolean, default: false }
        },
        modelPreferences: {
            primaryModel: { type: String, default: 'gpt-4' },
            fallbackModel: { type: String, default: 'gpt-3.5-turbo' },
            imageModel: { type: String, default: 'dall-e-3' }
        }
    },

    // ========== CONTENT LIBRARY ==========
    contentAssets: {
        brandAssets: [{
            type: { type: String, enum: ['logo', 'image', 'video', 'document'] },
            url: String,
            publicId: String,
            description: String,
            tags: [String]
        }],
        contentTemplates: [{
            name: String,
            type: { type: String, enum: ['post', 'ad', 'email', 'landing-page'] },
            content: String,
            variables: [String],
            lastUsed: Date
        }],
        mediaLibrary: [{
            type: { type: String, enum: ['image', 'video', 'audio', 'document'] },
            url: String,
            publicId: String,
            dimensions: {
                width: Number,
                height: Number
            },
            size: Number,
            format: String,
            altText: String,
            tags: [String],
            created: { type: Date, default: Date.now }
        }]
    },

    // ========== BILLING & SUBSCRIPTION ==========
    billing: {
        plan: {
            type: String,
            enum: ['free', 'starter', 'professional', 'agency', 'enterprise'],
            default: 'free'
        },
        paymentMethod: {
            type: {
                type: String,
                enum: ['card', 'paypal', 'bank-transfer', 'crypto']
            },
            last4: String,
            expiry: String,
            brand: String
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'quarterly', 'annual'],
            default: 'monthly'
        },
        nextBillingDate: Date,
        billingHistory: [{
            date: Date,
            amount: Number,
            currency: String,
            invoiceId: String,
            status: { type: String, enum: ['paid', 'pending', 'failed', 'refunded'] }
        }],
        credits: {
            available: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            expiresAt: Date
        }
    },

    // ========== ACTIVITY & USAGE ==========
    activity: {
        lastLogin: Date,
        loginHistory: [{
            date: Date,
            ip: String,
            device: String,
            location: String
        }],
        featureUsage: {
            contentGenerator: { count: Number, lastUsed: Date },
            analyticsDashboard: { count: Number, lastUsed: Date },
            campaignManager: { count: Number, lastUsed: Date },
            aiAssistant: { count: Number, lastUsed: Date }
        },
        apiUsage: {
            last30Days: { calls: Number, data: Number },
            total: { calls: Number, data: Number }
        },
        notifications: {
            unread: { type: Number, default: 0 },
            preferences: {
                email: { type: Boolean, default: true },
                push: { type: Boolean, default: true },
                inApp: { type: Boolean, default: true }
            }
        }
    },

    // ========== SECURITY & COMPLIANCE ==========
    security: {
        ipWhitelist: [String],
        devices: [{
            name: String,
            type: String,
            os: String,
            lastUsed: Date,
            location: String,
            trusted: Boolean
        }],
        dataProcessingConsent: {
            gdpr: { type: Boolean, default: false },
            ccpa: { type: Boolean, default: false }
        },
        auditLog: [{
            action: String,
            timestamp: Date,
            ip: String,
            userAgent: String,
            metadata: mongoose.Schema.Types.Mixed
        }]
    },

    // ========== SYSTEM FIELDS ==========
    metadata: {
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        deletedAt: Date,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ========== AUTH TOKENS ==========
    tokens: [{
        token: { type: String, required: true },
        device: String,
        ip: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Password hashing middleware
MarketingUserSchema.pre("save", async function (next) {
    if (this.isModified("auth.password")) {
        this.auth.password = await bcrypt.hash(this.auth.password, 12);
    }
    next();
});

// Token generation method
MarketingUserSchema.methods.generateAuthToken = async function (device = "unknown", ip = "") {
    const token = jwt.sign(
        { _id: this._id, role: this.marketingProfile.role },
        process.env.SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );

    this.tokens.push({ token, device, ip });
    await this.save();
    return token;
};

// Update last activity
MarketingUserSchema.methods.updateActivity = async function (feature) {
    this.activity.lastLogin = Date.now();

    if (feature && this.activity.featureUsage[feature]) {
        this.activity.featureUsage[feature].count += 1;
        this.activity.featureUsage[feature].lastUsed = Date.now();
    }

    await this.save();
};

const MarketingUser = mongoose.model("Marketing_User", MarketingUserSchema);
module.exports = MarketingUser;