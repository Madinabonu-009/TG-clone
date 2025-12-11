import mongoose from 'mongoose';
import { config } from '../config';

let useInMemory = false;

export async function connectMongoDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error - switching to in-memory mode');
    console.log('\n========================================');
    console.log('MongoDB ulanishi muvaffaqiyatsiz!');
    console.log('In-memory rejimda ishlamoqda (ma\'lumotlar saqlanmaydi)');
    console.log('\nMongoDB Atlas sozlash uchun:');
    console.log('1. https://cloud.mongodb.com ga boring');
    console.log('2. Network Access -> Add IP Address -> Allow Access from Anywhere');
    console.log('3. Database Access -> foydalanuvchi yarating');
    console.log('4. .env faylda MONGODB_URI ni yangilang');
    console.log('========================================\n');
    useInMemory = true;
  }
}

export function isInMemoryMode(): boolean {
  return useInMemory;
}

export async function disconnectMongoDB(): Promise<void> {
  if (!useInMemory) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  if (!useInMemory) {
    console.log('MongoDB disconnected');
  }
});
