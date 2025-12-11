import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UserPublic } from '../models/interfaces';

export interface AuthRequest extends Request {
  user?: UserPublic;
  token?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
      return;
    }

    const token = authHeader.substring(7);
    const user = await authService.validateToken(token);

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message
      },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
}
