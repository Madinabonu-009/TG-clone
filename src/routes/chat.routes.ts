import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { memoryStore } from '../db/memory-store';
import { isInMemoryMode } from '../db/mongodb';
import mongoose from 'mongoose';

const router = Router();

// POST /api/chat/create - Create a new chat
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId, type = 'private' } = req.body;
    const currentUserId = req.user!.id;

    if (!participantId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Participant ID is required' } });
      return;
    }

    if (participantId === currentUserId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cannot create chat with yourself' } });
      return;
    }

    // Check if participant exists
    let participant;
    if (isInMemoryMode()) {
      participant = await memoryStore.findUserById(participantId);
    } else {
      participant = await User.findById(participantId);
    }

    if (!participant) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // For private chats, check if chat already exists
    if (type === 'private') {
      let existingChat;
      if (isInMemoryMode()) {
        existingChat = await memoryStore.findPrivateChat(currentUserId, participantId);
      } else {
        existingChat = await Chat.findOne({
          type: 'private',
          participants: { $all: [currentUserId, participantId] }
        }).populate('participants', 'username firstName lastName photoUrl lastSeen');
      }

      if (existingChat) {
        // Return existing chat
        if (isInMemoryMode()) {
          const otherUser = await memoryStore.findUserById(participantId);
          res.json({
            success: true,
            data: {
              id: existingChat._id,
              type: existingChat.type,
              participant: otherUser ? {
                id: otherUser._id,
                username: otherUser.username,
                firstName: otherUser.firstName,
                lastName: otherUser.lastName,
                photoUrl: otherUser.photoUrl,
                lastSeen: otherUser.lastSeen
              } : null,
              lastMessage: existingChat.lastMessage,
              createdAt: existingChat.createdAt,
              updatedAt: existingChat.updatedAt
            }
          });
        } else {
          const otherParticipant = (existingChat.participants as any[]).find(
            (p: any) => p._id.toString() !== currentUserId
          );
          res.json({
            success: true,
            data: {
              id: existingChat._id.toString(),
              type: existingChat.type,
              participant: otherParticipant ? {
                id: otherParticipant._id.toString(),
                username: otherParticipant.username,
                firstName: otherParticipant.firstName,
                lastName: otherParticipant.lastName,
                photoUrl: otherParticipant.photoUrl,
                lastSeen: otherParticipant.lastSeen
              } : null,
              lastMessage: existingChat.lastMessage,
              createdAt: existingChat.createdAt,
              updatedAt: existingChat.updatedAt
            }
          });
        }
        return;
      }
    }

    // Create new chat
    let newChat;
    if (isInMemoryMode()) {
      newChat = await memoryStore.createChat({
        type,
        participants: [currentUserId, participantId],
        createdBy: currentUserId
      });

      res.status(201).json({
        success: true,
        data: {
          id: newChat._id,
          type: newChat.type,
          participant: {
            id: participant._id,
            username: participant.username,
            firstName: participant.firstName,
            lastName: participant.lastName,
            photoUrl: participant.photoUrl,
            lastSeen: participant.lastSeen
          },
          lastMessage: null,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        }
      });
    } else {
      newChat = new Chat({
        type,
        participants: [
          new mongoose.Types.ObjectId(currentUserId),
          new mongoose.Types.ObjectId(participantId)
        ],
        createdBy: new mongoose.Types.ObjectId(currentUserId)
      });
      await newChat.save();

      res.status(201).json({
        success: true,
        data: {
          id: newChat._id.toString(),
          type: newChat.type,
          participant: {
            id: (participant as any)._id.toString(),
            username: participant.username,
            firstName: participant.firstName,
            lastName: participant.lastName,
            photoUrl: participant.photoUrl,
            lastSeen: participant.lastSeen
          },
          lastMessage: null,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        }
      });
    }
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create chat' } });
  }
});

// GET /api/chat/my - Get user's chats
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;

    if (isInMemoryMode()) {
      const chats = await memoryStore.getUserChats(currentUserId);
      const chatList = await Promise.all(chats.map(async (chat) => {
        if (chat.type === 'group') {
          return {
            id: chat._id,
            type: 'group',
            name: chat.name,
            photoUrl: chat.photoUrl,
            participantCount: chat.participants.length,
            participant: null,
            lastMessage: chat.lastMessage,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt
          };
        }
        
        const otherUserId = chat.participants.find(id => id !== currentUserId);
        const otherUser = otherUserId ? await memoryStore.findUserById(otherUserId) : null;
        
        return {
          id: chat._id,
          type: chat.type,
          participant: otherUser ? {
            id: otherUser._id,
            username: otherUser.username,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            photoUrl: otherUser.photoUrl,
            lastSeen: otherUser.lastSeen
          } : null,
          lastMessage: chat.lastMessage,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        };
      }));

      res.json({ success: true, data: chatList });
    } else {
      const chats = await Chat.find({
        participants: new mongoose.Types.ObjectId(currentUserId)
      })
        .populate('participants', 'username firstName lastName photoUrl lastSeen')
        .sort({ updatedAt: -1 });

      // Get unread counts for all chats
      const chatIds = chats.map(c => c._id);
      const unreadCounts = await Message.aggregate([
        {
          $match: {
            chatId: { $in: chatIds },
            senderId: { $ne: new mongoose.Types.ObjectId(currentUserId) },
            readBy: { $ne: new mongoose.Types.ObjectId(currentUserId) }
          }
        },
        {
          $group: {
            _id: '$chatId',
            count: { $sum: 1 }
          }
        }
      ]);

      const unreadMap = new Map(unreadCounts.map(u => [u._id.toString(), u.count]));

      const chatList = chats.map(chat => {
        const unreadCount = unreadMap.get(chat._id.toString()) || 0;
        const isPinned = chat.pinnedBy?.some(id => id.toString() === currentUserId) || false;

        if (chat.type === 'group') {
          return {
            id: chat._id.toString(),
            type: 'group',
            name: chat.name,
            description: chat.description,
            photoUrl: chat.photoUrl,
            participantCount: chat.participants.length,
            participant: null,
            lastMessage: chat.lastMessage,
            unreadCount,
            isPinned,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt
          };
        }

        const otherParticipant = (chat.participants as any[]).find(
          (p: any) => p._id.toString() !== currentUserId
        );

        return {
          id: chat._id.toString(),
          type: chat.type,
          participant: otherParticipant ? {
            id: otherParticipant._id.toString(),
            username: otherParticipant.username,
            firstName: otherParticipant.firstName,
            lastName: otherParticipant.lastName,
            photoUrl: otherParticipant.photoUrl,
            lastSeen: otherParticipant.lastSeen
          } : null,
          lastMessage: chat.lastMessage,
          unreadCount,
          isPinned,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        };
      });

      // Sort: pinned first, then by updatedAt
      chatList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      res.json({ success: true, data: chatList });
    }
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chats' } });
  }
});

// GET /api/chat/:id - Get single chat
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const currentUserId = req.user!.id;

    let chat;
    if (isInMemoryMode()) {
      chat = await memoryStore.findChatById(chatId);
      if (!chat || !chat.participants.includes(currentUserId)) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Chat not found' } });
        return;
      }

      const otherUserId = chat.participants.find(id => id !== currentUserId);
      const otherUser = otherUserId ? await memoryStore.findUserById(otherUserId) : null;

      res.json({
        success: true,
        data: {
          id: chat._id,
          type: chat.type,
          participant: otherUser ? {
            id: otherUser._id,
            username: otherUser.username,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            photoUrl: otherUser.photoUrl,
            lastSeen: otherUser.lastSeen
          } : null,
          lastMessage: chat.lastMessage,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        }
      });
    } else {
      chat = await Chat.findOne({
        _id: chatId,
        participants: new mongoose.Types.ObjectId(currentUserId)
      }).populate('participants', 'username firstName lastName photoUrl lastSeen');

      if (!chat) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Chat not found' } });
        return;
      }

      const otherParticipant = (chat.participants as any[]).find(
        (p: any) => p._id.toString() !== currentUserId
      );

      res.json({
        success: true,
        data: {
          id: chat._id.toString(),
          type: chat.type,
          participant: otherParticipant ? {
            id: otherParticipant._id.toString(),
            username: otherParticipant.username,
            firstName: otherParticipant.firstName,
            lastName: otherParticipant.lastName,
            photoUrl: otherParticipant.photoUrl,
            lastSeen: otherParticipant.lastSeen
          } : null,
          lastMessage: chat.lastMessage,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        }
      });
    }
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chat' } });
  }
});

// POST /api/chat/group/create - Create a new group chat
router.post('/group/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, participantIds, description, photoUrl } = req.body;
    const currentUserId = req.user!.id;

    if (!name || !name.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Group name is required' } });
      return;
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one participant is required' } });
      return;
    }

    // Add current user to participants if not included
    const allParticipants = [...new Set([currentUserId, ...participantIds])];

    if (isInMemoryMode()) {
      const newChat = await memoryStore.createChat({
        type: 'group',
        name: name.trim(),
        description: description?.trim() || '',
        photoUrl: photoUrl || null,
        participants: allParticipants,
        admins: [currentUserId],
        createdBy: currentUserId
      });

      res.status(201).json({
        success: true,
        data: {
          id: newChat._id,
          type: 'group',
          name: newChat.name,
          description: newChat.description,
          photoUrl: newChat.photoUrl,
          participantCount: allParticipants.length,
          lastMessage: null,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        }
      });
    } else {
      const participantObjectIds = allParticipants.map(id => new mongoose.Types.ObjectId(id));
      
      const newChat = new Chat({
        type: 'group',
        name: name.trim(),
        description: description?.trim() || '',
        photoUrl: photoUrl || null,
        participants: participantObjectIds,
        admins: [new mongoose.Types.ObjectId(currentUserId)],
        createdBy: new mongoose.Types.ObjectId(currentUserId)
      });
      await newChat.save();

      res.status(201).json({
        success: true,
        data: {
          id: newChat._id.toString(),
          type: 'group',
          name: newChat.name,
          description: newChat.description,
          photoUrl: newChat.photoUrl,
          participantCount: allParticipants.length,
          lastMessage: null,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        }
      });
    }
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' } });
  }
});

// GET /api/chat/group/:id/members - Get group members
router.get('/group/:id/members', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const currentUserId = req.user!.id;

    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      participants: new mongoose.Types.ObjectId(currentUserId)
    }).populate('participants', 'username firstName lastName photoUrl lastSeen')
      .populate('admins', 'username firstName lastName photoUrl');

    if (!chat) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Group not found' } });
      return;
    }

    const adminIds = (chat.admins as any[]).map((a: any) => a._id.toString());
    const members = (chat.participants as any[]).map((p: any) => ({
      id: p._id.toString(),
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
      photoUrl: p.photoUrl,
      lastSeen: p.lastSeen,
      isAdmin: adminIds.includes(p._id.toString())
    }));

    res.json({
      success: true,
      data: {
        groupId: chat._id.toString(),
        name: chat.name,
        members
      }
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch group members' } });
  }
});

// POST /api/chat/group/:id/add-member - Add member to group
router.post('/group/:id/add-member', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const { userId } = req.body;
    const currentUserId = req.user!.id;

    if (!userId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'User ID is required' } });
      return;
    }

    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      participants: new mongoose.Types.ObjectId(currentUserId)
    });

    if (!chat) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Group not found' } });
      return;
    }

    // Check if user is already a member
    if (chat.participants.some(p => p.toString() === userId)) {
      res.status(400).json({ error: { code: 'ALREADY_MEMBER', message: 'User is already a member' } });
      return;
    }

    chat.participants.push(new mongoose.Types.ObjectId(userId));
    await chat.save();

    res.json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add member' } });
  }
});

// POST /api/chat/group/:id/leave - Leave group
router.post('/group/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const currentUserId = req.user!.id;

    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      participants: new mongoose.Types.ObjectId(currentUserId)
    });

    if (!chat) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Group not found' } });
      return;
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(p => p.toString() !== currentUserId);
    
    // Remove from admins if admin
    if (chat.admins) {
      chat.admins = chat.admins.filter(a => a.toString() !== currentUserId);
    }

    await chat.save();

    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to leave group' } });
  }
});

// PUT /api/chat/group/:id - Update group info
router.put('/group/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const { name, description, photoUrl } = req.body;
    const currentUserId = req.user!.id;

    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      admins: new mongoose.Types.ObjectId(currentUserId)
    });

    if (!chat) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Group not found or not admin' } });
      return;
    }

    if (name) chat.name = name.trim();
    if (description !== undefined) chat.description = description.trim();
    if (photoUrl !== undefined) chat.photoUrl = photoUrl;

    await chat.save();

    res.json({
      success: true,
      data: {
        id: chat._id.toString(),
        name: chat.name,
        description: chat.description,
        photoUrl: chat.photoUrl
      }
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update group' } });
  }
});

// POST /api/chat/:id/pin - Pin chat
router.post('/:id/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const currentUserId = req.user!.id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: new mongoose.Types.ObjectId(currentUserId)
    });

    if (!chat) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Chat not found' } });
      return;
    }

    if (!chat.pinnedBy) {
      chat.pinnedBy = [];
    }

    if (!chat.pinnedBy.some(id => id.toString() === currentUserId)) {
      chat.pinnedBy.push(new mongoose.Types.ObjectId(currentUserId));
      await chat.save();
    }

    res.json({ success: true, message: 'Chat pinned' });
  } catch (error) {
    console.error('Pin chat error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to pin chat' } });
  }
});

// POST /api/chat/:id/unpin - Unpin chat
router.post('/:id/unpin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.params.id;
    const currentUserId = req.user!.id;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: new mongoose.Types.ObjectId(currentUserId)
    });

    if (!chat) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Chat not found' } });
      return;
    }

    if (chat.pinnedBy) {
      chat.pinnedBy = chat.pinnedBy.filter(id => id.toString() !== currentUserId);
      await chat.save();
    }

    res.json({ success: true, message: 'Chat unpinned' });
  } catch (error) {
    console.error('Unpin chat error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to unpin chat' } });
  }
});

export default router;
