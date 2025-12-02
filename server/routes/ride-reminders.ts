import { Router } from 'express';
import { rideReminderService } from '../ride-reminder-service';

const router = Router();

/**
 * Admin endpoint to get reminder statistics
 */
router.get('/stats', (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = rideReminderService.getReminderStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    res.status(500).json({ message: 'Failed to get reminder statistics' });
  }
});

/**
 * Admin endpoint to manually trigger reminder processing (for testing)
 */
router.post('/trigger', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await rideReminderService.triggerTestReminders();
    const stats = rideReminderService.getReminderStats();
    
    res.json({ 
      message: 'Reminder processing triggered successfully',
      stats
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({ message: 'Failed to trigger reminder processing' });
  }
});

export default router;