import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'private' | 'group';
  participants: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  name?: string;
  description?: string;
  photoUrl?: string;
  lastMessage?: {
    text: string;
    senderId: mongoose.Types.ObjectId;
    createdAt: Date;
  };
  pinnedBy: mongoose.Types.ObjectId[]; // Users who pinned this chat
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>({
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  name: {
    type: String,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  photoUrl: {
    type: String
  },
  lastMessage: {
    text: String,
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date
  },
  pinnedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
ChatSchema.index({ participants: 1 });
ChatSchema.index({ updatedAt: -1 });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);
