import dotenv from 'dotenv';
dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  port: parseInt(process.env.PORT || '4000', 10),
  uploadsDir: process.env.UPLOADS_DIR || '/uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
};
