import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redis;
