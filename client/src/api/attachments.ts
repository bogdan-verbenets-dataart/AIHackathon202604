import api from './axios';
import type { Attachment } from '../types';

export const uploadAttachment = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<{ data: Attachment }>('/attachments/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data);
};

export const getAttachmentUrl = (id: string) => `/api/attachments/${id}`;
