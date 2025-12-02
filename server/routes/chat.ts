import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

const router = Router();

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const chatUploadsDir = path.join(uploadDir, 'chat');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

// Configure multer for chat file uploads
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueId}${extension}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const allowedAudioTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedAudioTypes];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB for audio and image files
  },
  fileFilter
});

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Upload chat attachment
router.post('/upload-attachment', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create a URL path for the file that can be accessed publicly
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const relativePath = path.join('/uploads/chat', path.basename(req.file.path));
    
    // Clean up path separators for URLs
    const cleanRelativePath = relativePath.replace(/\\/g, '/');
    const fileUrl = `${baseUrl}${cleanRelativePath}`;

    return res.status(200).json({
      url: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error uploading chat attachment:', error);
    return res.status(500).json({ message: 'Failed to upload chat attachment' });
  }
});

// Send a message
router.post('/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const senderId = req.user!.id;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify user is participant in this conversation
    const conversation = await storage.getChatConversationById(parseInt(conversationId));
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const participants = await storage.getChatParticipants(parseInt(conversationId));
    const isParticipant = participants.some(p => p.userId === senderId);
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }

    // Create the message
    const newMessage = await storage.createChatMessage({
      conversationId: parseInt(conversationId),
      senderId,
      content: content.trim(),
      messageType
    });

    res.json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get messages for a conversation
router.get('/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const senderId = req.user!.id;

    // Verify user is participant in this conversation
    const conversation = await storage.getChatConversationById(parseInt(conversationId));
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const participants = await storage.getChatParticipants(parseInt(conversationId));
    const isParticipant = participants.some(p => p.userId === senderId);
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const messages = await storage.getChatMessages(parseInt(conversationId));
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Get or create conversation for a ride
router.post('/conversations/ride/:rideId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { rideId } = req.params;
    const userId = req.user!.id;

    // Get the ride to verify user is rider or driver
    const ride = await storage.getRideById(parseInt(rideId));
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.riderId !== userId && ride.driverId !== userId) {
      return res.status(403).json({ message: 'Not authorized for this ride' });
    }

    // Check if conversation already exists
    let conversation = await storage.getChatConversationByRideId(parseInt(rideId));
    
    if (!conversation) {
      // Create new conversation
      conversation = await storage.createChatConversation({
        rideId: parseInt(rideId),
        type: 'ride'
      });

      // Add participants (rider and driver)
      if (ride.riderId) {
        await storage.createChatParticipant({
          conversationId: conversation.id,
          userId: ride.riderId,
          role: 'rider'
        });
      }

      if (ride.driverId) {
        await storage.createChatParticipant({
          conversationId: conversation.id,
          userId: ride.driverId,
          role: 'driver'
        });
      }
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({ message: 'Failed to get conversation' });
  }
});

export default router;