import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  port: parseInt(process.env.PORT || '4000', 10),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
  nodeEnv: process.env.NODE_ENV || 'development',
};
