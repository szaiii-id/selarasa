/**
 * Represents the authenticated user structure from the database.
 */
export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'inventory' | 'cashier';
  is_active: boolean;
  joined_at: string | null;
}

/**
 * Represents the authentication data payload containing the user details.
 */
export interface AuthDataPayload {
  user: User;
}

/**
 * Represents the standard API response wrapper from the backend.
 */
export interface AuthResponse {
  message: string;
  data: AuthDataPayload;
}