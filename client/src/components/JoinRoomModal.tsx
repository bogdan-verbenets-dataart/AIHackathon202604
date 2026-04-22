import React, { useState, useEffect } from 'react';
import { listRooms, joinRoom } from '../api/rooms';
import type { Room } from '../types';

interface Props {
  onClose: () => void;
  onJoined: () => void;
}

export default function JoinRoomModal({ onClose, onJoined }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    listRooms()
      .then(data => setRooms(data.filter(r => r.isPublic)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (roomId: string) => {
    setJoining(roomId);
    try {
      await joinRoom(roomId);
      onJoined();
    } catch {
      setJoining(null);
    }
  };

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ minWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Browse Public Rooms</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search rooms..."
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: 4, marginBottom: 12, fontSize: 14 }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>Loading rooms...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>No public rooms found.</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filtered.map(room => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}># {room.name}</div>
                  {room.description && <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{room.description}</div>}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{room.memberCount ?? room._count?.members ?? 0} members</div>
                </div>
                <button
                  onClick={() => handleJoin(room.id)}
                  disabled={joining === room.id}
                  style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                >
                  {joining === room.id ? 'Joining…' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
