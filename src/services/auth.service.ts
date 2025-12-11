import { UserPublic, LoginResponse, IAuthService } from '../models/interfaces';
import { hashPassword, comparePassword, validatePassword, validateUsername } from '../utils/password';
import { generateToken, verifyToken } from '../utils/jwt';
import { User } from '../models/User';
import { TokenBlacklist } from '../models/TokenBlacklist';
import { memoryStore } from '../db/memory-store';
import { isInMemoryMode } from '../db/mongodb';
import crypto from 'crypto';

export class AuthService implements IAuthService {
  async register(username: string, password: string): Promise<UserPublic> {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.message);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    const passwordHash = await hashPassword(password);

    if (isInMemoryMode()) {
      const existing = await memoryStore.findUserByUsername(username);
      if (existing) throw new Error('Username already exists');

      const user = await memoryStore.createUser({
        username,
        passwordHash,
        firstName: '',
        lastName: '',
        bio: '',
        photoUrl: null
      });

      return {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      };
    }

    const existingUser = await User.findOne({ 
      username: { $eq: username }
    }).collation({ locale: 'en', strength: 2 });
    if (existingUser) throw new Error('Username already exists');

    const user = new User({
      username,
      passwordHash,
      firstName: '',
      lastName: '',
      bio: '',
      photoUrl: null
    });
    await user.save();

    return {
      id: user._id.toString(),
      username: user.username,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen
    };
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    if (isInMemoryMode()) {
      const user = await memoryStore.findUserByUsername(username);
      if (!user) throw new Error('Invalid username or password');

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) throw new Error('Invalid username or password');

      await memoryStore.updateUser(user._id, { lastSeen: new Date() });
      const token = generateToken(user._id);

      return {
        user: {
          id: user._id,
          username: user.username,
          createdAt: user.createdAt,
          lastSeen: new Date()
        },
        token
      };
    }

    const user = await User.findOne({ 
      username: { $eq: username }
    }).collation({ locale: 'en', strength: 2 });
    if (!user) throw new Error('Invalid username or password');

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) throw new Error('Invalid username or password');

    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      },
      token
    };
  }

  async validateToken(tokenStr: string): Promise<UserPublic> {
    const tokenHash = this.hashToken(tokenStr);

    if (isInMemoryMode()) {
      if (await memoryStore.isTokenBlacklisted(tokenHash)) {
        throw new Error('Token has been invalidated');
      }
    } else {
      const blacklisted = await TokenBlacklist.findOne({ tokenHash });
      if (blacklisted) throw new Error('Token has been invalidated');
    }

    const payload = verifyToken(tokenStr);
    if (!payload) throw new Error('Invalid or expired token');

    if (isInMemoryMode()) {
      const user = await memoryStore.findUserById(payload.userId);
      if (!user) throw new Error('User not found');

      return {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      };
    }

    const user = await User.findById(payload.userId);
    if (!user) throw new Error('User not found');

    return {
      id: user._id.toString(),
      username: user.username,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen
    };
  }

  async logout(userId: string, tokenStr: string): Promise<void> {
    const tokenHash = this.hashToken(tokenStr);
    const payload = verifyToken(tokenStr);
    if (!payload) throw new Error('Invalid token');

    const expiresAt = new Date(payload.exp * 1000);

    if (isInMemoryMode()) {
      await memoryStore.addTokenToBlacklist(tokenHash, userId, expiresAt);
    } else {
      await TokenBlacklist.create({ tokenHash, userId, expiresAt });
    }
  }

  private hashToken(tokenStr: string): string {
    return crypto.createHash('sha256').update(tokenStr).digest('hex');
  }

  async getUserById(userId: string): Promise<UserPublic | null> {
    if (isInMemoryMode()) {
      const user = await memoryStore.findUserById(userId);
      if (!user) return null;
      return {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      };
    }

    const user = await User.findById(userId);
    if (!user) return null;

    return {
      id: user._id.toString(),
      username: user.username,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen
    };
  }
}

export const authService = new AuthService();
