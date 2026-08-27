import api from './axios';
import type { 
  MasterShift,
  ForceClosePayload 
} from '../types/shift';

export const shiftApi = {
  // ==========================================
  // BACKOFFICE: CASHIER SHIFTS MANAGEMENT
  // ==========================================

  /**
   * Retrieves paginated cashier shift history based on provided filters.
   * Backend mendukung pagination dan filter.
   * 
   * @param {Record<string, any>} params - Query parameters (e.g., status, user_id, shift_id, per_page, page).
   */
  getCashierShifts(params: Record<string, any> = {}) {
    return api.get('/backoffice/cashier-shifts', { params });
  },

  /**
   * Forces a hanging shift to close (Manager/Admin override).
   * 
   * @param {number} id - The ID of the hanging cashier shift session.
   * @param {ForceClosePayload} payload - Closing balance and manager notes.
   */
  forceCloseShift(id: number, payload: ForceClosePayload) {
    return api.post(`/backoffice/cashier-shifts/${id}/force-close`, payload);
  },

  // ==========================================
  // BACKOFFICE: MASTER SHIFT DATA
  // ==========================================

  /**
   * Retrieves all master shifts.
   * NOTE: Backend TIDAK mendukung pagination/filter, langsung return semua data.
   */
  getShifts() {
    return api.get('/backoffice/shifts');
  },

  /**
   * Retrieves a list of active master shifts (commonly used for dropdowns).
   */
  getActiveShifts() {
    return api.get('/backoffice/shifts/active');
  },

  /**
   * Creates a new master shift.
   * 
   * @param {Partial<MasterShift>} payload - The master shift data payload.
   */
  createShift(payload: Partial<MasterShift>) {
    return api.post('/backoffice/shifts', payload);
  },

  /**
   * Updates an existing master shift.
   * 
   * @param {number} id - The master shift ID.
   * @param {Partial<MasterShift>} payload - The master shift data to update.
   */
  updateShift(id: number, payload: Partial<MasterShift>) {
    return api.put(`/backoffice/shifts/${id}`, payload);
  },

  /**
   * Deletes a master shift.
   * 
   * @param {number} id - The master shift ID.
   */
  deleteShift(id: number) {
    return api.delete(`/backoffice/shifts/${id}`);
  }
};