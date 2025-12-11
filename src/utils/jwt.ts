import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthToken } from '../models/interfaces';

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Token expiration in seconds (24 hours)
const TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60;

export function generateToken(userId: string): string {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: TOKEN_EXPIRATION_SECONDS }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = verifyToken(token);
  if (!decoded) return true;
  return Date.now() >= decoded.exp * 1000;
}
