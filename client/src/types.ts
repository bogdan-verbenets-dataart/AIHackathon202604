export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  memberCount?: number;
  _count?: { members: number };
}

export interface RoomMember {
  id: string;
  username: string;
  role: 'owner' | 'admin' | 'member';
  presence: 'online' | 'afk' | 'offline';
}

export interface RoomBan {
  user: { id: string; username: string };
  bannedBy: { id: string; username: string };
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  author: { id: string; username: string };
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  replyTo: Message | null;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface Chat {
  id: string;
  type: 'room' | 'personal';
  name: string;
  unread: number;
  lastMessage?: Message;
  roomId?: string;
}

export interface Friend {
  id: string;
  username: string;
  presence: 'online' | 'afk' | 'offline';
  friendshipId: string;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  requester: { id: string; username: string };
  message: string | null;
  createdAt: string;
}

export type PresenceStatus = 'online' | 'afk' | 'offline';
