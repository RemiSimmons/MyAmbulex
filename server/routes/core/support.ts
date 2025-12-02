import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated } from '../../middleware/auth';
import { emailNotificationService } from '../../email-notification-service';

const router = Router();

// Create support ticket
router.post('/api/support/ticket', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { subject, message, category } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Create support ticket
    const ticket = await storage.createSupportTicket({
      userId: req.user.id,
      subject,
      message,
      category: category || 'general',
      status: 'open',
      priority: 'normal',
      createdAt: new Date()
    });

    // Send email notification to admin
    try {
      await emailNotificationService.sendSupportTicketNotification({
        ticketId: ticket.id,
        subject,
        message,
        userEmail: req.user.email,
        userName: req.user.fullName || req.user.username,
        category: category || 'general'
      });
    } catch (emailError) {
      console.error('Error sending support ticket email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket.id,
        subject,
        category: category || 'general',
        status: 'open',
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

export default router;