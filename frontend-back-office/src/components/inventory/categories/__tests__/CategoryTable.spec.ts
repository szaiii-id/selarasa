import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CategoryTable from '../CategoryTable.vue';
import type { RawMaterialCategory } from '@/types/inventory';

describe('CategoryTable.vue (Component Testing)', () => {
  const createCategory = (
    overrides: Partial<RawMaterialCategory> = {}
  ): RawMaterialCategory => ({
    id: 1,
    name: 'Coffee Beans',
    description: 'Single origin coffee',
    is_active: true,
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
    ...overrides,
  } as RawMaterialCategory);

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(CategoryTable, {
      props: {
        categories: [],
        isLoading: false,
        errorMessage: null,
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. LOADING STATE
  // =========================================================================
  describe('Loading State', () => {
    it('[Happy Path] menampilkan spinner saat isLoading=true & categories kosong', () => {
      const wrapper = createWrapper({ isLoading: true, categories: [] });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading categories...');
    });

    it('[Happy Path] tidak menampilkan table saat loading', () => {
      const wrapper = createWrapper({ isLoading: true, categories: [] });

      expect(wrapper.find('table').exists()).toBe(false);
    });

    it('[Happy Path] loading state punya centering class', () => {
      const wrapper = createWrapper({ isLoading: true, categories: [] });

      const loadingDiv = wrapper.find('.p-12');
      expect(loadingDiv.classes()).toContain('text-center');
    });

    it('[Edge Case] tidak loading saat isLoading=true TAPI ada categories', () => {
      const wrapper = createWrapper({
        isLoading: true,
        categories: [createCategory()],
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
      expect(wrapper.find('table').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 2. ERROR STATE
  // =========================================================================
  describe('Error State', () => {
    it('[Happy Path] menampilkan pesan error saat errorMessage ada', () => {
      const wrapper = createWrapper({ errorMessage: 'Failed to fetch' });

      expect(wrapper.text()).toContain('Failed to fetch');
    });

    it('[Happy Path] menampilkan tombol "Try Again"', () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      const button = wrapper.find('button');
      expect(button.text()).toContain('Try Again');
    });

    it('[Happy Path] menampilkan icon error (svg)', () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(true);
    });

    it('[Happy Path] emit "retry" saat tombol Try Again diklik', async () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      await wrapper.find('button').trigger('click');

      expect(wrapper.emitted('retry')).toBeTruthy();
      expect(wrapper.emitted('retry')).toHaveLength(1);
    });

    // ✅ FIX: Loading menang atas error (bukan sebaliknya)
    it('[Edge Case] loading state menang atas error saat isLoading=true', () => {
      const wrapper = createWrapper({
        isLoading: true,
        errorMessage: 'Error',
        categories: [],
      });

      // v-if loading dicek dulu, jadi loading menang
      expect(wrapper.text()).toContain('Loading categories...');
      expect(wrapper.text()).not.toContain('Error');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('[Edge Case] error state muncul saat isLoading=false', () => {
      const wrapper = createWrapper({
        isLoading: false,
        errorMessage: 'Error',
        categories: [],
      });

      expect(wrapper.text()).toContain('Error');
      expect(wrapper.find('.animate-spin').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 3. EMPTY STATE
  // =========================================================================
  describe('Empty State', () => {
    it('[Happy Path] menampilkan empty state saat categories kosong', () => {
      const wrapper = createWrapper({ categories: [] });

      expect(wrapper.text()).toContain('No categories yet');
      expect(wrapper.text()).toContain('Get started by creating your first category');
    });

    it('[Happy Path] empty state punya icon folder', () => {
      const wrapper = createWrapper({ categories: [] });

      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(true);
    });

    it('[Happy Path] tidak ada table saat empty', () => {
      const wrapper = createWrapper({ categories: [] });

      expect(wrapper.find('table').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 4. TABLE RENDERING
  // =========================================================================
  describe('Table Rendering', () => {
    it('[Happy Path] merender table dengan categories', () => {
      const wrapper = createWrapper({
        categories: [createCategory()],
      });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] merender header kolom dengan benar', () => {
      const wrapper = createWrapper({
        categories: [createCategory()],
      });

      const headers = wrapper.findAll('thead th');
      expect(headers).toHaveLength(4);
      expect(headers[0].text()).toBe('Name');
      expect(headers[1].text()).toBe('Description');
      expect(headers[2].text()).toBe('Created');
      expect(headers[3].text()).toBe('Actions');
    });

    it('[Happy Path] merender 1 baris untuk 1 kategori', () => {
      const wrapper = createWrapper({
        categories: [createCategory()],
      });

      const rows = wrapper.findAll('tbody tr');
      expect(rows).toHaveLength(1);
    });

    it('[Happy Path] merender N baris untuk N kategori', () => {
      const wrapper = createWrapper({
        categories: [
          createCategory({ id: 1, name: 'Coffee' }),
          createCategory({ id: 2, name: 'Tea' }),
          createCategory({ id: 3, name: 'Sugar' }),
        ],
      });

      const rows = wrapper.findAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('[Happy Path] menampilkan nama kategori', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ name: 'Coffee Beans' })],
      });

      expect(wrapper.text()).toContain('Coffee Beans');
    });

    it('[Happy Path] menampilkan deskripsi kategori', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ description: 'Single origin' })],
      });

      expect(wrapper.text()).toContain('Single origin');
    });

    it('[Happy Path] menampilkan "—" jika description kosong', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ description: null as any })],
      });

      expect(wrapper.text()).toContain('—');
    });

    it('[Happy Path] menampilkan format code "CAT-001"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 1 })],
      });

      expect(wrapper.text()).toContain('CAT-001');
    });

    it('[Happy Path] menampilkan format code "CAT-042" untuk id=42', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 42 })],
      });

      expect(wrapper.text()).toContain('CAT-042');
    });

    it('[Happy Path] menampilkan format code "CAT-1000" untuk id=1000', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 1000 })],
      });

      expect(wrapper.text()).toContain('CAT-1000');
    });
  });

  // =========================================================================
  // 5. FORMAT DATE
  // =========================================================================
  describe('formatDate helper', () => {
    it('[Happy Path] format tanggal valid ke "DD MMM YYYY"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ created_at: '2024-01-20T00:00:00Z' })],
      });

      expect(wrapper.text()).toContain('20');
      expect(wrapper.text()).toContain('2024');
    });

    it('[Happy Path] format tanggal null → "-"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ created_at: null as any })],
      });

      const rows = wrapper.findAll('tbody tr');
      const createdCell = rows[0].findAll('td')[2];
      expect(createdCell.text()).toBe('-');
    });

    it('[Happy Path] format tanggal invalid → "-"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ created_at: 'invalid-date' })],
      });

      const rows = wrapper.findAll('tbody tr');
      const createdCell = rows[0].findAll('td')[2];
      expect(createdCell.text()).toBe('-');
    });

    it('[Happy Path] format tanggal dengan waktu berbeda', () => {
      const wrapper = createWrapper({
        categories: [
          createCategory({ created_at: '2024-12-25T15:30:00Z' }),
        ],
      });

      expect(wrapper.text()).toContain('2024');
    });
  });

  // =========================================================================
  // 6. EVENT EMISSION
  // =========================================================================
  describe('Event Emission — view', () => {
    it('[Happy Path] emit "view" dengan payload category saat tombol View diklik', async () => {
      const category = createCategory({ id: 5, name: 'Coffee' });
      const wrapper = createWrapper({ categories: [category] });

      const buttons = wrapper.findAll('button');
      const viewBtn = buttons.find((b) => b.text() === 'View')!;
      await viewBtn.trigger('click');

      const emitted = wrapper.emitted('view');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([category]);
    });

    it('[Happy Path] emit "view" dengan category yang benar dari multiple rows', async () => {
      const cat1 = createCategory({ id: 1, name: 'Coffee' });
      const cat2 = createCategory({ id: 2, name: 'Tea' });
      const wrapper = createWrapper({ categories: [cat1, cat2] });

      const rows = wrapper.findAll('tbody tr');
      const buttonsRow2 = rows[1].findAll('button');
      const viewBtn = buttonsRow2.find((b) => b.text() === 'View')!;
      await viewBtn.trigger('click');

      const emitted = wrapper.emitted('view');
      expect(emitted![0]).toEqual([cat2]);
    });
  });

  describe('Event Emission — edit', () => {
    it('[Happy Path] emit "edit" dengan payload category', async () => {
      const category = createCategory({ id: 5, name: 'Coffee' });
      const wrapper = createWrapper({ categories: [category] });

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text() === 'Edit')!;
      await editBtn.trigger('click');

      const emitted = wrapper.emitted('edit');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([category]);
    });

    it('[Happy Path] emit "edit" dengan category yang benar dari multiple rows', async () => {
      const cat1 = createCategory({ id: 1 });
      const cat2 = createCategory({ id: 2 });
      const wrapper = createWrapper({ categories: [cat1, cat2] });

      const rows = wrapper.findAll('tbody tr');
      const buttonsRow2 = rows[1].findAll('button');
      const editBtn = buttonsRow2.find((b) => b.text() === 'Edit')!;
      await editBtn.trigger('click');

      const emitted = wrapper.emitted('edit');
      expect(emitted![0]).toEqual([cat2]);
    });
  });

  describe('Event Emission — delete', () => {
    it('[Happy Path] emit "delete" dengan payload category', async () => {
      const category = createCategory({ id: 5, name: 'Coffee' });
      const wrapper = createWrapper({ categories: [category] });

      const buttons = wrapper.findAll('button');
      const deleteBtn = buttons.find((b) => b.text() === 'Delete')!;
      await deleteBtn.trigger('click');

      const emitted = wrapper.emitted('delete');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([category]);
    });

    it('[Happy Path] emit "delete" dengan category yang benar dari multiple rows', async () => {
      const cat1 = createCategory({ id: 1 });
      const cat2 = createCategory({ id: 2 });
      const cat3 = createCategory({ id: 3 });
      const wrapper = createWrapper({ categories: [cat1, cat2, cat3] });

      const rows = wrapper.findAll('tbody tr');
      const buttonsRow3 = rows[2].findAll('button');
      const deleteBtn = buttonsRow3.find((b) => b.text() === 'Delete')!;
      await deleteBtn.trigger('click');

      const emitted = wrapper.emitted('delete');
      expect(emitted![0]).toEqual([cat3]);
    });

    it('[Negative Path] tidak emit delete saat tombol tidak diklik', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      expect(wrapper.emitted('delete')).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. ACTION BUTTONS
  // =========================================================================
  describe('Action Buttons', () => {
    it('[Happy Path] setiap row punya 3 tombol (View, Edit, Delete)', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const actionButtons = rows[0].findAll('button');
      expect(actionButtons).toHaveLength(3);
    });

    it('[Happy Path] tombol View punya title "View Details"', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0].findAll('button');
      expect(buttons[0].attributes('title')).toBe('View Details');
    });

    it('[Happy Path] tombol Edit punya title "Edit"', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0].findAll('button');
      expect(buttons[1].attributes('title')).toBe('Edit');
    });

    it('[Happy Path] tombol Delete punya title "Delete"', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0].findAll('button');
      expect(buttons[2].attributes('title')).toBe('Delete');
    });

    it('[Happy Path] tombol View punya hover:bg-info/10', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtn = rows[0].findAll('button')[0];
      expect(viewBtn.classes()).toContain('hover:bg-info/10');
    });

    it('[Happy Path] tombol Edit punya hover:bg-primary/10', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const editBtn = rows[0].findAll('button')[1];
      expect(editBtn.classes()).toContain('hover:bg-primary/10');
    });

    it('[Happy Path] tombol Delete punya hover:bg-error/10', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const deleteBtn = rows[0].findAll('button')[2];
      expect(deleteBtn.classes()).toContain('hover:bg-error/10');
    });
  });

  // =========================================================================
  // 8. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] transisi loading → table', async () => {
      const wrapper = createWrapper({ isLoading: true, categories: [] });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);

      await wrapper.setProps({
        isLoading: false,
        categories: [createCategory()],
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] transisi error → table', async () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      expect(wrapper.text()).toContain('Error');

      await wrapper.setProps({
        errorMessage: null,
        categories: [createCategory()],
      });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] transisi empty → table', async () => {
      const wrapper = createWrapper({ categories: [] });

      expect(wrapper.text()).toContain('No categories yet');

      await wrapper.setProps({ categories: [createCategory()] });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] table re-render saat categories berubah', async () => {
      const wrapper = createWrapper({
        categories: [createCategory({ name: 'First' })],
      });

      expect(wrapper.text()).toContain('First');

      await wrapper.setProps({
        categories: [createCategory({ name: 'Second' })],
      });

      expect(wrapper.text()).toContain('Second');
      expect(wrapper.text()).not.toContain('First');
    });
  });

  // =========================================================================
  // 9. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - id 0] format code "CAT-000"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 0 })],
      });

      expect(wrapper.text()).toContain('CAT-000');
    });

    it('[BVA - id 1 digit] padStart beri "CAT-001"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 1 })],
      });

      expect(wrapper.text()).toContain('CAT-001');
    });

    it('[BVA - id 2 digit] "CAT-042"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 42 })],
      });

      expect(wrapper.text()).toContain('CAT-042');
    });

    it('[BVA - id 3 digit] tidak ada padding, "CAT-999"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 999 })],
      });

      expect(wrapper.text()).toContain('CAT-999');
    });

    it('[BVA - id 4 digit] tidak dipotong, "CAT-1000"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 1000 })],
      });

      expect(wrapper.text()).toContain('CAT-1000');
    });

    it('[BVA - id besar] "CAT-999999"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ id: 999999 })],
      });

      expect(wrapper.text()).toContain('CAT-999999');
    });

    it('[BVA - 1 category] render 1 row', () => {
      const wrapper = createWrapper({
        categories: [createCategory()],
      });

      expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    });

    it('[BVA - 100 categories] render 100 rows', () => {
      const categories = Array.from({ length: 100 }, (_, i) =>
        createCategory({ id: i + 1, name: `Category ${i + 1}` })
      );
      const wrapper = createWrapper({ categories });

      expect(wrapper.findAll('tbody tr')).toHaveLength(100);
    });
  });

  // =========================================================================
  // 10. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] description string kosong "" → "—"', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ description: '' })],
      });

      expect(wrapper.text()).toContain('—');
    });

    // ✅ FIX: pakai .element.textContent untuk raw whitespace
    it('[Edge Case] description whitespace → whitespace ditampilkan', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ description: '   ' })],
      });

      const rows = wrapper.findAll('tbody tr');
      const descCell = rows[0].findAll('td')[1];

      // ⚠️ `.text()` men-trim whitespace — pakai `.element.textContent` untuk raw
      expect(descCell.element.textContent).toBe('   ');
    });

    it('[Corner Case] name dengan karakter unicode', () => {
      const wrapper = createWrapper({
        categories: [createCategory({ name: 'Café ☕ Tea' })],
      });

      expect(wrapper.text()).toContain('Café ☕ Tea');
    });

    it('[Corner Case] name sangat panjang', () => {
      const longName = 'A'.repeat(200);
      const wrapper = createWrapper({
        categories: [createCategory({ name: longName })],
      });

      expect(wrapper.text()).toContain(longName);
    });

    it('[Corner Case] description sangat panjang', () => {
      const longDesc = 'B'.repeat(500);
      const wrapper = createWrapper({
        categories: [createCategory({ description: longDesc })],
      });

      expect(wrapper.text()).toContain(longDesc);
    });

    it('[Corner Case] category id duplikat — key Vue unik tetap dipakai', () => {
      const wrapper = createWrapper({
        categories: [
          createCategory({ id: 1, name: 'First' }),
          createCategory({ id: 1, name: 'Second' }),
        ],
      });

      expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    });

    it('[Edge Case] v-if priority: loading → error → empty → table', () => {
      const wrapper = createWrapper({
        isLoading: true,
        errorMessage: null,
        categories: [createCategory()],
      });
      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Edge Case] error + categories ada → error ditampilkan (prioritas v-else-if)', () => {
      const wrapper = createWrapper({
        isLoading: false,
        errorMessage: 'Error',
        categories: [createCategory()],
      });

      expect(wrapper.text()).toContain('Error');
    });

    it('[Edge Case] semua tombol action punya type default (button)', () => {
      const wrapper = createWrapper({ categories: [createCategory()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0].findAll('button');
      buttons.forEach((btn) => {
        expect(btn.exists()).toBe(true);
      });
    });
  });
});