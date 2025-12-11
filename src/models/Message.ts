import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  type: 'text' | 'image' | 'video' | 'file' | 'sticker' | 'voice';
  status: 'sent' | 'delivered' | 'read';
  readBy: mongoose.Types.ObjectId[];
  // Reply feature
  replyTo?: mongoose.Types.ObjectId;
  // Forward feature
  forwardedFrom?: {
    chatId: mongoose.Types.ObjectId;
    messageId: mongoose.Types.ObjectId;
    senderName: string;
  };
  // Edit feature
  isEdited?: boolean;
  editedAt?: Date;
  // Delete feature
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedFor?: mongoose.Types.ObjectId[]; // For "delete for me" feature
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 4000
  },
  imageUrl: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  voiceUrl: {
    type: String,
    default: null
  },
  voiceDuration: {
    type: Number,
    default: null
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'sticker', 'voice'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Reply feature
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  // Forward feature
  forwardedFrom: {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    senderName: String
  },
  // Edit feature
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  // Delete feature
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedFor: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for efficient message retrieval
MessageSchema.index({ chatId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
