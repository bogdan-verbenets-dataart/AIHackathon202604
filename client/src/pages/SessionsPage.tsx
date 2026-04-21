import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listSessions, deleteSession } from '../api/sessions';
import type { Session } from '../types';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch {
      setError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {
      setError('Failed to revoke session.');
    }
  };

  const sorted = [...sessions].sort((a, b) =>
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ color: '#3498db', fontSize: 14 }}>← Back to Chat</Link>
      </div>
      <div style={{ background: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 24 }}>Active Sessions</h2>
        {error && <div className="error-msg">{error}</div>}
        {loading ? (
          <div>Loading sessions...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Created</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Last Used</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>IP Address</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>User Agent</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((session, idx) => (
                  <tr key={session.id} style={{ background: idx === 0 ? '#f0f8ff' : undefined }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                      {new Date(session.createdAt).toLocaleString()}
                      {idx === 0 && (
                        <span style={{ marginLeft: 6, fontSize: 11, background: '#3498db', color: 'white', borderRadius: 4, padding: '1px 6px' }}>Current</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                      {new Date(session.lastUsedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                      {session.ipAddress ?? '—'}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.userAgent ?? '—'}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                      <button
                        onClick={() => handleRevoke(session.id)}
                        style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>No active sessions.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
