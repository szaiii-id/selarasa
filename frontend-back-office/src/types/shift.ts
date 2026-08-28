/**
 * Defines the possible statuses for a cashier shift session.
 */
export type ShiftStatus = 'open' | 'closed';

/**
 * Represents the master shift data (e.g., Morning, Evening, Night).
 */
export interface MasterShift {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Represents an individual cashier's shift session for backoffice monitoring.
 */
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
    user?: {
        id: string;
        name: string;
        username: string;
    };
    closed_by_user?: { 
        id: string;
        name: string;
        username: string;
    };
}

/**
 * Payload required for a manager to force close a hanging shift.
 */
export interface ForceClosePayload {
    expected_balance: number;
    closing_balance?: number;
    notes?: string;
}

/**
 * Standard API Response wrapper.
 */
export interface ApiResponse<T> {
    message: string;
    data: T;
}

/**
 * Standard Paginated API Response wrapper.
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}