import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated } from '../../middleware/auth';
import { notificationService, NotificationType, FriendlyCharacter } from '../../notifications';

const router = Router();

// Get notifications for authenticated user
router.get('/notifications', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('📢 Fetching notifications for user:', user.id);
    
    try {
      console.log('📢 About to call getNotificationsForUser for user:', user.id);
      
      // Import db directly to ensure we have the right connection
      const { db } = await import('../../db');
      const { notifications: notificationsTable } = await import('../../../shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      console.log('📢 Querying database directly...');
      const directNotifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, user.id))
        .orderBy(desc(notificationsTable.createdAt));
      
      console.log(`📢 Direct DB query found ${directNotifications.length} notifications for user ${user.id}`);
      
      if (directNotifications.length > 0) {
        console.log('📢 First notification:', JSON.stringify(directNotifications[0], null, 2));
      }
      
      res.json(directNotifications);
    } catch (dbError) {
      console.error('📢 Database query failed:', dbError);
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { id } = req.params;
    await notificationService.markAsRead(parseInt(id));
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Test notification endpoint
router.post('/test-notification', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { type, message, friendlyCharacter, title } = req.body;
    
    // Validate required fields
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required' });
    }

    // Validate type
    const validTypes = Object.values(NotificationType);
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid notification type',
        validTypes: validTypes 
      });
    }

    // Validate friendlyCharacter if provided
    if (friendlyCharacter) {
      const validCharacters = Object.values(FriendlyCharacter);
      if (!validCharacters.includes(friendlyCharacter)) {
        return res.status(400).json({ 
          error: 'Invalid friendly character',
          validCharacters: validCharacters 
        });
      }
    }

    // Create test notification
    const notification = await notificationService.createNotification({
      userId: req.user.id,
      type: type as NotificationType,
      title: title || 'Test Notification',
      message: message,
      friendlyCharacter: friendlyCharacter as FriendlyCharacter || FriendlyCharacter.HELPFUL,
      data: { test: true, timestamp: new Date().toISOString() }
    });

    res.json({
      success: true,
      message: 'Test notification created successfully',
      notification: notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

export default router;