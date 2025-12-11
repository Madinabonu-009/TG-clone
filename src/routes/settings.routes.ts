import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';

const router = Router();

// Get user settings
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId).select('settings').lean();

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Return default settings if not set
    const defaultSettings = {
      privacy: {
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'everyone',
        onlineStatusVisibility: 'everyone'
      },
      notifications: {
        messageNotifications: true,
        soundEnabled: true,
        vibrationEnabled: true
      },
      theme: 'dark'
    };

    res.json({
      data: user.settings || defaultSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get settings' }
    });
  }
});

// Update user settings
router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { privacy, notifications, theme } = req.body;

    const updateData: Record<string, unknown> = {};

    // Update privacy settings
    if (privacy) {
      if (privacy.lastSeenVisibility) {
        updateData['settings.privacy.lastSeenVisibility'] = privacy.lastSeenVisibility;
      }
      if (privacy.profilePhotoVisibility) {
        updateData['settings.privacy.profilePhotoVisibility'] = privacy.profilePhotoVisibility;
      }
      if (privacy.onlineStatusVisibility) {
        updateData['settings.privacy.onlineStatusVisibility'] = privacy.onlineStatusVisibility;
      }
    }

    // Update notification settings
    if (notifications) {
      if (typeof notifications.messageNotifications === 'boolean') {
        updateData['settings.notifications.messageNotifications'] = notifications.messageNotifications;
      }
      if (typeof notifications.soundEnabled === 'boolean') {
        updateData['settings.notifications.soundEnabled'] = notifications.soundEnabled;
      }
      if (typeof notifications.vibrationEnabled === 'boolean') {
        updateData['settings.notifications.vibrationEnabled'] = notifications.vibrationEnabled;
      }
    }

    // Update theme
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      updateData['settings.theme'] = theme;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('settings').lean();

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      data: user.settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' }
    });
  }
});

export default router;
