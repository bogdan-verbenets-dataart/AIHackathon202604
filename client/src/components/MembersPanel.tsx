import React, { useState, useEffect } from 'react';
import { useChat } from '../store/ChatContext';
import { useAuth } from '../store/AuthContext';
import { getRoomMembers } from '../api/rooms';
import type { RoomMember } from '../types';
import PresenceIndicator from './PresenceIndicator';
import ManageRoomModal from './ManageRoomModal';

export default function MembersPanel() {
  const { chats, activeChatId, presence } = useChat();
  const { user } = useAuth();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showManage, setShowManage] = useState(false);

  const activeChat = chats.find(c => c.id === activeChatId);
  const isRoom = activeChat?.type === 'room';
  const roomId = activeChat?.roomId;

  useEffect(() => {
    if (!isRoom || !roomId) {
      setMembers([]);
      return;
    }
    getRoomMembers(roomId).then(setMembers).catch(() => setMembers([]));
  }, [isRoom, roomId]);

  const currentUserMember = members.find(m => m.id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'admin' || isOwner;

  if (!activeChat) return null;

  return (
    <div className="members-panel">
      <div style={{ padding: '12px 12px 8px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{isRoom ? `Members (${members.length})` : 'Info'}</span>
        {isRoom && isAdmin && roomId && (
          <button
            onClick={() => setShowManage(true)}
            style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
          >
            Manage
          </button>
        )}
      </div>

      <div style={{ padding: '8px 0' }}>
        {isRoom ? (
          members.map(member => (
            <div key={member.id} style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <PresenceIndicator status={presence[member.id] ?? member.presence} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.role === 'owner' && <span title="Owner">👑 </span>}
                  {member.role === 'admin' && <span title="Admin">⭐ </span>}
                  {member.username}
                  {member.id === user?.id && <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>(you)</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '8px 12px', fontSize: 13, color: '#555' }}>
            <div style={{ marginBottom: 4 }}><strong>{activeChat.name}</strong></div>
            <div style={{ fontSize: 12, color: '#999' }}>Direct Message</div>
          </div>
        )}
      </div>

      {showManage && roomId && (
        <ManageRoomModal
          roomId={roomId}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
