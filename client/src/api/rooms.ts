import api from './axios';
import type { Room, RoomMember, RoomBan } from '../types';

export const listRooms = () =>
  api.get<{ data: Room[] }>('/rooms').then(r => r.data.data);

export const createRoom = (data: { name: string; description: string; isPublic: boolean }) =>
  api.post<{ data: Room }>('/rooms', data).then(r => r.data.data);

export const getRoom = (id: string) =>
  api.get<{ data: Room }>(`/rooms/${id}`).then(r => r.data.data);

export const updateRoom = (id: string, data: Partial<{ name: string; description: string; isPublic: boolean }>) =>
  api.put<{ data: Room }>(`/rooms/${id}`, data).then(r => r.data.data);

export const deleteRoom = (id: string) =>
  api.delete(`/rooms/${id}`).then(r => r.data);

export const joinRoom = (id: string) =>
  api.post(`/rooms/${id}/join`).then(r => r.data);

export const leaveRoom = (id: string) =>
  api.post(`/rooms/${id}/leave`).then(r => r.data);

export const getRoomMembers = (id: string) =>
  api.get<{ data: RoomMember[] }>(`/rooms/${id}/members`).then(r => r.data.data);

export const getRoomBans = (id: string) =>
  api.get<{ data: RoomBan[] }>(`/rooms/${id}/bans`).then(r => r.data.data);

export const banUser = (roomId: string, userId: string) =>
  api.post(`/rooms/${roomId}/bans/${userId}`).then(r => r.data);

export const unbanUser = (roomId: string, userId: string) =>
  api.delete(`/rooms/${roomId}/bans/${userId}`).then(r => r.data);

export const inviteUser = (roomId: string, userId: string) =>
  api.post(`/rooms/${roomId}/invites/${userId}`).then(r => r.data);

export const addAdmin = (roomId: string, userId: string) =>
  api.post(`/rooms/${roomId}/admins/${userId}`).then(r => r.data);

export const removeAdmin = (roomId: string, userId: string) =>
  api.delete(`/rooms/${roomId}/admins/${userId}`).then(r => r.data);
