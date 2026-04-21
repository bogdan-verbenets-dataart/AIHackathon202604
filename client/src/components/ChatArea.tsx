import React, { useState, useEffect } from 'react';
import { useChat } from '../store/ChatContext';
import { useAuth } from '../store/AuthContext';
import { joinRoom, leaveRoom } from '../api/rooms';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ManageRoomModal from './ManageRoomModal';

export default function ChatArea() {
  const { chats, activeChatId, messages, loadingMessages, refreshChats } = useChat();
  const { user } = useAuth();
  const [showManage, setShowManage] = useState(false);

  const activeChat = chats.find(c => c.id === activeChatId);

  if (!activeChatId || !activeChat) {
    return (
      <div className="chat-area" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Select a room or contact to start chatting</div>
          <div style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>Use the sidebar to navigate</div>
        </div>
      </div>
    );
  }

  const chatMessages = messages[activeChatId] ?? [];

  return (
    <div className="chat-area">
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {activeChat.type === 'room' ? `# ${activeChat.name}` : `@ ${activeChat.name}`}
          </div>
        </div>
        {activeChat.type === 'room' && activeChat.roomId && (
          <button
            onClick={() => setShowManage(true)}
            style={{ fontSize: 12, padding: '4px 10px', background: 'none', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }}
          >
            ⚙ Manage
          </button>
        )}
      </div>

      {/* Messages */}
      {loadingMessages ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          Loading messages...
        </div>
      ) : (
        <MessageList chatId={activeChatId} messages={chatMessages} />
      )}

      {/* Input */}
      <MessageInput chatId={activeChatId} />

      {showManage && activeChat.roomId && (
        <ManageRoomModal
          roomId={activeChat.roomId}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
