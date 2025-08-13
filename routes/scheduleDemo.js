const express = require('express');
const ScheduleDemo = require('../models/ScheduleDemo');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter setup (configure with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
});

// ========== VALIDATION MIDDLEWARE ==========
const validateScheduleDemo = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('preferredDate').isISO8601().withMessage('Valid date is required'),
  body('preferredTime').notEmpty().withMessage('Preferred time is required'),
  body('demoType').isIn([
    'platform-overview', 'ai-content-creation', 'campaign-automation',
    'analytics-dashboard', 'integrations', 'custom'
  ]).withMessage('Valid demo type is required')
];

// ========== CREATE SCHEDULE DEMO REQUEST ==========
router.post('/api/schedule-demo', validateScheduleDemo, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      // Personal Info
      firstName,
      lastName,
      jobTitle,
      timezone,
      email,
      phone,
      communicationPreference,
      
      // Company Info
      companyName,
      website,
      industry,
      companySize,
      marketingTeamSize,
      
      // Demo Details
      preferredDate,
      preferredTime,
      duration,
      demoType,
      customTopics,
      specialRequirements,
      
      // Marketing Context
      currentChallenges,
      currentTools,
      monthlyAdBudget,
      desiredFeatures
    } = req.body;

    // Create new demo request
    const demoRequest = new ScheduleDemo({
      requester: {
        personalInfo: {
          firstName,
          lastName,
          jobTitle,
          timezone,
          preferredLanguage: 'en'
        },
        contactInfo: {
          email,
          phone,
          communicationPreference: communicationPreference || 'email'
        }
      },
      company: {
        name: companyName,
        website,
        industry,
        size: companySize,
        marketingTeamSize
      },
      demoDetails: {
        preferredDate: new Date(preferredDate),
        preferredTime,
        duration: duration || '30-min',
        demoType,
        customTopics: customTopics ? [customTopics] : [],
        specialRequirements
      },
      marketingContext: {
        currentChallenges: currentChallenges || [],
        currentTools: currentTools ? [currentTools] : [],
        monthlyAdBudget,
        desiredFeatures: desiredFeatures || []
      },
      status: {
        current: 'scheduled',
        confirmationSent: false,
        reminderSent: false,
        followUpRequired: false
      },
      metadata: {
        source: 'website',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await demoRequest.save();

    // Send confirmation email
    await sendConfirmationEmail(demoRequest);

    res.status(201).json({
      success: true,
      message: 'Demo scheduled successfully',
      data: {
        id: demoRequest._id,
        scheduledDate: demoRequest.demoDetails.preferredDate,
        demoType: demoRequest.demoDetails.demoType,
        duration: demoRequest.demoDetails.duration
      }
    });

  } catch (error) {
    console.error('Error scheduling demo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule demo',
      error: error.message
    });
  }
});

// ========== GET ALL DEMO REQUESTS ==========
router.get('/api/schedule-demo', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      industry, 
      demoType,
      dateFrom,
      dateTo 
    } = req.query;

    const filter = {};
    
    if (status) filter['status.current'] = status;
    if (industry) filter['company.industry'] = industry;
    if (demoType) filter['demoDetails.demoType'] = demoType;
    
    if (dateFrom || dateTo) {
      filter['demoDetails.preferredDate'] = {};
      if (dateFrom) filter['demoDetails.preferredDate'].$gte = new Date(dateFrom);
      if (dateTo) filter['demoDetails.preferredDate'].$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const demoRequests = await ScheduleDemo.find(filter)
      .sort({ 'demoDetails.preferredDate': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('status.assignedTo', 'name email');

    const total = await ScheduleDemo.countDocuments(filter);

    res.json({
      success: true,
      data: demoRequests,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        count: demoRequests.length,
        total
      }
    });

  } catch (error) {
    console.error('Error fetching demo requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demo requests',
      error: error.message
    });
  }
});

// ========== GET SINGLE DEMO REQUEST ==========
router.get('/api/schedule-demo/:id', async (req, res) => {
  try {
    const demoRequest = await ScheduleDemo.findById(req.params.id)
      .populate('status.assignedTo', 'name email')
      .populate('followUp.notes.author', 'name');

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    res.json({
      success: true,
      data: demoRequest
    });

  } catch (error) {
    console.error('Error fetching demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demo request',
      error: error.message
    });
  }
});

// ========== UPDATE DEMO STATUS ==========
router.patch('/api/schedule-demo/:id/status', async (req, res) => {
  try {
    const { status, assignedTo, calendarEventId, videoConferenceLink, notes } = req.body;

    const validStatuses = ['scheduled', 'confirmed', 'rescheduled', 'completed', 'canceled', 'no-show'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = {};
    if (status) updateData['status.current'] = status;
    if (assignedTo) updateData['status.assignedTo'] = assignedTo;
    if (calendarEventId) updateData['status.calendarEventId'] = calendarEventId;
    if (videoConferenceLink) updateData['status.videoConferenceLink'] = videoConferenceLink;

    const demoRequest = await ScheduleDemo.findByIdAndUpdate(
      req.params.id,
      { 
        ...updateData,
        'metadata.updatedAt': new Date()
      },
      { new: true }
    );

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    // Add notes if provided
    if (notes) {
      demoRequest.followUp.notes.push({
        content: notes,
        author: req.user?.id, // Assuming user is authenticated
        createdAt: new Date()
      });
      await demoRequest.save();
    }

    res.json({
      success: true,
      message: 'Demo status updated successfully',
      data: demoRequest
    });

  } catch (error) {
    console.error('Error updating demo status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update demo status',
      error: error.message
    });
  }
});

// ========== RESCHEDULE DEMO ==========
router.patch('/api/schedule-demo/:id/reschedule', async (req, res) => {
  try {
    const { preferredDate, preferredTime, reason } = req.body;

    if (!preferredDate || !preferredTime) {
      return res.status(400).json({
        success: false,
        message: 'New date and time are required'
      });
    }

    const demoRequest = await ScheduleDemo.findByIdAndUpdate(
      req.params.id,
      {
        'demoDetails.preferredDate': new Date(preferredDate),
        'demoDetails.preferredTime': preferredTime,
        'status.current': 'rescheduled',
        'metadata.updatedAt': new Date()
      },
      { new: true }
    );

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    // Add reschedule note
    if (reason) {
      demoRequest.followUp.notes.push({
        content: `Demo rescheduled: ${reason}`,
        author: req.user?.id,
        createdAt: new Date()
      });
      await demoRequest.save();
    }

    // Send reschedule notification email
    await sendRescheduleEmail(demoRequest);

    res.json({
      success: true,
      message: 'Demo rescheduled successfully',
      data: demoRequest
    });

  } catch (error) {
    console.error('Error rescheduling demo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule demo',
      error: error.message
    });
  }
});

// ========== ADD FOLLOW-UP NOTES ==========
router.post('/api/schedule-demo/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const demoRequest = await ScheduleDemo.findById(req.params.id);
    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    demoRequest.followUp.notes.push({
      content,
      author: req.user?.id,
      createdAt: new Date()
    });

    await demoRequest.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: demoRequest.followUp.notes
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
});

// ========== DELETE DEMO REQUEST ==========
router.delete('/api/api/schedule-demo/:id', async (req, res) => {
  try {
    const demoRequest = await ScheduleDemo.findByIdAndDelete(req.params.id);

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    res.json({
      success: true,
      message: 'Demo request deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete demo request',
      error: error.message
    });
  }
});

// ========== EMAIL FUNCTIONS ==========
async function sendConfirmationEmail(demoRequest) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: demoRequest.requester.contactInfo.email,
      subject: 'Demo Scheduled - Marketing AI Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Demo Scheduled Successfully!</h2>
          
          <p>Hi ${demoRequest.requester.personalInfo.firstName},</p>
          
          <p>Thank you for scheduling a demo with our Marketing AI Platform. Here are the details:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Demo Details</h3>
            <p><strong>Date:</strong> ${demoRequest.demoDetails.preferredDate.toDateString()}</p>
            <p><strong>Time:</strong> ${demoRequest.demoDetails.preferredTime}</p>
            <p><strong>Duration:</strong> ${demoRequest.demoDetails.duration}</p>
            <p><strong>Demo Type:</strong> ${demoRequest.demoDetails.demoType.replace('-', ' ')}</p>
          </div>
          
          <p>Our team will reach out to you shortly to confirm the meeting details and provide the calendar invite.</p>
          
          <p>Best regards,<br>Marketing AI Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

async function sendRescheduleEmail(demoRequest) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: demoRequest.requester.contactInfo.email,
      subject: 'Demo Rescheduled - Marketing AI Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Demo Rescheduled</h2>
          
          <p>Hi ${demoRequest.requester.personalInfo.firstName},</p>
          
          <p>Your demo has been rescheduled to the following time:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>New Demo Details</h3>
            <p><strong>Date:</strong> ${demoRequest.demoDetails.preferredDate.toDateString()}</p>
            <p><strong>Time:</strong> ${demoRequest.demoDetails.preferredTime}</p>
            <p><strong>Duration:</strong> ${demoRequest.demoDetails.duration}</p>
          </div>
          
          <p>You will receive an updated calendar invite shortly.</p>
          
          <p>Best regards,<br>Marketing AI Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Reschedule email sent successfully');
  } catch (error) {
    console.error('Error sending reschedule email:', error);
  }
}

module.exports = router;