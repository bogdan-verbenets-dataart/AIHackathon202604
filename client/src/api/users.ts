import api from './axios';

export const searchUsers = (q: string) =>
  api.get<{ data: { id: string; username: string }[] }>('/users/search', { params: { q } }).then(r => r.data.data);
