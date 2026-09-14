import type { UserRole } from './user';

/**
 * ==========================================
 * RAW MATERIAL CATEGORY
 * ==========================================
 */

/**
 * Raw Material Category resource representation returned by the API.
 */
export interface RawMaterialCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Payload for creating or updating a raw material category.
 */
export interface RawMaterialCategoryPayload {
  name: string;
  description?: string | null;
}

/**
 * Query parameters for filtering and paginating the category list.
 */
export interface RawMaterialCategoryFilters {
  keyword?: string;
  page?: number;
  per_page?: number;
  all?: 'true' | 'false';
}

/**
 * State for managing filter values in the UI components.
 */
export interface RawMaterialCategoryFilterState {
  keyword: string;
  page: number;
}

/**
 * ==========================================
 * RAW MATERIAL
 * ==========================================
 */

/**
 * Raw Material resource representation returned by the API.
 */
export interface RawMaterial {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
  is_low_stock: boolean;
  
  category?: RawMaterialCategory;
  
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Payload for creating or updating a raw material.
 */
export interface RawMaterialPayload {
  category_id: number | '';
  sku: string;
  name: string;
  unit: string;
  minimum_stock: number | '';
  is_active?: boolean;
}

/**
 * Query parameters for filtering and paginating the raw material list.
 */
export interface RawMaterialFilters {
  search?: string;
  category_id?: number | '';
  is_active?: boolean | '';
  is_low_stock?: boolean | '';
  is_out_of_stock?: boolean | '';
  page?: number;
  per_page?: number;
}

/**
 * State for managing filter values in the UI components.
 */
export interface RawMaterialFilterState {
  search: string;
  category_id: number | '';
  is_active: boolean | '';
  is_low_stock: boolean | '';
  is_out_of_stock: boolean | ''; 
  page: number;
}

/**
 * ==========================================
 * STOCK MOVEMENT (AUDIT TRAIL)
 * ==========================================
 */

/**
 * Available movement types for stock adjustments.
 */
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

/**
 * Stock Movement resource representation returned by the API.
 */
export interface StockMovement {
  id: number;
  raw_material_id: number;
  user_id: string;
  movement_type: MovementType;
  
  quantity: number;
  balance_before: number;
  balance_after: number;
  
  reason: string;
  reference_id: string | null;
  
  created_at: string | null;
  created_at_human: string | null;
  
  raw_material?: RawMaterial;
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
}

/**
 * Payload for creating a new stock movement.
 * Note: Stock movements are immutable and cannot be updated.
 */
export interface StockMovementPayload {
  raw_material_id: number | '';
  movement_type: MovementType | '';
  quantity: number | '';
  reason: string;
  reference_id?: string | null;
}

/**
 * Query parameters for filtering and paginating the stock movement list.
 */
export interface StockMovementFilters {
  raw_material_id?: number | '';
  movement_type?: MovementType | '';
  user_id?: string | '';
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

/**
 * State for managing filter values in the UI components.
 */
export interface StockMovementFilterState {
  raw_material_id: number | '';
  movement_type: MovementType | '';
  start_date: string;
  end_date: string;
  page: number;
}