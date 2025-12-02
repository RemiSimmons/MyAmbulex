import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated, hasRole, AuthenticatedRequest } from '../../middleware/auth';
import { z } from 'zod';
import type { ChatMessage, InsertChatConversation, InsertChatParticipant, InsertChatMessage } from '@shared/schema';

const router = Router();

// Create a new conversation
router.post('/api/chat/conversations', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rideId } = req.body;
    
    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' });
    }

    // Check if conversation already exists for this ride
    const existingConversation = await storage.getChatConversationByRide(rideId);
    if (existingConversation) {
      return res.json({ 
        success: true, 
        conversation: existingConversation,
        message: 'Conversation already exists' 
      });
    }

    // Get ride details to find rider and driver
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (!ride.driverId) {
      return res.status(400).json({ error: 'Ride does not have an assigned driver' });
    }

    // Create new conversation
    const conversation = await storage.createChatConversation({
      rideId: rideId
    });

    // Add rider and driver as participants
    await storage.addChatParticipant({
      conversationId: conversation.id,
      userId: ride.riderId
    });
    
    await storage.addChatParticipant({
      conversationId: conversation.id,
      userId: ride.driverId
    });

    res.json({ 
      success: true, 
      conversation: conversation,
      message: 'Conversation created successfully' 
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get all conversations for current user
router.get('/api/chat/conversations', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await storage.getUserChatConversations(req.user!.id);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation
router.get('/api/chat/conversations/:id', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await storage.getChatConversation(parseInt(id));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is participant
    const participants = await storage.getChatParticipants(parseInt(id));
    const isParticipant = participants.some(p => p.userId === req.user!.id);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get messages for a conversation
router.get('/api/chat/conversations/:id/messages', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;
    
    const conversation = await storage.getChatConversation(parseInt(id));
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is participant
    const participants = await storage.getChatParticipants(parseInt(id));
    const isParticipant = participants.some(p => p.userId === req.user!.id);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await storage.getChatMessages(
      parseInt(id), 
      parseInt(limit as string),
      before ? parseInt(before as string) : undefined
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/api/chat/conversations/:id/messages', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, attachmentUrl, attachmentType } = req.body;
    
    if (!content && !attachmentUrl) {
      return res.status(400).json({ error: 'Content or attachment is required' });
    }

    const conversation = await storage.getChatConversation(parseInt(id));
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is participant
    const participants = await storage.getChatParticipants(parseInt(id));
    const isParticipant = participants.some(p => p.userId === req.user!.id);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await storage.createChatMessage({
      conversationId: parseInt(id),
      senderId: req.user!.id,
      content: content || '',
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      isSystemMessage: false
    });

    res.json({ 
      success: true, 
      message: message,
      notification: 'Message sent successfully' 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/api/chat/conversations/:id/read', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { messageId } = req.body;
    
    const conversation = await storage.getChatConversation(parseInt(id));
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is participant
    const participants = await storage.getChatParticipants(parseInt(id));
    const isParticipant = participants.some(p => p.userId === req.user!.id);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (messageId) {
      await storage.updateChatParticipantLastRead(parseInt(id), req.user!.id, messageId);
    }
    
    res.json({ success: true, message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

// Admin-only routes for viewing all conversations and messages
// Answer to user question: Yes, admins can view messages between riders and drivers

// Admin: Get all conversations in the system
router.get('/api/admin/chat/conversations', isAuthenticated, hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all chat conversations with related ride and participant info
    const conversations = await storage.getAllChatConversationsForAdmin();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching all conversations for admin:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Admin: Get specific conversation with full details
router.get('/api/admin/chat/conversations/:id', isAuthenticated, hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await storage.getChatConversation(parseInt(id));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get participants and ride details for admin view
    const participants = await storage.getChatParticipants(parseInt(id));
    const ride = conversation.rideId ? await storage.getRide(conversation.rideId) : null;
    
    res.json({
      conversation,
      participants,
      ride
    });
  } catch (error) {
    console.error('Error fetching conversation for admin:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Admin: Get messages for any conversation
router.get('/api/admin/chat/conversations/:id/messages', isAuthenticated, hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const conversation = await storage.getChatConversation(parseInt(id));
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await storage.getChatMessages(
      parseInt(id), 
      parseInt(limit as string)
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages for admin:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;