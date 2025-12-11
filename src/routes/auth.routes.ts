import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { RegisterRequest, LoginRequest } from '../models/interfaces';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as RegisterRequest;

    if (!username || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required'
        },
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
      return;
    }

    const user = await authService.register(username, password);

    res.status(201).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    const statusCode = message.includes('already exists') ? 409 : 400;

    res.status(statusCode).json({
      error: {
        code: statusCode === 409 ? 'CONFLICT' : 'VALIDATION_ERROR',
        message
      },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required'
        },
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
      return;
    }

    const result = await authService.login(username, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message
      },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        },
        timestamp: new Date(),
        requestId: (req.headers as Record<string, string>)['x-request-id'] || 'unknown'
      });
      return;
    }

    await authService.logout(req.user.id, req.token);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message
      },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
});

export default router;
