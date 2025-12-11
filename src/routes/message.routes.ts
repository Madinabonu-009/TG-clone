import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { Message } from '../models/Message';
import { Chat } from '../models/Chat';
import { User } from '../models/User';
import { getIO } from '../socket';
import mongoose from 'mongoose';

// Configure multer for image uploads
const imageUploadDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

// Configure multer for video uploads
const videoUploadDir = path.join(__dirname, '../../uploads/videos');
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

// Configure multer for file uploads
const fileUploadDir = path.join(__dirname, '../../uploads/files');
if (!fs.existsSync(fileUploadDir)) {
  fs.mkdirSync(fileUploadDir, { recursive: true });
}

// Configure multer for voice uploads
const voiceUploadDir = path.join(__dirname, '../../uploads/voices');
if (!fs.existsSync(voiceUploadDir)) {
  fs.mkdirSync(voiceUploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imageUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const videoFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, fileUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain',
    'application/json'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

const uploadFile = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Voice storage
const voiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, voiceUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const voiceFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

const uploadVoice = multer({
  storage: voiceStorage,
  fileFilter: voiceFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

const router = Router();

// Get messages for a chat
router.get('/:chatId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user!.id;
    const { limit = 50, before } = req.query;

    // Verify user is participant of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found or access denied' }
      });
    }

    // Build query
    const query: Record<string, unknown> = { chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Get sender info for messages
    const senderIds = [...new Set(messages.map(m => m.senderId.toString()))];
    const senders = await User.find({ _id: { $in: senderIds } })
      .select('_id username firstName lastName photoUrl')
      .lean();

    const senderMap = new Map(senders.map(s => [s._id.toString(), s]));

    // Get reply messages info
    const replyIds = messages.filter(m => (m as any).replyTo).map(m => (m as any).replyTo);
    const replyMessages = replyIds.length > 0 ? await Message.find({ _id: { $in: replyIds } }).lean() : [];
    const replyMap = new Map(replyMessages.map(r => [r._id.toString(), r]));

    const messagesWithSender = messages
      .filter(msg => {
        // Filter out messages deleted for this user
        const deletedFor = (msg as any).deletedFor || [];
        return !deletedFor.some((id: any) => id.toString() === userId);
      })
      .map(msg => {
        const msgAny = msg as any;
        const replyMsg = msgAny.replyTo ? replyMap.get(msgAny.replyTo.toString()) : null;
        
        return {
          id: msg._id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          sender: senderMap.get(msg.senderId.toString()),
          text: msgAny.isDeleted ? 'This message was deleted' : msg.text,
          imageUrl: msgAny.isDeleted ? null : msgAny.imageUrl,
          videoUrl: msgAny.isDeleted ? null : msgAny.videoUrl,
          voiceUrl: msgAny.isDeleted ? null : msgAny.voiceUrl,
          voiceDuration: msgAny.voiceDuration,
          fileUrl: msgAny.isDeleted ? null : msgAny.fileUrl,
          fileName: msgAny.fileName,
          fileSize: msgAny.fileSize,
          type: msg.type,
          status: msg.status,
          replyTo: replyMsg ? {
            id: replyMsg._id,
            text: replyMsg.text,
            senderId: replyMsg.senderId,
            sender: senderMap.get(replyMsg.senderId.toString())
          } : null,
          forwardedFrom: msgAny.forwardedFrom,
          isEdited: msgAny.isEdited,
          isDeleted: msgAny.isDeleted,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        };
      });

    // Return in chronological order
    res.json({
      data: messagesWithSender.reverse()
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get messages' }
    });
  }
});


// Send a message
router.post('/send', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, text, type = 'text' } = req.body;

    if (!chatId || !text?.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID and message text are required' }
      });
    }

    // Verify user is participant of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found or access denied' }
      });
    }

    // Create message
    const message = new Message({
      chatId,
      senderId: userId,
      text: text.trim(),
      type,
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    // Update chat's lastMessage and updatedAt
    chat.lastMessage = {
      text: text.trim(),
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    chat.updatedAt = new Date();
    await chat.save();

    // Get sender info
    const sender = await User.findById(userId)
      .select('_id username firstName lastName photoUrl')
      .lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      imageUrl: message.imageUrl,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    // Emit to all participants in the chat room via Socket.io
    const io = getIO();
    io.to('chat:' + chatId).emit('message:new', messageData);

    // Also emit to participants who might not be in the chat room
    chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({
      data: messageData
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' }
    });
  }
});

// Send image message
router.post('/send-image', authMiddleware, uploadImage.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, caption = '' } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID is required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Image file is required' }
      });
    }

    // Verify user is participant of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      // Delete uploaded file if chat not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found or access denied' }
      });
    }

    // Create image URL
    const imageUrl = `/uploads/images/${req.file.filename}`;

    // Create message
    const message = new Message({
      chatId,
      senderId: userId,
      text: caption || '📷 Photo',
      imageUrl,
      type: 'image',
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    // Update chat's lastMessage
    chat.lastMessage = {
      text: caption || '📷 Photo',
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    chat.updatedAt = new Date();
    await chat.save();

    // Get sender info
    const sender = await User.findById(userId)
      .select('_id username firstName lastName photoUrl')
      .lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      imageUrl: message.imageUrl,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    // Emit to all participants
    const io = getIO();
    io.to('chat:' + chatId).emit('message:new', messageData);

    chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({
      data: messageData
    });
  } catch (error) {
    console.error('Send image error:', error);
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send image' }
    });
  }
});

// Send video message
router.post('/send-video', authMiddleware, uploadVideo.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, caption = '' } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID is required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Video file is required' }
      });
    }

    // Verify user is participant of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found or access denied' }
      });
    }

    // Create video URL
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    // Create message
    const message = new Message({
      chatId,
      senderId: userId,
      text: caption || '🎬 Video',
      videoUrl,
      type: 'video',
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    // Update chat's lastMessage
    chat.lastMessage = {
      text: caption || '🎬 Video',
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    chat.updatedAt = new Date();
    await chat.save();

    // Get sender info
    const sender = await User.findById(userId)
      .select('_id username firstName lastName photoUrl')
      .lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      videoUrl: message.videoUrl,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    // Emit to all participants
    const io = getIO();
    io.to('chat:' + chatId).emit('message:new', messageData);

    chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({
      data: messageData
    });
  } catch (error) {
    console.error('Send video error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send video' }
    });
  }
});

// Send file message
router.post('/send-file', authMiddleware, uploadFile.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, caption = '' } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID is required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'File is required' }
      });
    }

    // Verify user is participant of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found or access denied' }
      });
    }

    // Create file URL
    const fileUrl = `/uploads/files/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Create message
    const message = new Message({
      chatId,
      senderId: userId,
      text: caption || `📎 ${fileName}`,
      fileUrl,
      fileName,
      fileSize,
      type: 'file',
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    // Update chat's lastMessage
    chat.lastMessage = {
      text: caption || `📎 ${fileName}`,
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    chat.updatedAt = new Date();
    await chat.save();

    // Get sender info
    const sender = await User.findById(userId)
      .select('_id username firstName lastName photoUrl')
      .lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    // Emit to all participants
    const io = getIO();
    io.to('chat:' + chatId).emit('message:new', messageData);

    chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({
      data: messageData
    });
  } catch (error) {
    console.error('Send file error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send file' }
    });
  }
});

// Send voice message
router.post('/send-voice', authMiddleware, uploadVoice.single('voice'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, duration } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID is required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Voice file is required' }
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found or access denied' }
      });
    }

    const voiceUrl = `/uploads/voices/${req.file.filename}`;

    const message = new Message({
      chatId,
      senderId: userId,
      text: '🎤 Voice message',
      voiceUrl,
      voiceDuration: parseInt(duration) || 0,
      type: 'voice',
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    chat.lastMessage = {
      text: '🎤 Voice message',
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    chat.updatedAt = new Date();
    await chat.save();

    const sender = await User.findById(userId)
      .select('_id username firstName lastName photoUrl')
      .lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      voiceUrl: (message as any).voiceUrl,
      voiceDuration: (message as any).voiceDuration,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    const io = getIO();
    io.to('chat:' + chatId).emit('message:new', messageData);

    chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({ data: messageData });
  } catch (error) {
    console.error('Send voice error:', error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send voice message' }
    });
  }
});

// Reply to message
router.post('/reply', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, text, replyToId, type = 'text' } = req.body;

    if (!chatId || !text?.trim() || !replyToId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID, text and replyToId are required' }
      });
    }

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found' }
      });
    }

    const replyToMessage = await Message.findById(replyToId);
    if (!replyToMessage) {
      return res.status(404).json({
        error: { code: 'MESSAGE_NOT_FOUND', message: 'Reply message not found' }
      });
    }

    const message = new Message({
      chatId,
      senderId: userId,
      text: text.trim(),
      type,
      replyTo: replyToId,
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    chat.lastMessage = {
      text: text.trim(),
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    await chat.save();

    const sender = await User.findById(userId).select('_id username firstName lastName photoUrl').lean();
    const replySender = await User.findById(replyToMessage.senderId).select('_id username firstName lastName').lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      type: message.type,
      status: message.status,
      replyTo: {
        id: replyToMessage._id,
        text: replyToMessage.text,
        senderId: replyToMessage.senderId,
        sender: replySender
      },
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    const io = getIO();
    io.to('chat:' + chatId).emit('message:new', messageData);
    chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({ data: messageData });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reply' } });
  }
});

// Forward message
router.post('/forward', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId, toChatId } = req.body;

    if (!messageId || !toChatId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Message ID and target chat ID are required' }
      });
    }

    const originalMessage = await Message.findById(messageId).populate('senderId', 'firstName lastName username');
    if (!originalMessage) {
      return res.status(404).json({
        error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' }
      });
    }

    const targetChat = await Chat.findOne({ _id: toChatId, participants: userId });
    if (!targetChat) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Target chat not found' }
      });
    }

    const senderInfo = originalMessage.senderId as any;
    const senderName = senderInfo.firstName ? `${senderInfo.firstName} ${senderInfo.lastName || ''}`.trim() : senderInfo.username;

    const message = new Message({
      chatId: toChatId,
      senderId: userId,
      text: originalMessage.text,
      imageUrl: (originalMessage as any).imageUrl,
      videoUrl: (originalMessage as any).videoUrl,
      voiceUrl: (originalMessage as any).voiceUrl,
      voiceDuration: (originalMessage as any).voiceDuration,
      fileUrl: (originalMessage as any).fileUrl,
      fileName: (originalMessage as any).fileName,
      fileSize: (originalMessage as any).fileSize,
      type: originalMessage.type,
      forwardedFrom: {
        chatId: originalMessage.chatId,
        messageId: originalMessage._id,
        senderName
      },
      status: 'sent',
      readBy: [userId]
    });

    await message.save();

    targetChat.lastMessage = {
      text: originalMessage.text,
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };
    await targetChat.save();

    const sender = await User.findById(userId).select('_id username firstName lastName photoUrl').lean();

    const messageData = {
      id: message._id,
      chatId: message.chatId,
      senderId: message.senderId,
      sender,
      text: message.text,
      imageUrl: (message as any).imageUrl,
      videoUrl: (message as any).videoUrl,
      voiceUrl: (message as any).voiceUrl,
      voiceDuration: (message as any).voiceDuration,
      fileUrl: (message as any).fileUrl,
      fileName: (message as any).fileName,
      fileSize: (message as any).fileSize,
      type: message.type,
      status: message.status,
      forwardedFrom: (message as any).forwardedFrom,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    const io = getIO();
    io.to('chat:' + toChatId).emit('message:new', messageData);
    targetChat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
      if (participantId.toString() !== userId) {
        io.to('user:' + participantId.toString()).emit('message:new', messageData);
      }
    });

    res.status(201).json({ data: messageData });
  } catch (error) {
    console.error('Forward error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to forward message' } });
  }
});

// Edit message
router.put('/edit/:messageId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Text is required' }
      });
    }

    const message = await Message.findOne({ _id: messageId, senderId: userId });
    if (!message) {
      return res.status(404).json({
        error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found or not authorized' }
      });
    }

    // Can only edit within 48 hours
    const hoursSinceSent = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSent > 48) {
      return res.status(400).json({
        error: { code: 'EDIT_EXPIRED', message: 'Cannot edit messages older than 48 hours' }
      });
    }

    message.text = text.trim();
    (message as any).isEdited = true;
    (message as any).editedAt = new Date();
    await message.save();

    const io = getIO();
    io.to('chat:' + message.chatId).emit('message:edited', {
      messageId: message._id,
      chatId: message.chatId,
      text: message.text,
      isEdited: true,
      editedAt: (message as any).editedAt
    });

    res.json({ success: true, data: { id: message._id, text: message.text, isEdited: true } });
  } catch (error) {
    console.error('Edit error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to edit message' } });
  }
});

// Delete message
router.delete('/delete/:messageId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const { forEveryone } = req.query;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' }
      });
    }

    const chat = await Chat.findOne({ _id: message.chatId, participants: userId });
    if (!chat) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not authorized' }
      });
    }

    if (forEveryone === 'true' && message.senderId.toString() === userId) {
      // Delete for everyone (only sender can do this)
      (message as any).isDeleted = true;
      (message as any).deletedAt = new Date();
      message.text = 'This message was deleted';
      await message.save();

      const io = getIO();
      io.to('chat:' + message.chatId).emit('message:deleted', {
        messageId: message._id,
        chatId: message.chatId,
        forEveryone: true
      });
    } else {
      // Delete for me only
      if (!(message as any).deletedFor) {
        (message as any).deletedFor = [];
      }
      (message as any).deletedFor.push(new mongoose.Types.ObjectId(userId));
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete message' } });
  }
});

// Search messages
router.get('/search/:chatId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { query, limit = 50 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Search query is required' }
      });
    }

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found' }
      });
    }

    const messages = await Message.find({
      chatId,
      text: { $regex: query, $options: 'i' },
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('senderId', '_id username firstName lastName photoUrl')
      .lean();

    const results = messages.map(msg => ({
      id: msg._id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      sender: msg.senderId,
      text: msg.text,
      type: msg.type,
      createdAt: msg.createdAt
    }));

    res.json({ data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to search messages' } });
  }
});

// Mark messages as read
router.post('/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId, messageIds } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Chat ID is required' }
      });
    }

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found' }
      });
    }

    // Update messages
    const query: Record<string, unknown> = {
      chatId,
      senderId: { $ne: userId },
      readBy: { $ne: userId }
    };

    if (messageIds?.length) {
      query._id = { $in: messageIds };
    }

    await Message.updateMany(query, {
      $addToSet: { readBy: userId },
      $set: { status: 'read' }
    });

    // Notify sender about read status
    const io = getIO();
    io.to('chat:' + chatId).emit('messages:read', {
      chatId,
      readBy: userId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark messages as read' }
    });
  }
});

export default router;
