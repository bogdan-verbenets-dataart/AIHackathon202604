import React, { useState, useEffect } from 'react';
import { useChat } from '../store/ChatContext';
import { useAuth } from '../store/AuthContext';
import { getPersonalChat, listIncomingRequests, respondToRequest, listFriends, sendFriendRequest } from '../api/contacts';
import type { Friend, FriendRequest } from '../types';
import PresenceIndicator from './PresenceIndicator';
import UnreadBadge from './UnreadBadge';
import CreateRoomModal from './CreateRoomModal';
import JoinRoomModal from './JoinRoomModal';

interface AddFriendModalProps {
  onClose: () => void;
}

function AddFriendModal({ onClose }: AddFriendModalProps) {
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendFriendRequest(recipientId, message || undefined);
      setStatus('Friend request sent!');
      setTimeout(onClose, 1000);
    } catch {
      setStatus('Failed to send request.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ minWidth: 340 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Add Friend</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              required
              placeholder="Enter user ID"
            />
          </div>
          <div className="form-group">
            <label>Message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hey, let's chat!"
            />
          </div>
          {status && <div style={{ fontSize: 13, marginBottom: 8, color: status.includes('Failed') ? '#e74c3c' : '#27ae60' }}>{status}</div>}
          <button type="submit" className="btn-primary">Send Request</button>
        </form>
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          You need the exact user ID. Search users via the API at /api/users/search.
          {user && <span> Your ID: <strong>{user.id}</strong></span>}
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { chats, unread, setActiveChatId, activeChatId, refreshChats } = useChat();
  const { presence } = useChat();
  const [search, setSearch] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    listFriends().then(setFriends).catch(() => {});
    listIncomingRequests().then(setFriendRequests).catch(() => {});
  }, []);

  const roomChats = chats.filter(c => c.type === 'room');
  const personalChats = chats.filter(c => c.type === 'personal');

  const filteredRooms = roomChats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredPersonal = personalChats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleOpenPersonalChat = async (friendId: string) => {
    try {
      const { id } = await getPersonalChat(friendId);
      await refreshChats();
      setActiveChatId(id);
    } catch {
      // ignore
    }
  };

  const handleRespondRequest = async (id: string, action: 'accept' | 'reject') => {
    try {
      await respondToRequest(id, action);
      setFriendRequests(prev => prev.filter(r => r.id !== id));
      if (action === 'accept') {
        listFriends().then(setFriends).catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="sidebar">
        <div style={{ padding: '12px 10px 8px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '6px 10px', color: 'white', fontSize: 13 }}
          />
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div style={{ padding: '0 10px 8px' }}>
            <button
              onClick={() => setShowRequests(v => !v)}
              style={{ width: '100%', background: '#e74c3c', border: 'none', color: 'white', borderRadius: 4, padding: '6px 10px', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
            >
              📬 Friend Requests ({friendRequests.length})
            </button>
            {showRequests && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: 8, marginTop: 4 }}>
                {friendRequests.map(req => (
                  <div key={req.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>{req.requester.username}</div>
                    {req.message && <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{req.message}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleRespondRequest(req.id, 'accept')} style={{ flex: 1, background: '#27ae60', border: 'none', color: 'white', borderRadius: 4, padding: '3px 0', fontSize: 12, cursor: 'pointer' }}>Accept</button>
                      <button onClick={() => handleRespondRequest(req.id, 'reject')} style={{ flex: 1, background: '#555', border: 'none', color: 'white', borderRadius: 4, padding: '3px 0', fontSize: 12, cursor: 'pointer' }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rooms section */}
        <div style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.5, textTransform: 'uppercase' }}>Rooms</div>
        {filteredRooms.length === 0 && (
          <div style={{ padding: '4px 12px', fontSize: 12, opacity: 0.5 }}>No rooms yet</div>
        )}
        {filteredRooms.map(chat => (
          <div
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            style={{
              padding: '7px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeChatId === chat.id ? 'rgba(255,255,255,0.15)' : undefined,
              borderRadius: 4,
              margin: '1px 6px',
            }}
          >
            <span style={{ fontSize: 16 }}>#</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{chat.name}</span>
            <UnreadBadge count={unread[chat.id] ?? 0} />
          </div>
        ))}

        {/* Contacts section */}
        <div style={{ padding: '8px 10px 4px', fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.5, textTransform: 'uppercase', marginTop: 8 }}>Direct Messages</div>

        {/* Friends with presence */}
        {friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase())).map(friend => {
          const personalChat = personalChats.find(c => c.name === friend.username);
          return (
            <div
              key={friend.id}
              onClick={() => handleOpenPersonalChat(friend.id)}
              style={{
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: personalChat && activeChatId === personalChat.id ? 'rgba(255,255,255,0.15)' : undefined,
                borderRadius: 4,
                margin: '1px 6px',
              }}
            >
              <PresenceIndicator status={presence[friend.id] ?? friend.presence} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{friend.username}</span>
              {personalChat && <UnreadBadge count={unread[personalChat.id] ?? 0} />}
            </div>
          );
        })}

        {/* Personal chats not in friends list */}
        {filteredPersonal
          .filter(c => !friends.some(f => f.username === c.name))
          .map(chat => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              style={{
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: activeChatId === chat.id ? 'rgba(255,255,255,0.15)' : undefined,
                borderRadius: 4,
                margin: '1px 6px',
              }}
            >
              <span style={{ fontSize: 12 }}>👤</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{chat.name}</span>
              <UnreadBadge count={unread[chat.id] ?? 0} />
            </div>
          ))}

        {/* Bottom buttons */}
        <div style={{ marginTop: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => setShowCreateRoom(true)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 4, padding: '7px 10px', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
          >
            ＋ Create Room
          </button>
          <button
            onClick={() => setShowJoinRoom(true)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 4, padding: '7px 10px', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
          >
            🔍 Browse Rooms
          </button>
          <button
            onClick={() => setShowAddFriend(true)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 4, padding: '7px 10px', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
          >
            ＋ Add Friend
          </button>
        </div>
      </div>

      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onCreated={() => { setShowCreateRoom(false); refreshChats(); }}
        />
      )}
      {showJoinRoom && (
        <JoinRoomModal
          onClose={() => setShowJoinRoom(false)}
          onJoined={() => { setShowJoinRoom(false); refreshChats(); }}
        />
      )}
      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} />
      )}
    </>
  );
}
