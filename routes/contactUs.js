// routes/aboutus.js - About Us and Contact Routes
const express = require('express');
const router = express.Router();
const authenticate = require("../authenticate/customerAuthenticate");
const MarketingUser = require('../models/User');
const nodemailer = require("nodemailer");
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const dotenv = require("dotenv");
dotenv.config({ path: "../" });

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

// Models would need to be defined similar to your existing User model

const ContactInfo = require('../models/ContactUs/ContactInfo');
const ContactMessage = require('../models/ContactUs/ContactMessage');

// Rate limiting for contact form
const contactRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 requests per windowMs
    message: {
        success: false,
        message: 'Too many contact form submissions. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Validation middleware for contact form
const validateContactForm = [
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 5, max: 2000 })
        .withMessage('Message must be between 5 and 2000 characters'),

    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name must be less than 100 characters'),

    body('phone')
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),

    body('serviceType')
        .optional()
        .isIn(['general', 'ai-strategy', 'automation', 'analytics', 'personalization', 'chatbots', 'content', 'other']),

    body('budget')
        .optional()
        .isIn(['under-10k', '10k-25k', '25k-50k', '50k-100k', '100k-plus', 'undecided']),

    body('timeline')
        .optional()
        .isIn(['asap', '1-2-weeks', '1-month', '3-months', 'flexible'])
        .withMessage('Invalid timeline')
];

// @route   GET /api/contact/info
// @desc    Get contact information
// @access  Public
router.get('/api/contact/info', async (req, res) => {
    try {
        const contactInfo = await ContactInfo.findOne({ isActive: true });

        if (!contactInfo) {
            return res.status(404).json({
                success: false,
                message: 'Contact information not found'
            });
        }

        res.status(200).json({
            success: true,
            data: contactInfo
        });
    } catch (error) {
        console.error('Error fetching contact info:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @route   POST /api/contact/submit
// @desc    Submit contact form
// @access  Public
router.post('/api/contact/submit', contactRateLimit, validateContactForm, async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array()); // Add this line
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            fullName,
            email,
            company,
            phone,
            subject,
            message,
            serviceType,
            budget,
            timeline
        } = req.body;

        // Create contact message
        const contactMessage = new ContactMessage({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            company: company?.trim() || null,
            phone: phone?.trim() || null,
            subject: subject?.trim() || null,
            message: message.trim(),
            serviceType: serviceType || 'general',
            budget: budget || null,
            timeline: timeline || null,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            source: 'website',
            status: 'new',
            priority: 'medium'
        });

        // Set priority based on service type and budget
        if (serviceType === 'ai-strategy' || budget === '100k-plus') {
            contactMessage.priority = 'high';
        } else if (timeline === 'asap') {
            contactMessage.priority = 'urgent';
        }

        await contactMessage.save();

        console.log("Enquiry Saved Successfully.")

        // Send notification email
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
                    to: email,
                    subject: Subject,
                    text: Text,
                });
                console.log("Email sent successfully");
            } catch (e) {
                console.log("Error during sending email: ", e);
            }
        };



        // Send auto-reply to user
        await Transport(
            email,
            'Thank you for contacting Marketing AI',
            `Dear ${fullName},\n\nThank you for your message. We have received your inquiry and will get back to you within 24 hours.\n\nBest regards,\nThe Marketing AI Team`
        );

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you within 24 hours.',
            data: {
                id: contactMessage._id,
                submittedAt: contactMessage.createdAt
            }
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit your message. Please try again.'
        });
    }
});

// @route   GET /api/contact/messages
// @desc    Get all contact messages (Admin only)
// @access  Private (Admin)
router.get('/api/contact/messages', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.rootUser.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const {
            page = 1,
            limit = 10,
            status,
            priority,
            serviceType,
            search
        } = req.query;

        const skip = (page - 1) * limit;
        const query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (serviceType) query.serviceType = serviceType;

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const messages = await ContactMessage.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-userAgent -ipAddress');

        const total = await ContactMessage.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                messages,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: messages.length,
                    totalRecords: total
                }
            }
        });

    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// @route   PUT /api/contact/messages/:id
// @desc    Update message status (Admin only)
// @access  Private (Admin)
router.put('/api/contact/messages/:id', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.rootUser.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;
        const { status, priority } = req.body;

        const message = await ContactMessage.findById(id);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;

        // Set readAt timestamp when status changes to 'read'
        if (status === 'read' && message.status === 'new') {
            updateData.readAt = new Date();
        }

        // Set repliedAt timestamp when status changes to 'replied'
        if (status === 'replied' && message.status !== 'replied') {
            updateData.repliedAt = new Date();
        }

        await ContactMessage.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({
            success: true,
            message: 'Message updated successfully',
            data: message
        });

    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;