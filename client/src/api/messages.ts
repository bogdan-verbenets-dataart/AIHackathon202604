import api from './axios';
import type { Chat, Message } from '../types';

export const listChats = () =>
  api.get<{ data: Chat[] }>('/chats').then(r => r.data.data);

export const getMessages = (chatId: string, before?: string, limit = 50) =>
  api.get<{ data: Message[] }>(`/chats/${chatId}/messages`, { params: { before, limit } }).then(r => r.data.data);

export const sendMessage = (chatId: string, data: { content: string; replyToId?: string; attachmentIds?: string[] }) =>
  api.post<{ data: Message }>(`/chats/${chatId}/messages`, data).then(r => r.data.data);

export const editMessage = (id: string, content: string) =>
  api.put<{ data: Message }>(`/messages/${id}`, { content }).then(r => r.data.data);

export const deleteMessage = (id: string) =>
  api.delete(`/messages/${id}`).then(r => r.data);

export const markChatRead = (chatId: string) =>
  api.post(`/chats/${chatId}/read`).then(r => r.data);
