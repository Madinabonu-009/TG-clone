import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings {
  privacy: {
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
    onlineStatusVisibility: 'everyone' | 'contacts' | 'nobody';
  };
  notifications: {
    messageNotifications: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  theme: 'light' | 'dark' | 'system';
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  bio: string;
  photoUrl: string | null;
  settings: IUserSettings;
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
  lastSeen: Date;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  passwordHash: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    default: '',
    maxlength: 50
  },
  lastName: {
    type: String,
    default: '',
    maxlength: 50
  },
  bio: {
    type: String,
    default: '',
    maxlength: 200
  },
  photoUrl: {
    type: String,
    default: null
  },
  settings: {
    privacy: {
      lastSeenVisibility: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      profilePhotoVisibility: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      onlineStatusVisibility: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' }
    },
    notifications: {
      messageNotifications: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true }
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' }
  },
  blockedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
});

// Index for search
userSchema.index({ username: 'text', firstName: 'text', lastName: 'text' });

export const User = mongoose.model<IUser>('User', userSchema);
