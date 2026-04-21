import api from './axios';
import type { User } from '../types';

export const register = (data: { email: string; username: string; password: string }) =>
  api.post<{ data: User }>('/auth/register', data).then(r => r.data.data);

export const login = (data: { email: string; password: string }) =>
  api.post<{ data: { user: User; session: unknown } }>('/auth/login', data).then(r => r.data.data);

export const logout = () =>
  api.post('/auth/logout').then(r => r.data);

export const getMe = () =>
  api.get<{ data: User }>('/auth/me').then(r => r.data.data);

export const forgotPassword = (email: string) =>
  api.post<{ data: { token: string } }>('/auth/forgot-password', { email }).then(r => r.data.data);

export const resetPassword = (token: string, newPassword: string) =>
  api.post('/auth/reset-password', { token, newPassword }).then(r => r.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then(r => r.data);
