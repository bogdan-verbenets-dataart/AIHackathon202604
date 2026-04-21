import React, { useState } from 'react';
import { useChat } from '../store/ChatContext';
import { useAuth } from '../store/AuthContext';
import type { Message } from '../types';
import { getAttachmentUrl } from '../api/attachments';

interface Props {
  message: Message;
}

const AVATAR_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22'];

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageItem({ message }: Props) {
  const { editMessage, deleteMessage } = useChat();
  const { user } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isAuthor = user?.id === message.author.id;
  const isDeleted = !!message.deletedAt;

  const handleEdit = async () => {
    if (editContent.trim() === message.content) {
      setEditing(false);
      return;
    }
    await editMessage(message.id, editContent.trim());
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === 'Escape') {
      setEditContent(message.content);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this message?')) {
      await deleteMessage(message.id);
    }
  };

  return (
    <div
      className="message-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {/* Avatar */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: getAvatarColor(message.author.username),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0,
        alignSelf: 'flex-start',
        marginTop: 2,
      }}>
        {message.author.username[0].toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Reply quote */}
        {message.replyTo && (
          <div style={{ borderLeft: '3px solid #ccc', paddingLeft: 8, marginBottom: 4, color: '#888', fontSize: 12 }}>
            <strong>{message.replyTo.author.username}:</strong> {message.replyTo.content.slice(0, 80)}{message.replyTo.content.length > 80 ? '…' : ''}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{message.author.username}</span>
          <span style={{ fontSize: 11, color: '#999' }}>{formatTime(message.createdAt)}</span>
          {message.editedAt && <span style={{ fontSize: 11, color: '#bbb' }}>(edited)</span>}
        </div>

        {/* Content */}
        {isDeleted ? (
          <div style={{ color: '#999', fontStyle: 'italic', fontSize: 13 }}>This message was deleted</div>
        ) : editing ? (
          <div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{ width: '100%', borderRadius: 4, border: '1px solid #3498db', padding: '4px 8px', fontSize: 14, resize: 'none', minHeight: 60 }}
            />
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Enter to save · Esc to cancel</div>
          </div>
        ) : (
          <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {message.attachments.map(att => (
              att.mimeType.startsWith('image/') ? (
                <a key={att.id} href={getAttachmentUrl(att.id)} target="_blank" rel="noreferrer">
                  <img
                    src={getAttachmentUrl(att.id)}
                    alt={att.originalName}
                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4, border: '1px solid #dee2e6' }}
                  />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={getAttachmentUrl(att.id)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#f0f2f5', borderRadius: 4, fontSize: 13, color: '#3498db', border: '1px solid #dee2e6' }}
                >
                  📎 {att.originalName}
                </a>
              )
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && isAuthor && !isDeleted && !editing && (
        <div style={{ position: 'absolute', right: 8, top: 4, display: 'flex', gap: 4 }}>
          <button
            onClick={() => { setEditing(true); setEditContent(message.content); }}
            title="Edit"
            style={{ background: '#f0f2f5', border: '1px solid #dee2e6', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer' }}
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            title="Delete"
            style={{ background: '#fff0f0', border: '1px solid #f5c6cb', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer' }}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
