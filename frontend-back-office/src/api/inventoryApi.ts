
import api from './axios';
import type { 
  RawMaterialCategoryPayload, 
  RawMaterialCategoryFilters,
  RawMaterialPayload, 
  RawMaterialFilters,
  StockMovementPayload, 
  StockMovementFilters 
} from '../types/inventory';

export const inventoryApi = {
  /**
   * ==========================================
   * RAW MATERIAL CATEGORIES
   * ==========================================
   */
  getCategories(params: RawMaterialCategoryFilters = {}) {
    return api.get('/backoffice/inventory/categories', { params });
  },

  getCategoryById(id: number) {
    return api.get(`/backoffice/inventory/categories/${id}`);
  },

  createCategory(payload: RawMaterialCategoryPayload) {
    return api.post('/backoffice/inventory/categories', payload);
  },

  updateCategory(id: number, payload: RawMaterialCategoryPayload) {
    return api.put(`/backoffice/inventory/categories/${id}`, payload);
  },

  deleteCategory(id: number) {
    return api.delete(`/backoffice/inventory/categories/${id}`);
  },

  /**
   * ==========================================
   * RAW MATERIALS
   * ==========================================
   */
  getMaterials(params: RawMaterialFilters = {}) {
    return api.get('/backoffice/inventory/materials', { params });
  },

  getMaterialById(id: number) {
    return api.get(`/backoffice/inventory/materials/${id}`);
  },

  createMaterial(payload: RawMaterialPayload) {
    return api.post('/backoffice/inventory/materials', payload);
  },

  /**
   * Updates or soft-deactivates a raw material.
   * (Destroy is strictly forbidden on the backend).
   */
  updateMaterial(id: number, payload: RawMaterialPayload) {
    return api.put(`/backoffice/inventory/materials/${id}`, payload);
  },

  /**
   * ==========================================
   * STOCK MOVEMENTS
   * ==========================================
   */
  getMovements(params: StockMovementFilters = {}) {
    return api.get('/backoffice/inventory/movements', { params });
  },

  /**
   * Records a new stock movement.
   * (Update and Delete are strictly forbidden for audit integrity).
   */
  createMovement(payload: StockMovementPayload) {
    return api.post('/backoffice/inventory/movements', payload);
  }
};