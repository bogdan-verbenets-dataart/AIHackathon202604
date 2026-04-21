import Redis from 'ioredis';

const PRESENCE_TTL = 90;

function tabKey(userId: string, tabId: string) {
  return `presence:${userId}:tab:${tabId}`;
}

export async function setTabActive(userId: string, tabId: string, redisClient: Redis): Promise<void> {
  await redisClient.set(tabKey(userId, tabId), 'active', 'EX', PRESENCE_TTL);
}

export async function setTabAfk(userId: string, tabId: string, redisClient: Redis): Promise<void> {
  const key = tabKey(userId, tabId);
  const ttl = await redisClient.ttl(key);
  // ttl > 0: key exists with expiry — preserve it
  // ttl === -1: key exists without expiry (shouldn't happen, but treat as PRESENCE_TTL)
  // ttl === -2: key doesn't exist — create with PRESENCE_TTL
  await redisClient.set(key, 'afk', 'EX', ttl > 0 ? ttl : PRESENCE_TTL);
}

export async function removeTab(userId: string, tabId: string, redisClient: Redis): Promise<void> {
  await redisClient.del(tabKey(userId, tabId));
}

export type PresenceStatus = 'online' | 'afk' | 'offline';

export async function getUserStatus(userId: string, redisClient: Redis): Promise<PresenceStatus> {
  const pattern = `presence:${userId}:tab:*`;
  const keys = await scanKeys(redisClient, pattern);

  if (keys.length === 0) return 'offline';

  const values = await redisClient.mget(...keys);
  if (values.some((v) => v === 'active')) return 'online';
  if (values.some((v) => v === 'afk')) return 'afk';
  return 'offline';
}

async function scanKeys(redisClient: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, found] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');
  return keys;
}

export async function publishPresenceChange(
  userId: string,
  status: PresenceStatus,
  redisClient: Redis
): Promise<void> {
  await redisClient.publish('presence:updates', JSON.stringify({ userId, status }));
}
