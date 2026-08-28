/**
 * Available user roles in the system.
 */
export type UserRole = 'admin' | 'manager' | 'inventory' | 'cashier';

/**
 * User resource representation returned by the API.
 */
export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  /** Format: YYYY-MM-DD */
  joined_at: string | null;
  account_age?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
}

/**
 * Payload for creating or updating a user.
 */
export interface UserPayload {
  name: string;
  username: string;
  /** Required on creation. Omit during update to keep the existing password. */
  password?: string;
  role: UserRole;
  is_active?: boolean;
}

/**
 * Query parameters for filtering and paginating the user list.
 */
export interface UserFilters {
  search?: string;
  role?: UserRole | '';
  is_active?: boolean | '';
  page?: number;
  per_page?: number;
}

/**
 * State for managing filter values in the UI components (Non-optional).
 */
export interface UserFilterState {
  search: string;
  role: UserRole | '';
  is_active: boolean | '';
  page: number;
}