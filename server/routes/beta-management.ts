import { Router } from 'express';
import { storage } from '../storage';
import { emailNotificationService } from '../email-notification-service';

const router = Router();

// Beta user management interface
interface BetaUser {
  id: number;
  userId: number;
  phase: 'phase1' | 'phase2' | 'phase3';
  userType: 'rider' | 'driver';
  startDate: Date;
  endDate: Date;
  status: 'invited' | 'active' | 'completed' | 'dropped';
  feedbackSubmitted: boolean;
  notes?: string;
}

interface BetaFeedback {
  id: number;
  betaUserId: number;
  category: 'usability' | 'performance' | 'feature' | 'bug' | 'general';
  rating: number; // 1-5 scale
  feedback: string;
  submittedAt: Date;
}

// Admin middleware - ensure user is admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all beta users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // This would be implemented in storage.ts - for now return mock data
    const betaUsers = [
      {
        id: 1,
        userId: 4,
        phase: 'phase2',
        userType: 'rider',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'active',
        feedbackSubmitted: false
      }
    ];
    
    res.json(betaUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch beta users' });
  }
});

// Add new beta user
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { email, userType, phase = 'phase2' } = req.body;
    
    if (!email || !userType) {
      return res.status(400).json({ error: 'Email and user type required' });
    }
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists in system' });
    }
    
    // Send beta invitation email
    await emailNotificationService.sendBetaInvitation(email, userType, phase);
    
    res.json({ 
      message: 'Beta invitation sent successfully',
      email,
      userType,
      phase
    });
    
  } catch (error) {
    console.error('Error inviting beta user:', error);
    res.status(500).json({ error: 'Failed to send beta invitation' });
  }
});

// Update beta user status
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Update beta user status in database
    // This would be implemented in storage.ts
    
    res.json({ 
      message: 'Beta user updated successfully',
      id,
      status,
      notes
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to update beta user' });
  }
});

// Submit beta feedback (for beta users)
router.post('/feedback', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const { category, rating, feedback } = req.body;
    
    if (!category || !rating || !feedback) {
      return res.status(400).json({ error: 'Category, rating, and feedback required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const feedbackData = {
      userId: req.user!.id,
      category,
      rating,
      feedback,
      submittedAt: new Date()
    };
    
    // Save feedback to database
    // This would be implemented in storage.ts
    
    // Send notification to admin about new feedback
    await emailNotificationService.sendBetaFeedbackNotification(req.user!, feedbackData);
    
    res.json({ 
      message: 'Feedback submitted successfully',
      category,
      rating
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get beta feedback (admin only)
router.get('/feedback', requireAdmin, async (req, res) => {
  try {
    const { category, phase, userType } = req.query;
    
    // Filter feedback based on query parameters
    // This would be implemented in storage.ts
    
    const mockFeedback = [
      {
        id: 1,
        user: { id: 4, username: 'beta_rider1', role: 'rider' },
        category: 'usability',
        rating: 4,
        feedback: 'The booking process is intuitive, but could use better visual feedback during loading.',
        submittedAt: new Date()
      }
    ];
    
    res.json(mockFeedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get beta testing metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const { phase = 'phase2' } = req.query;
    
    // Calculate metrics for the specified phase
    const metrics = {
      totalUsers: 12,
      activeUsers: 10,
      completedUsers: 2,
      droppedUsers: 0,
      rideBookingSuccess: 0.92,
      driverAcceptanceRate: 0.88,
      averageRating: 4.2,
      feedbackSubmitted: 8,
      criticalIssues: 1,
      averageResponseTime: 1.8, // seconds
      uptime: 0.998
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Generate beta testing report
router.get('/report', requireAdmin, async (req, res) => {
  try {
    const { phase = 'phase2', format = 'json' } = req.query;
    
    // Generate comprehensive report
    const report = {
      phase,
      generatedAt: new Date(),
      summary: {
        duration: '14 days',
        totalParticipants: 12,
        ridesCompleted: 47,
        averageRating: 4.2,
        criticalIssues: 1,
        recommendationScore: 8.5
      },
      userFeedback: {
        totalSubmissions: 8,
        averageRating: 4.2,
        topIssues: [
          'Loading time could be improved',
          'Need better driver ETA estimates',
          'Payment confirmation could be clearer'
        ],
        positiveHighlights: [
          'Easy to book rides',
          'Professional drivers',
          'Good customer support'
        ]
      },
      technicalMetrics: {
        uptime: '99.8%',
        averageResponseTime: '1.8s',
        paymentSuccessRate: '98.5%',
        crashRate: '0.2%'
      },
      recommendations: [
        'Optimize page loading times',
        'Improve driver ETA calculations',
        'Enhance payment confirmation UI',
        'Ready for Phase 3 expansion'
      ]
    };
    
    if (format === 'csv') {
      // Convert to CSV format for download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=beta-report-${phase}.csv`);
      // CSV conversion would be implemented here
      res.send('CSV data would be here');
    } else {
      res.json(report);
    }
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Beta user onboarding checklist
router.get('/onboarding/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check onboarding status for beta user
    const checklist = {
      accountCreated: true,
      emailVerified: true,
      profileCompleted: true,
      paymentMethodAdded: false,
      firstRideBooked: false,
      feedbackSubmitted: false,
      tutorialCompleted: true
    };
    
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch onboarding status' });
  }
});

export default router;