import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementTable from '../MovementTable.vue';
import type { StockMovement } from '@/types/inventory';

describe('MovementTable.vue (Component Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createMovement = (overrides: Partial<StockMovement> = {}): StockMovement =>
    ({
      id: 1,
      movement_type: 'IN',
      quantity: 50,
      reason: 'Restock dari supplier',
      reference_id: null,
      balance_before: 100,
      balance_after: 150,
      created_at: '2024-01-20T10:30:45Z',
      raw_material: {
        id: 1,
        name: 'Fresh Milk UHT',
        sku: 'RM-0012-APF',
        unit: 'L',
        category: { id: 1, name: 'Dairy' },
      },
      user: {
        id: 'uuid-1',
        name: 'John Doe',
        role: 'admin',
      },
      ...overrides,
    } as StockMovement);

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MovementTable, {
      props: {
        movements: [],
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
    it('[Happy Path] menampilkan spinner saat isLoading=true & movements kosong', () => {
      const wrapper = createWrapper({ isLoading: true, movements: [] });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading stock movements...');
    });

    it('[Happy Path] tidak render table saat loading', () => {
      const wrapper = createWrapper({ isLoading: true, movements: [] });

      expect(wrapper.find('table').exists()).toBe(false);
    });

    it('[Edge Case] isLoading=true + movements ada → render table', () => {
      const wrapper = createWrapper({
        isLoading: true,
        movements: [createMovement()],
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
      expect(wrapper.find('table').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 2. ERROR STATE
  // =========================================================================
  describe('Error State', () => {
    it('[Happy Path] menampilkan pesan error', () => {
      const wrapper = createWrapper({ errorMessage: 'Failed to fetch movements' });

      expect(wrapper.text()).toContain('Failed to fetch movements');
    });

    it('[Happy Path] menampilkan tombol "Try Again"', () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      const button = wrapper.find('button');
      expect(button.text()).toContain('Try Again');
    });

    it('[Happy Path] emit "retry" saat tombol Try Again diklik', async () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      await wrapper.find('button').trigger('click');

      expect(wrapper.emitted('retry')).toHaveLength(1);
    });

    it('[Edge Case] loading menang atas error saat isLoading=true', () => {
      const wrapper = createWrapper({
        isLoading: true,
        errorMessage: 'Error',
        movements: [],
      });

      expect(wrapper.text()).toContain('Loading stock movements...');
      expect(wrapper.text()).not.toContain('Error');
    });
  });

  // =========================================================================
  // 3. EMPTY STATE
  // =========================================================================
  describe('Empty State', () => {
    it('[Happy Path] menampilkan empty state', () => {
      const wrapper = createWrapper({ movements: [] });

      expect(wrapper.text()).toContain('No movements found');
      expect(wrapper.text()).toContain('Try adjusting your filters');
    });

    it('[Happy Path] tidak render table saat empty', () => {
      const wrapper = createWrapper({ movements: [] });

      expect(wrapper.find('table').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 4. TABLE RENDERING — ✅ FIX non-null assertion
  // =========================================================================
  describe('Table Rendering', () => {
    it('[Happy Path] render table saat movements ada', () => {
      const wrapper = createWrapper({ movements: [createMovement()] });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] render 8 kolom header', () => {
      const wrapper = createWrapper({ movements: [createMovement()] });

      const headers = wrapper.findAll('thead th');
      expect(headers).toHaveLength(8);
      expect(headers[0]!.text()).toBe('When');
      expect(headers[1]!.text()).toBe('Material');
      expect(headers[2]!.text()).toBe('Type');
      expect(headers[3]!.text()).toBe('Qty');
      expect(headers[4]!.text()).toBe('Balance Flow');
      expect(headers[5]!.text()).toBe('Reason');
      expect(headers[6]!.text()).toBe('By');
      expect(headers[7]!.text()).toBe('Actions');
    });

    it('[Happy Path] render N baris untuk N movements', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ id: 1 }),
          createMovement({ id: 2 }),
          createMovement({ id: 3 }),
        ],
      });

      expect(wrapper.findAll('tbody tr')).toHaveLength(3);
    });

    it('[Happy Path] menampilkan nama material', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({
            raw_material: { id: 1, name: 'Coffee Beans', sku: 'RM-001', unit: 'kg', category: { id: 1, name: 'Beverages' } } as any,
          }),
        ],
      });

      expect(wrapper.text()).toContain('Coffee Beans');
    });

    it('[Happy Path] menampilkan SKU', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({
            raw_material: { id: 1, name: 'Coffee', sku: 'RM-TEST-001', unit: 'kg', category: { id: 1, name: 'Beverages' } } as any,
          }),
        ],
      });

      expect(wrapper.text()).toContain('RM-TEST-001');
    });

    it('[Happy Path] menampilkan reason', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ reason: 'Custom reason here' })],
      });

      expect(wrapper.text()).toContain('Custom reason here');
    });

    it('[Happy Path] menampilkan reference_id jika ada', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ reference_id: 'REF-12345' })],
      });

      expect(wrapper.text()).toContain('REF-12345');
    });

    it('[Happy Path] reference_id tidak muncul jika null', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ reference_id: null })],
      });

      expect(wrapper.text()).not.toContain('REF-');
    });
  });

  // =========================================================================
  // 5. FORMAT DATETIME — ✅ FIX non-null assertion
  // =========================================================================
  describe('formatDateTime', () => {
    it('[Happy Path] format tanggal & waktu', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ created_at: '2024-01-20T10:30:45Z' })],
      });

      expect(wrapper.text()).toContain('2024');
      expect(wrapper.text()).toContain('Jan');
    });

    it('[Happy Path] created_at null → "-"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ created_at: null as any })],
      });

      expect(wrapper.text()).toContain('-');
    });

    it('[Happy Path] created_at invalid → "-"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ created_at: 'invalid-date' })],
      });

      const row = wrapper.find('tbody tr');
      const whenCell = row.findAll('td')[0]!;
      expect(whenCell.text()).toContain('-');
    });

    it('[Happy Path] date di kolom pertama, time di kolom pertama juga', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ created_at: '2024-06-15T14:30:00Z' })],
      });

      const row = wrapper.find('tbody tr');
      const whenCell = row.findAll('td')[0]!;
      const paragraphs = whenCell.findAll('p');
      expect(paragraphs).toHaveLength(2);
    });
  });

  // =========================================================================
  // 6. TYPE BADGE
  // =========================================================================
  describe('Type Badge', () => {
    it('[Happy Path] IN → label "IN" + bg-success/10', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN' })],
      });

      const badge = wrapper.find('.bg-success\\/10');
      expect(badge.text()).toContain('IN');
    });

    it('[Happy Path] OUT → label "OUT" + bg-error/10', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'OUT' })],
      });

      const badge = wrapper.find('.bg-error\\/10');
      expect(badge.text()).toContain('OUT');
    });

    it('[Happy Path] ADJUSTMENT → label "ADJ" + bg-warning/10', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'ADJUSTMENT' })],
      });

      const badge = wrapper.find('.bg-warning\\/10');
      expect(badge.text()).toContain('ADJ');
    });

    it('[Happy Path] badge punya icon SVG arrow', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN' })],
      });

      const badge = wrapper.find('.bg-success\\/10');
      expect(badge.find('svg').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 7. QUANTITY FORMATTING
  // =========================================================================
  describe('Quantity Formatting', () => {
    it('[Happy Path] IN → "+50.00"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN', quantity: 50 })],
      });

      expect(wrapper.text()).toContain('+50.00');
    });

    it('[Happy Path] OUT → "-50.00"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'OUT', quantity: 50 })],
      });

      expect(wrapper.text()).toContain('-50.00');
    });

    it('[Happy Path] OUT dengan quantity negatif → "-50.00"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'OUT', quantity: -50 })],
      });

      expect(wrapper.text()).toContain('-50.00');
    });

    it('[Happy Path] ADJUSTMENT positif → "+25.00"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'ADJUSTMENT', quantity: 25 })],
      });

      expect(wrapper.text()).toContain('+25.00');
    });

    it('[Happy Path] ADJUSTMENT negatif → "-25.00"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'ADJUSTMENT', quantity: -25 })],
      });

      expect(wrapper.text()).toContain('-25.00');
    });

    it('[Happy Path] quantity desimal', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN', quantity: 12.5 })],
      });

      expect(wrapper.text()).toContain('+12.50');
    });

    it('[Happy Path] quantity string → Number() coercion', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN', quantity: '25.5' as any })],
      });

      expect(wrapper.text()).toContain('+25.50');
    });
  });

  // =========================================================================
  // 8. QUANTITY CLASS
  // =========================================================================
  describe('Quantity Class', () => {
    it('[Happy Path] IN → text-success', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN' })],
      });

      const qtyEl = wrapper.find('.text-success.font-mono');
      expect(qtyEl.exists()).toBe(true);
    });

    it('[Happy Path] OUT → text-error', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'OUT' })],
      });

      const qtyEl = wrapper.find('.text-error.font-mono');
      expect(qtyEl.exists()).toBe(true);
    });

    it('[Happy Path] ADJUSTMENT positif → text-success', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'ADJUSTMENT', quantity: 10 })],
      });

      const qtyEl = wrapper.find('.text-success.font-mono');
      expect(qtyEl.exists()).toBe(true);
    });

    it('[Happy Path] ADJUSTMENT negatif → text-error', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'ADJUSTMENT', quantity: -10 })],
      });

      const qtyEl = wrapper.find('.text-error.font-mono');
      expect(qtyEl.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 9. BALANCE FLOW
  // =========================================================================
  describe('Balance Flow', () => {
    it('[Happy Path] menampilkan balance_before & after', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ balance_before: 100, balance_after: 150 })],
      });

      expect(wrapper.text()).toContain('100.00');
      expect(wrapper.text()).toContain('150.00');
    });

    it('[Happy Path] format 2 desimal', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ balance_before: 100.5, balance_after: 150.75 })],
      });

      expect(wrapper.text()).toContain('100.50');
      expect(wrapper.text()).toContain('150.75');
    });

    it('[Happy Path] balance_after=0 → text-error', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ balance_after: 0 })],
      });

      const afterEl = wrapper.find('.text-error.font-bold');
      expect(afterEl.exists()).toBe(true);
    });

    it('[Happy Path] arrow antara before & after', () => {
      const wrapper = createWrapper({
        movements: [createMovement()],
      });

      const arrow = wrapper.find('.text-primary');
      expect(arrow.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 10. USER INFO
  // =========================================================================
  describe('User Info — with user', () => {
    it('[Happy Path] menampilkan nama user', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: 'Jane Smith', role: 'admin' } as any }),
        ],
      });

      expect(wrapper.text()).toContain('Jane Smith');
    });

    it('[Happy Path] menampilkan initials user', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: 'John Doe', role: 'admin' } as any }),
        ],
      });

      expect(wrapper.text()).toContain('JD');
    });

    it('[Happy Path] initials dari 1 kata', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: 'John', role: 'admin' } as any }),
        ],
      });

      expect(wrapper.text()).toContain('J');
    });

    it('[Happy Path] initials dari 3 kata → 2 huruf pertama', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: 'John Michael Doe', role: 'admin' } as any }),
        ],
      });

      expect(wrapper.text()).toContain('JM');
    });

    it('[Happy Path] avatar punya bg-primary/10 atau warna lain dari array', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: 'Test User', role: 'admin' } as any }),
        ],
      });

      const avatar = wrapper.find('.w-6.h-6.rounded-md');
      expect(avatar.exists()).toBe(true);
    });
  });

  describe('User Info — without user', () => {
    it('[Happy Path] user null → "System"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ user: null as any })],
      });

      expect(wrapper.text()).toContain('System');
    });

    it('[Happy Path] user null → icon info (bg-info/10)', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ user: null as any })],
      });

      expect(wrapper.find('.bg-info\\/10').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 11. EVENT EMISSION — view & retry — ✅ FIX double non-null assertion
  // =========================================================================
  describe('Event Emission — view', () => {
    it('[Happy Path] emit "view" dengan payload movement', async () => {
      const movement = createMovement({ id: 5 });
      const wrapper = createWrapper({ movements: [movement] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtn = rows[0]!.find('button');
      await viewBtn.trigger('click');

      const emitted = wrapper.emitted('view');
      expect(emitted![0]).toEqual([movement]);
    });

    it('[Happy Path] emit movement yang benar dari multiple rows', async () => {
      const mat1 = createMovement({ id: 1 });
      const mat2 = createMovement({ id: 2 });
      const wrapper = createWrapper({ movements: [mat1, mat2] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtn = rows[1]!.find('button');
      await viewBtn.trigger('click');

      const emitted = wrapper.emitted('view');
      expect(emitted![0]).toEqual([mat2]);
    });

    it('[Happy Path] tombol view punya title "View Details"', () => {
      const wrapper = createWrapper({ movements: [createMovement()] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtn = rows[0]!.find('button');
      expect(viewBtn.attributes('title')).toBe('View Details');
    });
  });

  // =========================================================================
  // 12. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] transisi loading → table', async () => {
      const wrapper = createWrapper({ isLoading: true, movements: [] });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);

      await wrapper.setProps({
        isLoading: false,
        movements: [createMovement()],
      });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] transisi error → table', async () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      await wrapper.setProps({
        errorMessage: null,
        movements: [createMovement()],
      });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] transisi empty → table', async () => {
      const wrapper = createWrapper({ movements: [] });

      expect(wrapper.text()).toContain('No movements found');

      await wrapper.setProps({ movements: [createMovement()] });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] table re-render saat movements berubah', async () => {
      const wrapper = createWrapper({
        movements: [createMovement({ reason: 'First' })],
      });

      expect(wrapper.text()).toContain('First');

      await wrapper.setProps({
        movements: [createMovement({ reason: 'Second' })],
      });

      expect(wrapper.text()).toContain('Second');
      expect(wrapper.text()).not.toContain('First');
    });
  });

  // =========================================================================
  // 13. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - 1 movement] render 1 row', () => {
      const wrapper = createWrapper({
        movements: [createMovement()],
      });

      expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    });

    it('[BVA - 100 movements] render 100 rows', () => {
      const movements = Array.from({ length: 100 }, (_, i) =>
        createMovement({ id: i + 1 })
      );
      const wrapper = createWrapper({ movements });

      expect(wrapper.findAll('tbody tr')).toHaveLength(100);
    });

    it('[BVA - balance_after=0] error color', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ balance_after: 0 })],
      });

      expect(wrapper.find('.text-error.font-bold').exists()).toBe(true);
    });

    it('[BVA - balance_before=0] tetap dirender', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ balance_before: 0 })],
      });

      expect(wrapper.text()).toContain('0.00');
    });

    it('[BVA - quantity=0 IN] "+0.00"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN', quantity: 0 })],
      });

      expect(wrapper.text()).toContain('+0.00');
    });
  });

  // =========================================================================
  // 14. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] material null → "Unknown Material"', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ raw_material: null as any })],
      });

      expect(wrapper.text()).toContain('Unknown Material');
    });

    it('[Edge Case] material SKU null → "—"', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({
            raw_material: { id: 1, name: 'Test', sku: null, unit: 'kg', category: null } as any,
          }),
        ],
      });

      expect(wrapper.text()).toContain('—');
    });

    it('[Corner Case] user name kosong → "??"', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: '', role: 'admin' } as any }),
        ],
      });

      expect(wrapper.text()).toContain('??');
    });

    it('[Edge Case] reason unicode', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ reason: 'Café ☕ restock' })],
      });

      expect(wrapper.text()).toContain('Café ☕ restock');
    });

    it('[Corner Case] hover:bg-white/40 ada di setiap row', () => {
      const wrapper = createWrapper({
        movements: [createMovement()],
      });

      const rows = wrapper.findAll('tbody tr');
      rows.forEach((row) => {
        expect(row.classes()).toContain('hover:bg-white/40');
      });
    });

    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('view')).toBeUndefined();
      expect(wrapper.emitted('retry')).toBeUndefined();
    });

    it('[Edge Case] multiple rows dengan tipe berbeda', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ id: 1, movement_type: 'IN' }),
          createMovement({ id: 2, movement_type: 'OUT' }),
          createMovement({ id: 3, movement_type: 'ADJUSTMENT' }),
        ],
      });

      const text = wrapper.text();
      expect(text).toContain('IN');
      expect(text).toContain('OUT');
      expect(text).toContain('ADJ');
    });

    it('[Edge Case] type badge punya class rounded-lg', () => {
      const wrapper = createWrapper({
        movements: [createMovement({ movement_type: 'IN' })],
      });

      const badge = wrapper.find('.bg-success\\/10');
      expect(badge.classes()).toContain('rounded-lg');
    });

    it('[Corner Case] avatar size w-6 h-6', () => {
      const wrapper = createWrapper({
        movements: [
          createMovement({ user: { id: '1', name: 'Test User', role: 'admin' } as any }),
        ],
      });

      const avatar = wrapper.find('.w-6.h-6.rounded-md');
      expect(avatar.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 15. INTEGRATION — Parent Component
  // ✅ FIX TS2339: explicit type untuk data() & methods this
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent handle view event', async () => {
      const Parent = {
        components: { MovementTable },
        template: `
          <MovementTable
            :movements="movements"
            :is-loading="false"
            :error-message="null"
            @view="handleView"
          />
          <span data-testid="viewed">{{ viewed ? 'yes' : 'no' }}</span>
        `,
        // ✅ FIX: explicit return type
        data(): { viewed: boolean; movements: any[] } {
          return {
            viewed: false,
            movements: [
              {
                id: 1,
                movement_type: 'IN',
                quantity: 50,
                reason: 'Test',
                reference_id: null,
                balance_before: 100,
                balance_after: 150,
                created_at: '2024-01-01T00:00:00Z',
                raw_material: {
                  id: 1,
                  name: 'Coffee',
                  sku: 'RM-001',
                  unit: 'kg',
                  category: { id: 1, name: 'Beverages' },
                },
                user: { id: '1', name: 'John Doe', role: 'admin' },
              },
            ],
          };
        },
        methods: {
          // ✅ FIX: explicit `this` type
          handleView(this: { viewed: boolean }) {
            this.viewed = true;
          },
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.find('[data-testid="viewed"]').text()).toBe('no');

      const row = wrapper.find('tbody tr');
      await row.find('button').trigger('click');

      expect(wrapper.find('[data-testid="viewed"]').text()).toBe('yes');
    });
  });
});