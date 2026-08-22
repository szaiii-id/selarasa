import api from './axios';
import type { UserPayload, UserFilters } from '../types/user';

export const userApi = {
  getUsers(params: UserFilters = {}) {
    return api.get('/backoffice/users', { params });
  },

  getUserById(id: string) {
    return api.get(`/backoffice/users/${id}`);
  },

  createUser(payload: UserPayload) {
    return api.post('/backoffice/users', payload);
  },

  updateUser(id: string, payload: Partial<UserPayload>) {
    return api.put(`/backoffice/users/${id}`, payload);
  },

  deactivateUser(id: string) {
    return api.patch(`/backoffice/users/${id}/deactivate`);
  },

  activateUser(id: string) {
    return api.patch(`/backoffice/users/${id}/activate`);
  },

  deleteUser(id: string) {
    return api.delete(`/backoffice/users/${id}`);
  }
};