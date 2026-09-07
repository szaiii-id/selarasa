export type ShiftStatus = 'open' | 'closed';

export interface User {
  id: string;
  name: string;
  username: string;
  role?: string;
  is_active?: boolean;
}

export interface MasterShift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CashierShift {
  id: number;
  user_id: string;
  shift_id: number;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  variance: number | null;
  status: ShiftStatus;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  shift?: MasterShift;
  user?: User;
  closed_by_user?: User;
}

export interface StartShiftPayload {
  shift_id: number;
  opening_balance: number;
  pin_code: string;
  notes?: string;
}

export interface CloseShiftPayload {
  expected_balance: number;
  closing_balance: number;
  pin_code: string;
  notes?: string;
}

export interface HandoverShiftPayload {
  to_user_id: string;
  to_user_pin: string;
  pin_code: string;
  amount_counted: number;
  notes?: string;
}