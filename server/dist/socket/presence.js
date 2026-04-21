"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTabActive = setTabActive;
exports.setTabAfk = setTabAfk;
exports.removeTab = removeTab;
exports.getUserStatus = getUserStatus;
exports.publishPresenceChange = publishPresenceChange;
const PRESENCE_TTL = 90;
function tabKey(userId, tabId) {
    return `presence:${userId}:tab:${tabId}`;
}
async function setTabActive(userId, tabId, redisClient) {
    await redisClient.set(tabKey(userId, tabId), 'active', 'EX', PRESENCE_TTL);
}
async function setTabAfk(userId, tabId, redisClient) {
    const key = tabKey(userId, tabId);
    const ttl = await redisClient.ttl(key);
    await redisClient.set(key, 'afk', 'EX', ttl > 0 ? ttl : PRESENCE_TTL);
}
async function removeTab(userId, tabId, redisClient) {
    await redisClient.del(tabKey(userId, tabId));
}
async function getUserStatus(userId, redisClient) {
    const pattern = `presence:${userId}:tab:*`;
    const keys = await scanKeys(redisClient, pattern);
    if (keys.length === 0)
        return 'offline';
    const values = await redisClient.mget(...keys);
    if (values.some((v) => v === 'active'))
        return 'online';
    if (values.some((v) => v === 'afk'))
        return 'afk';
    return 'offline';
}
async function scanKeys(redisClient, pattern) {
    const keys = [];
    let cursor = '0';
    do {
        const [nextCursor, found] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        keys.push(...found);
    } while (cursor !== '0');
    return keys;
}
async function publishPresenceChange(userId, status, redisClient) {
    await redisClient.publish('presence:updates', JSON.stringify({ userId, status }));
}
