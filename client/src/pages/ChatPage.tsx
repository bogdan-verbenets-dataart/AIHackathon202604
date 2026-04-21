import React, { useState } from 'react';
import { useChat } from '../store/ChatContext';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import MembersPanel from '../components/MembersPanel';
import '../styles/chat.css';

export default function ChatPage() {
  const { activeChatId } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [membersPanelOpen, setMembersPanelOpen] = useState(true);

  return (
    <div className="chat-layout">
      <TopNav />
      <div className="chat-body">
        {sidebarOpen && <Sidebar />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', gap: 8 }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
            >
              {sidebarOpen ? '◀ Sidebar' : '▶ Sidebar'}
            </button>
            {activeChatId && (
              <button
                onClick={() => setMembersPanelOpen(v => !v)}
                style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
              >
                {membersPanelOpen ? 'Members ▶' : 'Members ◀'}
              </button>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <ChatArea />
            {activeChatId && membersPanelOpen && <MembersPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
