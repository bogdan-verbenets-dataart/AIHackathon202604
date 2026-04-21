import React, { useEffect, useRef } from 'react';
import { useChat } from '../store/ChatContext';
import type { Message } from '../types';
import MessageItem from './MessageItem';

interface Props {
  chatId: string;
  messages: Message[];
}

export default function MessageList({ chatId, messages }: Props) {
  const { loadMoreMessages } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const loadingMore = useRef(false);

  // Auto-scroll to bottom on new messages if near bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = async () => {
    const el = containerRef.current;
    if (!el) return;

    // Track if near bottom
    isNearBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;

    // Infinite scroll: load more when scrolled to top
    if (el.scrollTop < 100 && !loadingMore.current) {
      loadingMore.current = true;
      const prevScrollHeight = el.scrollHeight;
      try {
        await loadMoreMessages(chatId);
        // Maintain scroll position
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight - prevScrollHeight;
          }
        });
      } finally {
        loadingMore.current = false;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="message-list"
      onScroll={handleScroll}
    >
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '32px 0', fontSize: 14 }}>
          No messages yet. Be the first to say something!
        </div>
      )}
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
}
