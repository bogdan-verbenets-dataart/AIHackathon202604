import api from './axios';
import type { Friend, FriendRequest } from '../types';

export const listFriends = () =>
  api.get<{ data: Friend[] }>('/contacts/friends').then(r => r.data.data);

export const sendFriendRequest = (recipientId: string, message?: string) =>
  api.post('/contacts/friends/requests', { recipientId, message }).then(r => r.data.data);

export const listIncomingRequests = () =>
  api.get<{ data: FriendRequest[] }>('/contacts/friends/requests').then(r => r.data.data);

export const respondToRequest = (id: string, action: 'accept' | 'reject') =>
  api.post(`/contacts/friends/requests/${id}`, { action }).then(r => r.data);

export const removeFriend = (friendshipId: string) =>
  api.delete(`/contacts/friends/${friendshipId}`).then(r => r.data);

export const blockUser = (userId: string) =>
  api.post('/contacts/blocks', { userId }).then(r => r.data);

export const unblockUser = (blockId: string) =>
  api.delete(`/contacts/blocks/${blockId}`).then(r => r.data);

export const listBlocks = () =>
  api.get<{ data: { id: string; blocked: { id: string; username: string } }[] }>('/contacts/blocks').then(r => r.data.data);

export const getPersonalChat = (userId: string) =>
  api.get<{ data: { id: string } }>(`/contacts/${userId}/chat`).then(r => r.data.data);
