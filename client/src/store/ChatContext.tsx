import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { getSocket, disconnectSocket } from '../socket/socket';
import {
  listChats,
  getMessages,
  sendMessage as apiSendMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  markChatRead,
} from '../api/messages';
import { useAuth } from './AuthContext';
import type { Chat, Message, PresenceStatus } from '../types';

function getTabId(): string {
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('tabId', tabId);
  }
  return tabId;
}

interface ChatContextValue {
  chats: Chat[];
  messages: Record<string, Message[]>;
  presence: Record<string, PresenceStatus>;
  unread: Record<string, number>;
  activeChatId: string | null;
  loadingMessages: boolean;
  setActiveChatId: (id: string | null) => void;
  sendMessage: (chatId: string, content: string, replyToId?: string, attachmentIds?: string[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadMoreMessages: (chatId: string) => Promise<void>;
  addChat: (chat: Chat) => void;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue>({
  chats: [],
  messages: {},
  presence: {},
  unread: {},
  activeChatId: null,
  loadingMessages: false,
  setActiveChatId: () => {},
  sendMessage: async () => {},
  editMessage: async () => {},
  deleteMessage: async () => {},
  loadMoreMessages: async () => {},
  addChat: () => {},
  refreshChats: async () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const activeChatIdRef = useRef<string | null>(null);
  const afkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAfk = useRef(false);

  const refreshChats = useCallback(async () => {
    const data = await listChats();
    setChats(data);
    const u: Record<string, number> = {};
    data.forEach(c => { u[c.id] = c.unread; });
    setUnread(u);
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshChats();
    const socket = getSocket();
    const tabId = getTabId();

    socket.on('connect', () => {
      socket.emit('heartbeat', { tabId });
    });

    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat', { tabId });
    }, 30000);

    const resetAfkTimer = () => {
      if (isAfk.current) {
        isAfk.current = false;
        socket.emit('active', { tabId });
      }
      if (afkTimer.current) clearTimeout(afkTimer.current);
      afkTimer.current = setTimeout(() => {
        isAfk.current = true;
        socket.emit('afk', { tabId });
      }, 60000);
    };
    resetAfkTimer();
    window.addEventListener('mousemove', resetAfkTimer);
    window.addEventListener('keydown', resetAfkTimer);
    window.addEventListener('click', resetAfkTimer);

    socket.on('message:new', ({ chatId, message }: { chatId: string; message: Message }) => {
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] ?? []), message],
      }));
      setUnread(prev => ({
        ...prev,
        [chatId]: activeChatIdRef.current === chatId ? 0 : (prev[chatId] ?? 0) + 1,
      }));
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: message } : c));
    });

    socket.on('message:edited', ({ chatId, message }: { chatId: string; message: Message }) => {
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] ?? []).map(m => m.id === message.id ? message : m),
      }));
    });

    socket.on('message:deleted', ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] ?? []).filter(m => m.id !== messageId),
      }));
    });

    socket.on('presence:update', ({ userId, status }: { userId: string; status: PresenceStatus }) => {
      setPresence(prev => ({ ...prev, [userId]: status }));
    });

    socket.on('unread:update', ({ chatId, count }: { chatId: string; count: number }) => {
      setUnread(prev => ({ ...prev, [chatId]: count }));
    });

    return () => {
      clearInterval(heartbeatInterval);
      if (afkTimer.current) clearTimeout(afkTimer.current);
      window.removeEventListener('mousemove', resetAfkTimer);
      window.removeEventListener('keydown', resetAfkTimer);
      window.removeEventListener('click', resetAfkTimer);
      socket.off('connect');
      socket.off('message:new');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.off('presence:update');
      socket.off('unread:update');
      disconnectSocket();
    };
  }, [user, refreshChats]);

  const setActiveChatId = useCallback(async (id: string | null) => {
    activeChatIdRef.current = id;
    setActiveChatIdState(id);
    if (!id) return;
    const socket = getSocket();
    socket.emit('join_chat', { chatId: id });
    if (!messages[id]) {
      setLoadingMessages(true);
      try {
        const msgs = await getMessages(id);
        setMessages(prev => ({ ...prev, [id]: msgs }));
      } finally {
        setLoadingMessages(false);
      }
    }
    await markChatRead(id).catch(() => {});
    setUnread(prev => ({ ...prev, [id]: 0 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const sendMessage = useCallback(async (chatId: string, content: string, replyToId?: string, attachmentIds?: string[]) => {
    await apiSendMessage(chatId, { content, replyToId, attachmentIds });
  }, []);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    await apiEditMessage(messageId, content);
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    await apiDeleteMessage(messageId);
  }, []);

  const loadMoreMessages = useCallback(async (chatId: string) => {
    const existing = messages[chatId] ?? [];
    const before = existing[0]?.id;
    const older = await getMessages(chatId, before);
    setMessages(prev => ({
      ...prev,
      [chatId]: [...older, ...(prev[chatId] ?? [])],
    }));
  }, [messages]);

  const addChat = useCallback((chat: Chat) => {
    setChats(prev => {
      if (prev.find(c => c.id === chat.id)) return prev;
      return [...prev, chat];
    });
  }, []);

  return (
    <ChatContext.Provider value={{
      chats,
      messages,
      presence,
      unread,
      activeChatId,
      loadingMessages,
      setActiveChatId,
      sendMessage,
      editMessage,
      deleteMessage,
      loadMoreMessages,
      addChat,
      refreshChats,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
