import api from './axios';
import type { Session } from '../types';

export const listSessions = () =>
  api.get<{ data: Session[] }>('/sessions').then(r => r.data.data);

export const deleteSession = (id: string) =>
  api.delete(`/sessions/${id}`).then(r => r.data);
