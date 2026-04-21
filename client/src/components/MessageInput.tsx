import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../store/ChatContext';
import { uploadAttachment } from '../api/attachments';
import type { Message, Attachment } from '../types';

interface Props {
  chatId: string;
}

export default function MessageInput({ chatId }: Props) {
  const { sendMessage } = useChat();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, [content]);

  const handleSend = async () => {
    const text = content.trim();
    if (!text && pendingAttachments.length === 0) return;
    setUploading(true);
    try {
      let attachmentIds: string[] = [];
      if (pendingAttachments.length > 0) {
        const uploaded = await Promise.all(pendingAttachments.map(uploadAttachment));
        attachmentIds = uploaded.map((a: Attachment) => a.id);
      }
      await sendMessage(chatId, text, replyTo?.id, attachmentIds.length > 0 ? attachmentIds : undefined);
      setContent('');
      setReplyTo(null);
      setPendingAttachments([]);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      e.preventDefault();
      setPendingAttachments(prev => [...prev, ...files]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setPendingAttachments(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  return (
    <div className="message-input-area">
      {/* Reply bar */}
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#f0f8ff', borderRadius: 4, marginBottom: 6, fontSize: 13 }}>
          <span>↩ Replying to <strong>{replyTo.author.username}</strong>: {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '…' : ''}</span>
          <button onClick={() => setReplyTo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Pending attachments */}
      {pendingAttachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {pendingAttachments.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e8f4fd', border: '1px solid #bee3f8', borderRadius: 4, padding: '3px 8px', fontSize: 12 }}>
              <span>📎 {f.name}</span>
              <button
                onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: 4, padding: '7px 10px', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
          title="Attach file"
        >
          📎
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid #dee2e6',
            borderRadius: 4,
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.5,
            maxHeight: 100,
            overflowY: 'auto',
          }}
        />

        <button
          onClick={handleSend}
          disabled={uploading || (!content.trim() && pendingAttachments.length === 0)}
          style={{
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontSize: 14,
            flexShrink: 0,
            opacity: uploading || (!content.trim() && pendingAttachments.length === 0) ? 0.5 : 1,
          }}
        >
          {uploading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// Export setter so parent can set replyTo
export { MessageInput };
