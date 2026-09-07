import api from './axios';
import type { 
  CashierShift, 
  StartShiftPayload, 
  CloseShiftPayload, 
  HandoverShiftPayload,
  MasterShift,
  User,
} from '@/types/shift';

export const shiftApi = {
  getCurrentPosShift() {
    return api.get<{ data: CashierShift }>('/pos/shifts/current');
  },

  startPosShift(payload: StartShiftPayload) {
    return api.post<{ data: CashierShift }>('/pos/shifts/start', payload);
  },

  closePosShift(id: number, payload: CloseShiftPayload) {
    return api.post<{ data: CashierShift }>(`/pos/shifts/${id}/close`, payload);
  },

  handoverPosShift(id: number, payload: HandoverShiftPayload) {
    return api.post<{ data: CashierShift }>(`/pos/shifts/${id}/handover`, payload);
  },

  getActiveMasterShifts() {
    return api.get<{ data: MasterShift[] }>('/pos/master-shifts');
  },

  getActiveCashiers() {
    return api.get<{ data: User[] }>('/pos/active-cashiers');
  }
};