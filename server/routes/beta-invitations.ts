import express from 'express';
import { betaInvitationService } from '../beta-invitation-service';
import { isAuthenticated, hasRole } from '../middleware/auth';

const router = express.Router();

/**
 * Send single beta invitation
 */
router.post('/send-invitation', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { email, phone, fullName, inviteMethod, role, notes } = req.body;

    // Validate required fields
    if (!fullName || !inviteMethod || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: fullName, inviteMethod, role' 
      });
    }

    if (inviteMethod === 'email' && !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required when using email invite method' 
      });
    }

    if (inviteMethod === 'sms' && !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone is required when using SMS invite method' 
      });
    }

    if (inviteMethod === 'both' && (!email || !phone)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both email and phone are required when using both invite methods' 
      });
    }

    const result = await betaInvitationService.sendBetaInvitation({
      email,
      phone,
      fullName,
      inviteMethod,
      role,
      notes
    });

    res.json(result);
  } catch (error) {
    console.error('Error sending beta invitation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send invitation' 
    });
  }
});

/**
 * Send batch beta invitations
 */
router.post('/send-batch-invitations', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { invitations } = req.body;

    if (!Array.isArray(invitations) || invitations.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitations array is required and must not be empty' 
      });
    }

    // Validate each invitation
    for (let i = 0; i < invitations.length; i++) {
      const invite = invitations[i];
      if (!invite.fullName || !invite.inviteMethod || !invite.role) {
        return res.status(400).json({ 
          success: false, 
          error: `Invitation ${i + 1}: Missing required fields: fullName, inviteMethod, role` 
        });
      }
    }

    const result = await betaInvitationService.sendBatchInvitations(invitations);

    res.json(result);
  } catch (error) {
    console.error('Error sending batch invitations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send batch invitations' 
    });
  }
});

/**
 * Validate beta invitation code
 */
router.post('/validate-code', async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invite code is required' 
      });
    }

    const result = await betaInvitationService.acceptInvitation(inviteCode);

    res.json(result);
  } catch (error) {
    console.error('Error validating invite code:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate invite code' 
    });
  }
});

/**
 * Test email configuration
 */
router.post('/test-email', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Test email address is required' 
      });
    }

    // Send a test invitation to verify email configuration
    const result = await betaInvitationService.sendBetaInvitation({
      email: testEmail,
      fullName: 'Test User',
      inviteMethod: 'email',
      role: 'rider',
      notes: 'Test invitation to verify email configuration'
    });

    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      details: result.emailResult
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email' 
    });
  }
});

/**
 * Resend beta invitation
 */
router.post('/resend-invitation', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { email, phone, fullName, inviteMethod, role, notes } = req.body;

    // Validate required fields
    if (!fullName || !inviteMethod || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: fullName, inviteMethod, role' 
      });
    }

    if (inviteMethod === 'email' && !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required when using email invite method' 
      });
    }

    if (inviteMethod === 'sms' && !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone is required when using SMS invite method' 
      });
    }

    if (inviteMethod === 'both' && (!email || !phone)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both email and phone are required when using both invite methods' 
      });
    }

    // Send new invitation (essentially the same as sending a new invitation)
    const result = await betaInvitationService.sendBetaInvitation({
      email,
      phone,
      fullName,
      inviteMethod,
      role,
      notes: (notes || '') + ' (Resent invitation)'
    });

    res.json({
      ...result,
      message: result.success ? 'Invitation resent successfully' : 'Failed to resend invitation'
    });
  } catch (error) {
    console.error('Error resending beta invitation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend invitation' 
    });
  }
});

/**
 * Test SMS configuration
 */
router.post('/test-sms', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { testPhone } = req.body;

    if (!testPhone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Test phone number is required' 
      });
    }

    // Send a test invitation to verify SMS configuration
    const result = await betaInvitationService.sendBetaInvitation({
      phone: testPhone,
      fullName: 'Test User',
      inviteMethod: 'sms',
      role: 'rider',
      notes: 'Test invitation to verify SMS configuration'
    });

    res.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
      details: result.smsResult
    });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test SMS' 
    });
  }
});

export default router;