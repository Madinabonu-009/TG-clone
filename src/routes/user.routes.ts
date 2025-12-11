import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { memoryStore } from '../db/memory-store';
import { isInMemoryMode } from '../db/mongodb';

const router = Router();

// GET /api/users/search?query=
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.query as string) || '';
    
    if (!query.trim()) {
      res.json({ success: true, data: [] });
      return;
    }

    let users;
    if (isInMemoryMode()) {
      users = await memoryStore.searchUsers(query, req.user!.id);
    } else {
      const searchRegex = new RegExp(query, 'i');
      users = await User.find({
        _id: { $ne: req.user!.id },
        $or: [
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      }).select('username firstName lastName photoUrl lastSeen').limit(20);
    }

    const results = users.map(user => ({
      id: isInMemoryMode() ? user._id : user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      lastSeen: user.lastSeen
    }));

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Search failed' }, timestamp: new Date() });
  }
});

// GET /api/users
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let users;
    if (isInMemoryMode()) {
      users = await memoryStore.getAllUsers(req.user!.id);
    } else {
      users = await User.find({ _id: { $ne: req.user!.id } })
        .select('username firstName lastName photoUrl lastSeen').limit(50);
    }

    const results = users.map(user => ({
      id: isInMemoryMode() ? user._id : user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      lastSeen: user.lastSeen
    }));

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' }, timestamp: new Date() });
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let user;
    if (isInMemoryMode()) {
      user = await memoryStore.findUserById(req.params.id);
    } else {
      user = await User.findById(req.params.id).select('username firstName lastName bio photoUrl lastSeen');
    }
    
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' }, timestamp: new Date() });
      return;
    }

    res.json({
      success: true,
      data: {
        id: isInMemoryMode() ? user._id : user._id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        photoUrl: user.photoUrl,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' }, timestamp: new Date() });
  }
});

// POST /api/users/:id/block - Block user
router.post('/:id/block', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdToBlock = req.params.id;
    const currentUserId = req.user!.id;

    if (userIdToBlock === currentUserId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Cannot block yourself' } });
      return;
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    if (!currentUser.blockedUsers) {
      currentUser.blockedUsers = [];
    }

    const mongoose = await import('mongoose');
    if (!currentUser.blockedUsers.some(id => id.toString() === userIdToBlock)) {
      currentUser.blockedUsers.push(new mongoose.Types.ObjectId(userIdToBlock));
      await currentUser.save();
    }

    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to block user' } });
  }
});

// POST /api/users/:id/unblock - Unblock user
router.post('/:id/unblock', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdToUnblock = req.params.id;
    const currentUserId = req.user!.id;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    if (currentUser.blockedUsers) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userIdToUnblock);
      await currentUser.save();
    }

    res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to unblock user' } });
  }
});

// GET /api/users/blocked/list - Get blocked users list
router.get('/blocked/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;

    const currentUser = await User.findById(currentUserId).populate('blockedUsers', 'username firstName lastName photoUrl');
    if (!currentUser) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const blockedUsers = (currentUser.blockedUsers || []).map((user: any) => ({
      id: user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl
    }));

    res.json({ success: true, data: blockedUsers });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get blocked users' } });
  }
});

export default router;
