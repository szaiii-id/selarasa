import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryApi } from '../inventoryApi';
import api from '../axios';
import type {
  RawMaterialCategoryPayload,
  RawMaterialCategoryFilters,
  RawMaterialPayload,
  RawMaterialFilters,
  StockMovementPayload,
  StockMovementFilters,
} from '@/types/inventory';

// Mocking instance axios agar tidak melakukan request HTTP sungguhan
vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('inventoryApi Service (Fokus Logika Parameter & API Wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    // ---------- RAW MATERIAL CATEGORIES ----------
    it('Happy Path: getCategories() memanggil endpoint GET dengan params lengkap', () => {
      const params: RawMaterialCategoryFilters = { search: 'bahan', is_active: true, page: 1 };

      inventoryApi.getCategories(params);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/categories', { params });
    });

    it('Happy Path: getCategories() tanpa params otomatis menggunakan object kosong default {}', () => {
      inventoryApi.getCategories();

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/categories', { params: {} });
    });

    it('Happy Path: getCategoryById() memanggil endpoint GET dengan ID spesifik', () => {
      inventoryApi.getCategoryById(42);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/categories/42');
    });

    it('Happy Path: createCategory() memanggil endpoint POST dengan payload yang benar', () => {
      const payload: RawMaterialCategoryPayload = {
        name: 'Bahan Kering',
        description: 'Kategori bahan kering',
        is_active: true,
      };

      inventoryApi.createCategory(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/categories', payload);
    });

    it('Happy Path: updateCategory() memanggil endpoint PUT dengan ID dan payload', () => {
      const id = 7;
      const payload: RawMaterialCategoryPayload = { name: 'Updated Category', is_active: false };

      inventoryApi.updateCategory(id, payload);

      expect(api.put).toHaveBeenCalledWith('/backoffice/inventory/categories/7', payload);
    });

    it('Happy Path: deleteCategory() memanggil endpoint DELETE dengan ID', () => {
      inventoryApi.deleteCategory(99);

      expect(api.delete).toHaveBeenCalledWith('/backoffice/inventory/categories/99');
    });

    // ---------- RAW MATERIALS ----------
    it('Happy Path: getMaterials() memanggil endpoint GET dengan params lengkap', () => {
      const params: RawMaterialFilters = { search: 'gula', category_id: 1, page: 2 };

      inventoryApi.getMaterials(params);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/materials', { params });
    });

    it('Happy Path: getMaterials() tanpa params otomatis menggunakan object kosong default {}', () => {
      inventoryApi.getMaterials();

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/materials', { params: {} });
    });

    it('Happy Path: getMaterialById() memanggil endpoint GET dengan ID spesifik', () => {
      inventoryApi.getMaterialById(15);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/materials/15');
    });

    it('Happy Path: createMaterial() memanggil endpoint POST dengan payload yang benar', () => {
      const payload: RawMaterialPayload = {
        name: 'Gula Pasir',
        category_id: 1,
        unit: 'kg',
        minimum_stock: 10,
      };

      inventoryApi.createMaterial(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/materials', payload);
    });

    it('Happy Path: updateMaterial() memanggil endpoint PUT dengan ID dan payload (soft-deactivate juga lewat sini)', () => {
      const id = 15;
      const payload: RawMaterialPayload = { name: 'Gula Pasir Premium', is_active: false };

      inventoryApi.updateMaterial(id, payload);

      expect(api.put).toHaveBeenCalledWith('/backoffice/inventory/materials/15', payload);
    });

    // ---------- STOCK MOVEMENTS ----------
    it('Happy Path: getMovements() memanggil endpoint GET dengan params lengkap', () => {
      const params: StockMovementFilters = {
        material_id: 3,
        type: 'in',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      };

      inventoryApi.getMovements(params);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/movements', { params });
    });

    it('Happy Path: getMovements() tanpa params otomatis menggunakan object kosong default {}', () => {
      inventoryApi.getMovements();

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/movements', { params: {} });
    });

    it('Happy Path: createMovement() memanggil endpoint POST dengan payload yang benar', () => {
      const payload: StockMovementPayload = {
        material_id: 3,
        type: 'in',
        quantity: 100,
        notes: 'Restock dari supplier',
      };

      inventoryApi.createMovement(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/movements', payload);
    });

    // ---------- NEGATIVE PATH ----------
    it('Negative Path: Error dari axios diteruskan apa adanya (tidak ditelan oleh service)', async () => {
      const mockError = new Error('Network Error');
      vi.mocked(api.delete).mockRejectedValueOnce(mockError);

      await expect(inventoryApi.deleteCategory(1)).rejects.toThrow('Network Error');
    });

    it('Negative Path: createMovement() meneruskan error dari axios (misal validasi stok gagal)', async () => {
      const mockError = new Error('Insufficient stock');
      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      const payload: StockMovementPayload = {
        material_id: 3,
        type: 'out',
        quantity: 9999,
        notes: 'Overdraft',
      };

      await expect(inventoryApi.createMovement(payload)).rejects.toThrow('Insufficient stock');
    });

    it('Negative Path: getMaterialById() meneruskan error 404 dari axios', async () => {
      const mockError = new Error('Not Found');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(inventoryApi.getMaterialById(999)).rejects.toThrow('Not Found');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('Partisi 1 (Tanpa Parameter): getMovements() otomatis menggunakan object kosong default {}', () => {
      inventoryApi.getMovements();

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/movements', { params: {} });
    });

    it('Partisi 2 (Dengan Parameter Penuh): getMovements() meneruskan semua filter', () => {
      const filters: StockMovementFilters = {
        material_id: 5,
        type: 'out',
        date_from: '2024-02-01',
        date_to: '2024-02-28',
      };

      inventoryApi.getMovements(filters);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/movements', { params: filters });
    });

    it('Partisi 3 (Payload Lengkap): createMaterial() menerima semua field RawMaterialPayload', () => {
      const fullPayload: RawMaterialPayload = {
        name: 'Tepung Terigu',
        category_id: 1,
        unit: 'kg',
        minimum_stock: 20,
        is_active: true,
      };

      inventoryApi.createMaterial(fullPayload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/materials', fullPayload);
    });

    it('Partisi 4 (Payload Parsial): updateMaterial() menerima Partial<RawMaterialPayload>', () => {
      const partialPayload = { minimum_stock: 50 };

      inventoryApi.updateMaterial(15, partialPayload);

      expect(api.put).toHaveBeenCalledWith('/backoffice/inventory/materials/15', partialPayload);
    });

    it('Partisi 5 (Soft-Deactivate): updateMaterial() dengan is_active=false memakai endpoint PUT (bukan DELETE)', () => {
      inventoryApi.updateMaterial(15, { is_active: false });

      expect(api.put).toHaveBeenCalledWith('/backoffice/inventory/materials/15', { is_active: false });
      // Destroy benar-benar dilarang di backend
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('Partisi 6 (Movement Type): createMovement() menerima tipe "in" maupun "out"', () => {
      const movementIn: StockMovementPayload = { material_id: 1, type: 'in', quantity: 50 };
      const movementOut: StockMovementPayload = { material_id: 1, type: 'out', quantity: 30 };

      inventoryApi.createMovement(movementIn);
      inventoryApi.createMovement(movementOut);

      expect(api.post).toHaveBeenNthCalledWith(1, '/backoffice/inventory/movements', movementIn);
      expect(api.post).toHaveBeenNthCalledWith(2, '/backoffice/inventory/movements', movementOut);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('Batas Bawah ID (0): getCategoryById() dengan ID 0', () => {
      inventoryApi.getCategoryById(0);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/categories/0');
    });

    it('Batas Bawah ID (0): deleteCategory() dengan ID 0', () => {
      inventoryApi.deleteCategory(0);

      expect(api.delete).toHaveBeenCalledWith('/backoffice/inventory/categories/0');
    });

    it('Batas Bawah ID (0): getMaterialById() dengan ID 0', () => {
      inventoryApi.getMaterialById(0);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/materials/0');
    });

    it('Batas Bawah Payload: createCategory() dengan object kosong {}', () => {
      inventoryApi.createCategory({} as RawMaterialCategoryPayload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/categories', {});
    });

    it('Batas Bawah Payload: createMovement() dengan quantity 0 (falsy)', () => {
      const payload: StockMovementPayload = {
        material_id: 1,
        type: 'in',
        quantity: 0,
        notes: 'Zero quantity test',
      };

      inventoryApi.createMovement(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/movements', payload);
    });

    it('Batas Atas ID (Number.MAX_SAFE_INTEGER): updateCategory() dengan ID besar', () => {
      const maxId = Number.MAX_SAFE_INTEGER;
      const payload: RawMaterialCategoryPayload = { name: 'Max ID Category' };

      inventoryApi.updateCategory(maxId, payload);

      expect(api.put).toHaveBeenCalledWith(
        `/backoffice/inventory/categories/${maxId}`,
        payload
      );
    });

    it('Batas Atas ID (Number.MAX_SAFE_INTEGER): getMaterialById() dengan ID besar', () => {
      const maxId = Number.MAX_SAFE_INTEGER;

      inventoryApi.getMaterialById(maxId);

      expect(api.get).toHaveBeenCalledWith(`/backoffice/inventory/materials/${maxId}`);
    });

    it('Batas Atas Stok: createMovement() dengan quantity besar', () => {
      const payload: StockMovementPayload = {
        material_id: 1,
        type: 'in',
        quantity: 1_000_000,
        notes: 'Bulk import',
      };

      inventoryApi.createMovement(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/movements', payload);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('Edge Case: getCategories() menerima filter dengan nilai undefined', () => {
      const cornerFilters = { search: undefined, is_active: true } as any;

      inventoryApi.getCategories(cornerFilters);

      // Object diteruskan apa adanya; Axios akan membuang key undefined saat query string
      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/categories', {
        params: cornerFilters,
      });
    });

    it('Edge Case: getMovements() dengan params empty string pada semua filter', () => {
      const emptyParams = { type: '', date_from: '', date_to: '' };

      inventoryApi.getMovements(emptyParams as any);

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/movements', {
        params: emptyParams,
      });
    });

    it('Corner Case: createMovement() dengan payload hanya field wajib (notes opsional)', () => {
      const minimalPayload: StockMovementPayload = {
        material_id: 1,
        type: 'in',
        quantity: 100,
      };

      inventoryApi.createMovement(minimalPayload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/movements', minimalPayload);
    });

    it('Corner Case: createMovement() menerima payload dengan notes berisi string kosong', () => {
      const payload: StockMovementPayload = {
        material_id: 1,
        type: 'out',
        quantity: 5,
        notes: '',
      };

      inventoryApi.createMovement(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/movements', payload);
    });

    it('Corner Case: updateMaterial() dengan payload yang mengandung null', () => {
      const payload = { name: null, minimum_stock: null } as any;

      inventoryApi.updateMaterial(15, payload);

      expect(api.put).toHaveBeenCalledWith('/backoffice/inventory/materials/15', payload);
    });

    it('Corner Case: createCategory() dengan payload bernilai 0 pada field numerik', () => {
      const payload = { name: 'Zero Category', sort_order: 0 } as any;

      inventoryApi.createCategory(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/inventory/categories', payload);
    });

    it('Corner Case: getMovements() dengan filter material_id = 0 (batas bawah filter)', () => {
      inventoryApi.getMovements({ material_id: 0 });

      expect(api.get).toHaveBeenCalledWith('/backoffice/inventory/movements', {
        params: { material_id: 0 },
      });
    });

    it('Corner Case: updateCategory() dengan ID negatif (URL tetap terangkai apa adanya)', () => {
      inventoryApi.updateCategory(-1, { name: 'Negative ID' });

      expect(api.put).toHaveBeenCalledWith('/backoffice/inventory/categories/-1', {
        name: 'Negative ID',
      });
    });
  });
});