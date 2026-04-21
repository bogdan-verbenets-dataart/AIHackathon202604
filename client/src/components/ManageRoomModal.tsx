import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import {
  getRoomMembers,
  getRoomBans,
  banUser,
  unbanUser,
  inviteUser,
  addAdmin,
  removeAdmin,
  updateRoom,
  deleteRoom,
} from '../api/rooms';
import { searchUsers } from '../api/users';
import { useChat } from '../store/ChatContext';
import type { RoomMember, RoomBan } from '../types';

interface Props {
  roomId: string;
  onClose: () => void;
}

type Tab = 'members' | 'admins' | 'bans' | 'invite' | 'settings';

export default function ManageRoomModal({ roomId, onClose }: Props) {
  const { user } = useAuth();
  const { chats, refreshChats, setActiveChatId } = useChat();
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [bans, setBans] = useState<RoomBan[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Settings state
  const chat = chats.find(c => c.roomId === roomId);
  const [roomName, setRoomName] = useState(chat?.name ?? '');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomPublic, setRoomPublic] = useState(true);
  const [settingsMsg, setSettingsMsg] = useState('');

  const currentMember = members.find(m => m.id === user?.id);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin' || isOwner;

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, b] = await Promise.all([getRoomMembers(roomId), getRoomBans(roomId)]);
      setMembers(m);
      setBans(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [roomId]);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    const results = await searchUsers(searchQ);
    setSearchResults(results);
  };

  const handleBan = async (userId: string) => {
    await banUser(roomId, userId);
    await loadData();
  };

  const handleUnban = async (userId: string) => {
    await unbanUser(roomId, userId);
    await loadData();
  };

  const handleInvite = async (userId: string) => {
    await inviteUser(roomId, userId);
  };

  const handleAddAdmin = async (userId: string) => {
    await addAdmin(roomId, userId);
    await loadData();
  };

  const handleRemoveAdmin = async (userId: string) => {
    await removeAdmin(roomId, userId);
    await loadData();
  };

  const handleSaveSettings = async () => {
    setSettingsMsg('');
    try {
      await updateRoom(roomId, { name: roomName, description: roomDesc, isPublic: roomPublic });
      await refreshChats();
      setSettingsMsg('Settings saved!');
    } catch {
      setSettingsMsg('Failed to save settings.');
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm('Are you sure you want to delete this room? This cannot be undone.')) return;
    try {
      await deleteRoom(roomId);
      await refreshChats();
      setActiveChatId(null);
      onClose();
    } catch {
      alert('Failed to delete room.');
    }
  };

  const admins = members.filter(m => m.role === 'admin');
  const nonAdminMembers = members.filter(m => m.role === 'member');

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ minWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Manage Room</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div className="modal-tabs">
          {(['members', 'admins', 'bans', 'invite', 'settings'] as Tab[]).map(t => (
            <button key={t} className={`modal-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>Loading...</div>}

        {/* Members Tab */}
        {!loading && tab === 'members' && (
          <div>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ flex: 1, fontSize: 14 }}>
                  {m.role === 'owner' && '👑 '}{m.role === 'admin' && '⭐ '}{m.username}
                  {m.id === user?.id && <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>(you)</span>}
                </span>
                <span style={{ fontSize: 12, color: '#888' }}>{m.role}</span>
                {isAdmin && m.id !== user?.id && m.role === 'member' && (
                  <>
                    {isOwner && (
                      <button onClick={() => handleAddAdmin(m.id)} style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }}>
                        Make Admin
                      </button>
                    )}
                    <button onClick={() => handleBan(m.id)} style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #f5c6cb', color: '#e74c3c', background: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      Ban
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Admins Tab */}
        {!loading && tab === 'admins' && (
          <div>
            {admins.length === 0 && <div style={{ color: '#999', fontSize: 13 }}>No admins.</div>}
            {admins.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ flex: 1, fontSize: 14 }}>⭐ {m.username}</span>
                {isOwner && (
                  <button onClick={() => handleRemoveAdmin(m.id)} style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #f5c6cb', color: '#e74c3c', background: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Remove Admin
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bans Tab */}
        {!loading && tab === 'bans' && (
          <div>
            {bans.length === 0 && <div style={{ color: '#999', fontSize: 13 }}>No banned users.</div>}
            {bans.map(ban => (
              <div key={ban.user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{ban.user.username}</span>
                <span style={{ fontSize: 12, color: '#888' }}>by {ban.bannedBy.username}</span>
                {isAdmin && (
                  <button onClick={() => handleUnban(ban.user.id)} style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }}>
                    Unban
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite Tab */}
        {!loading && tab === 'invite' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username..."
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
              />
              <button onClick={handleSearch} style={{ padding: '7px 14px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                Search
              </button>
            </div>
            {searchResults.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{u.username}</span>
                <button onClick={() => handleInvite(u.id)} style={{ fontSize: 11, padding: '2px 8px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Invite
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {!loading && tab === 'settings' && (
          <div>
            <div className="form-group">
              <label>Room Name</label>
              <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" value={roomDesc} onChange={e => setRoomDesc(e.target.value)} />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={roomPublic} onChange={e => setRoomPublic(e.target.checked)} style={{ width: 'auto' }} />
                Public room
              </label>
            </div>
            {settingsMsg && <div style={{ fontSize: 13, marginBottom: 8, color: settingsMsg.includes('Failed') ? '#e74c3c' : '#27ae60' }}>{settingsMsg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveSettings} className="btn-primary" style={{ flex: 1 }}>
                Save Settings
              </button>
              {isOwner && (
                <button
                  onClick={handleDeleteRoom}
                  style={{ flex: 1, background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, padding: '10px 20px', cursor: 'pointer' }}
                >
                  Delete Room
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
