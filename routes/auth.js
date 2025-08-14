// routes/auth.js - Authentication Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const MarketingUser = require('../models/User');
const crypto = require('crypto');
const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config({ path: "../" });

const authenticate = require("../authenticate/customerAuthenticate");

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;


// Rate limiting for registration
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 registration attempts per windowMs
    message: {
        error: 'Too many registration attempts from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validation middleware for registration
const validateRegistration = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),

    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('phone')
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    body('companyName')
        .trim()
        .notEmpty()
        .withMessage('Company name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2 and 100 characters'),

    body('website')
        .optional()
        .isURL()
        .withMessage('Please provide a valid website URL'),

    body('industry')
        .notEmpty()
        .withMessage('Industry is required')
        .isIn(['ecommerce', 'saas', 'agency', 'education', 'finance', 'healthcare', 'entertainment', 'real-estate', 'manufacturing', 'retail', 'other'])
        .withMessage('Please select a valid industry'),

    body('businessType')
        .notEmpty()
        .withMessage('Business type is required')
        .isIn(['b2b', 'b2c', 'both'])
        .withMessage('Please select a valid business type'),

    body('companySize')
        .optional()
        .isIn(['solopreneur', '2-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
        .withMessage('Please select a valid company size'),

    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['owner', 'cmio', 'marketing-director', 'social-media-manager', 'content-creator', 'seo-specialist', 'ppc-expert', 'growth-hacker', 'freelancer', 'student', 'other'])
        .withMessage('Please select a valid role'),

    body('experienceLevel')
        .notEmpty()
        .withMessage('Experience level is required')
        .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
        .withMessage('Please select a valid experience level'),

    body('monthlyAdBudget')
        .optional()
        .isIn(['none', '<1k', '1k-5k', '5k-20k', '20k-100k', '100k+'])
        .withMessage('Please select a valid budget range'),

    body('marketingGoals')
        .optional()
        .isArray()
        .withMessage('Marketing goals must be an array'),

    body('marketingGoals.*')
        .optional()
        .isIn(['brand-awareness', 'lead-generation', 'sales-conversion', 'customer-retention', 'community-building', 'traffic-growth', 'product-launch', 'reputation-management'])
        .withMessage('Invalid marketing goal selected'),

    body('challenges')
        .optional()
        .isArray()
        .withMessage('Challenges must be an array'),

    body('challenges.*')
        .optional()
        .isIn(['budget-constraints', 'measuring-roi', 'team-bandwidth', 'platform-changes', 'audience-targeting', 'content-creation', 'ad-fatigue', 'competition', 'tech-integration'])
        .withMessage('Invalid challenge selected'),
];

// @route   POST /api/auth/register
// @desc    Register a new marketing user
// @access  Public
router.post('/api/auth/register', registerLimiter, validateRegistration, async (req, res) => {
    try {
        const Email = req.body.email;
        const Password = req.body.password;
        // console.log(req.body)


        const OTP = Math.floor(Math.random() * 1000000 + 1);
        const Transport = async (email, Subject, Text) => {
            try {
                const transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    service: "gmail",
                    port: 587,
                    secure: Boolean(true),
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD,
                    },
                });
                await transporter.sendMail({
                    from: process.env.EMAIL,
                    to: Email,
                    subject: Subject,
                    text: Text,
                });
                console.log("Email sent successfully");
            } catch (e) {
                console.log("Error during sending email: ", e);
            }
        };


        await Transport(
            "coolsam929@gmail.com",
            "Please use this OTP to verify your Marketing AI account",
            ` Your OTP is : ${OTP}`
        );

        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            timezone,
            companyName,
            website,
            industry,
            businessType,
            companySize,
            role,
            experienceLevel,
            monthlyAdBudget,
            marketingGoals = [],
            challenges = []
        } = req.body;

        // Check if user already exists
        const existingUser = await MarketingUser.findOne({ 'auth.email': email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create new user
        const newUser = new MarketingUser({
            personalInfo: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                displayName: `${firstName.trim()} ${lastName.trim()}`,
                timezone: timezone || 'UTC',
                preferredLanguage: 'en'
            },
            auth: {
                email: email.toLowerCase(),
                phone: phone || '',
                password, // Will be hashed by pre-save middleware
                emailVerified: false,
                // phoneVerified: false,
                // twoFactorEnabled: false,
                failedLoginAttempts: 0
            },
            business: {
                companyName: companyName.trim(),
                website: website || '',
                industry,
                businessType,
                companySize: companySize || 'solopreneur'
            },
            marketingProfile: {
                role,
                experienceLevel,
                monthlyAdBudget: monthlyAdBudget || 'none',
                marketingGoals,
                challenges
            },
            billing: {
                plan: 'free',
                billingCycle: 'monthly',
                credits: {
                    available: 100, // Free tier credits
                    used: 0
                }
            },
            activity: {
                featureUsage: {
                    contentGenerator: { count: 0 },
                    analyticsDashboard: { count: 0 },
                    campaignManager: { count: 0 },
                    aiAssistant: { count: 0 }
                },
                apiUsage: {
                    last30Days: { calls: 0, data: 0 },
                    total: { calls: 0, data: 0 }
                },
                notifications: {
                    unread: 0
                }
            },
            otp: OTP,
            security: {
                dataProcessingConsent: {
                    gdpr: false,
                    ccpa: false
                }
            }
        });

        // Save the user to database
        await newUser.save();

        return res.status(200).json({
            success: true,
            message: 'Registration Successful.',

        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.',
            error: error.message
        });
    }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.post("/api/auth/userEmailVerification", async (req, res) => {
    try {
        const Email = req.body.email;
        const PhoneNo = req.body.phoneNo;
        const OTP = req.body.otp;
        console.log("User email is :", Email);
        console.log("User phone is :", PhoneNo);
        console.log("User otp is :", OTP);

        const UserDB = await MarketingUser.findOne({
            'auth.email': { $regex: new RegExp(`^${Email}$`, 'i') },
            'auth.phone': PhoneNo, // Uncomment if phone verification is needed
        });


        if (!UserDB) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }
        console.log("User database is :", UserDB);
        console.log("Otp database is :", UserDB.otp);
        if (UserDB.otp == OTP) {
            await UserDB.updateOne({
                'auth.emailVerified': true,
            });
            await UserDB.save();
            await UserDB.updateOne({
                otp: null,
            });
            await UserDB.save();

            console.log("Email Verified Successfully.");

            return res.status(200).json({
                success: true,
                message: 'Email verification successful! You can now log in to your account.'
            });
        }
    } catch (err) {
        console.log("Error during Email Verification : ", err);
    }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post('/api/auth/resendOTP', async (req, res) => {
    try {
        const Email = req.body.email;
        const PhoneNo = req.body.phoneNo;

        const UserDB = await MarketingUser.findOne({
            'auth.email': { $regex: new RegExp(`^${Email}$`, 'i') },
            'auth.phone': PhoneNo, // Uncomment if phone verification is needed
        });


        if (!UserDB) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }
        if (UserDB) {

            const OTP = Math.floor(Math.random() * 1000000 + 1);
            const Transport = async (email, Subject, Text) => {
                try {
                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        service: "gmail",
                        port: 587,
                        secure: Boolean(true),
                        auth: {
                            user: process.env.EMAIL,
                            pass: process.env.PASSWORD,
                        },
                    });
                    await transporter.sendMail({
                        from: process.env.EMAIL,
                        to: Email,
                        subject: Subject,
                        text: Text,
                    });
                    console.log("Email sent successfully");
                } catch (e) {
                    console.log("Error during sending email: ", e);
                }
            };


            await Transport(
                "coolsam929@gmail.com",
                "Please use this OTP to verify your Marketing AI account",
                ` Your OTP is : ${OTP}`
            );

            await MarketingUser.updateOne(
                { _id: UserDB._id },  // Find the user by ID
                { $set: { otp: OTP } }  // Update the OTP field
            );

            await UserDB.save();


        }


        return res.status(200).json({
            success: true,
            message: 'Verification email resent successfully. Please check your inbox.'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to resend verification email. Please try again.',
            error: error.message
        });
    }
});

router.post("/api/auth/login", async (req, res, next) => {
    try {
        let token;
        const Email = req.body.userEmail;
        const Password = req.body.userPassword;


        const data1 = await MarketingUser.findOne({
            'auth.email': Email,
        });

        if (data1) {
            const isMatch = await bcrypt.compare(Password, data1.auth.password);
            console.log(isMatch)

            if (isMatch == true) {
                const token = await data1.generateAuthToken();

                res.cookie("cookies1", token, {
                    expires: new Date(Date.now() + 2592000000),
                    httpOnly: true,
                });
                if (data1.userType === "admin") {
                    res.redirect("/admin-dashboard");
                } else {
                    res.redirect("/property-list");
                }
            } else if (isMatch == false) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to resend verification email. Please try again.',

                });
            } else {
                res.send("Sorry!");
            }
        }
    } catch (err) {
        console.log("Error during Login: ", err);
    }
});

router.get("/api/logout", authenticate, async (req, res) => {
    try {
        const modelName = req.rootUser.constructor.modelName;


        let model;

        switch (modelName) {
            case "Marketing_User":
                model = MarketingUser;

                break;

            default:
                throw new Error(`Unknown model name: ${modelName}`);
        }

        await model.updateOne({ _id: req.id }, { $set: { status: "offline" } });
        res.clearCookie("cookies1", { path: "/" });
        console.log("cookies-deleted");
        res.redirect("/Login");
    } catch (err) {
        console.log(`Error During Logout - ${err}`);
    }
});

router.get("/api/auth/userProfile", authenticate, async (req, res) => {
    try {
        res.send(req.rootUser);
    } catch (err) {
        console.log(`Error during Employeee Profile Page -${err}`);
    }
});

// @route   PUT /api/auth/userProfile
// @desc    Update user profile
// @access  Private
router.put("/api/auth/userProfile", authenticate, async (req, res) => {
    try {
        // Debug logging
        console.log('Headers:', req.headers);
        console.log('Body received:', JSON.stringify(req.body, null, 2));
        console.log('User ID from auth:', req.rootUser?._id);
        
        // Check if body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data provided for update'
            });
        }

        const updates = req.body;
        const userId = req.rootUser._id;

        // Validate that we have a valid user ID
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        console.log('Processing updates for user:', userId);
        console.log('Updates to apply:', updates);

        // Find the user first to check if they exist
        const existingUser = await MarketingUser.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update the user with the new data
        const updatedUser = await MarketingUser.findByIdAndUpdate(
            userId,
            { $set: updates },
            { 
                new: true, 
                runValidators: true,
                // This option returns the updated document
                returnDocument: 'after'
            }
        );

        console.log('Update successful for user:', userId);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (err) {
        console.error('Profile update error:', err);
        
        // Handle different types of errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(err.errors).map(e => e.message)
            });
        }

        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: err.message
        });
    }
});









module.exports = router;