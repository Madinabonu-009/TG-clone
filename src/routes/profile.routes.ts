import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { memoryStore } from '../db/memory-store';
import { isInMemoryMode } from '../db/mongodb';

const router = Router();

// GET /api/profile/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let user;
    if (isInMemoryMode()) {
      user = await memoryStore.findUserById(req.user!.id);
    } else {
      user = await User.findById(req.user!.id);
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
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' }, timestamp: new Date() });
  }
});

// PUT /api/profile/me/update
router.put('/me/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, bio } = req.body;

    if (firstName !== undefined && (typeof firstName !== 'string' || firstName.length > 50)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'First name must be max 50 characters' }, timestamp: new Date() });
      return;
    }
    if (lastName !== undefined && (typeof lastName !== 'string' || lastName.length > 50)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Last name must be max 50 characters' }, timestamp: new Date() });
      return;
    }
    if (bio !== undefined && (typeof bio !== 'string' || bio.length > 200)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Bio must be max 200 characters' }, timestamp: new Date() });
      return;
    }

    const updateData: Record<string, string> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;

    let user;
    if (isInMemoryMode()) {
      user = await memoryStore.updateUser(req.user!.id, updateData);
    } else {
      user = await User.findByIdAndUpdate(req.user!.id, { $set: updateData }, { new: true });
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
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' }, timestamp: new Date() });
  }
});

// PUT /api/profile/me/photo
router.put('/me/photo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoUrl } = req.body;

    if (photoUrl !== null && photoUrl !== undefined) {
      if (typeof photoUrl !== 'string') {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Photo URL must be a string or null' }, timestamp: new Date() });
        return;
      }
      if (!photoUrl.startsWith('data:image/')) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid image format' }, timestamp: new Date() });
        return;
      }
      if (photoUrl.length > 2 * 1024 * 1024 * 1.37) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Image too large. Max 2MB' }, timestamp: new Date() });
        return;
      }
    }

    let user;
    if (isInMemoryMode()) {
      user = await memoryStore.updateUser(req.user!.id, { photoUrl: photoUrl || null });
    } else {
      user = await User.findByIdAndUpdate(req.user!.id, { $set: { photoUrl: photoUrl || null } }, { new: true });
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
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update photo' }, timestamp: new Date() });
  }
});

export default router;
