import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementDetailModal from '../MovementDetailModal.vue';
import type { StockMovement } from '@/types/inventory';

describe('MovementDetailModal.vue (Component Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createMovement = (overrides: Partial<StockMovement> = {}): StockMovement =>
    ({
      id: 100,
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
    return mount(MovementDetailModal, {
      props: {
        isOpen: true,
        movement: createMovement(),
        ...props,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] tidak render saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] tidak render saat movement=null', () => {
      const wrapper = createWrapper({ isOpen: true, movement: null });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] render modal saat isOpen=true && movement ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.fixed').exists()).toBe(true);
      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Happy Path] menampilkan Movement ID', () => {
      const wrapper = createWrapper({
        movement: createMovement({ id: 999 }),
      });

      expect(wrapper.text()).toContain('Movement #999');
    });

    it('[Happy Path] menampilkan nama material', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          raw_material: {
            id: 1,
            name: 'Premium Coffee',
            sku: 'RM-001',
            unit: 'kg',
            category: { id: 1, name: 'Beverages' },
          } as any,
        }),
      });

      expect(wrapper.text()).toContain('Premium Coffee');
    });

    it('[Happy Path] menampilkan SKU material', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          raw_material: {
            id: 1,
            name: 'Coffee',
            sku: 'RM-UNIQUE-001',
            unit: 'kg',
            category: { id: 1, name: 'Beverages' },
          } as any,
        }),
      });

      expect(wrapper.text()).toContain('RM-UNIQUE-001');
    });

    it('[Happy Path] menampilkan nama kategori material', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          raw_material: {
            id: 1,
            name: 'Coffee',
            sku: 'RM-001',
            unit: 'kg',
            category: { id: 1, name: 'Beverages' },
          } as any,
        }),
      });

      expect(wrapper.text()).toContain('Beverages');
    });

    it('[Happy Path] menampilkan reason', () => {
      const wrapper = createWrapper({
        movement: createMovement({ reason: 'Custom reason here' }),
      });

      expect(wrapper.text()).toContain('Custom reason here');
    });
  });

  // =========================================================================
  // 2. TYPE META — IN / OUT / ADJUSTMENT
  // =========================================================================
  describe('Type Meta — IN', () => {
    it('[Happy Path] IN → label "Stock In"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN' }),
      });

      expect(wrapper.text()).toContain('Stock In');
    });

    it('[Happy Path] IN → description "Material received into warehouse"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN' }),
      });

      expect(wrapper.text()).toContain('Material received into warehouse');
    });

    it('[Happy Path] IN → icon bg bg-success/10', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN' }),
      });

      expect(wrapper.find('.bg-success\\/10').exists()).toBe(true);
    });

    it('[Happy Path] IN → text-success color', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN' }),
      });

      expect(wrapper.find('.text-success').exists()).toBe(true);
    });
  });

  describe('Type Meta — OUT', () => {
    it('[Happy Path] OUT → label "Stock Out"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'OUT' }),
      });

      expect(wrapper.text()).toContain('Stock Out');
    });

    it('[Happy Path] OUT → description "Material issued from warehouse"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'OUT' }),
      });

      expect(wrapper.text()).toContain('Material issued from warehouse');
    });

    it('[Happy Path] OUT → icon bg bg-error/10', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'OUT' }),
      });

      expect(wrapper.find('.bg-error\\/10').exists()).toBe(true);
    });
  });

  describe('Type Meta — ADJUSTMENT', () => {
    it('[Happy Path] ADJUSTMENT → label "Adjustment"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT' }),
      });

      expect(wrapper.text()).toContain('Adjustment');
    });

    it('[Happy Path] ADJUSTMENT → description "Manual correction after stock opname"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT' }),
      });

      expect(wrapper.text()).toContain('Manual correction after stock opname');
    });

    it('[Happy Path] ADJUSTMENT → icon bg bg-warning/10', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT' }),
      });

      expect(wrapper.find('.bg-warning\\/10').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 3. QUANTITY FORMATTING
  // =========================================================================
  describe('Quantity Formatting', () => {
    it('[Happy Path] IN → "+50.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN', quantity: 50 }),
      });

      expect(wrapper.text()).toContain('+50.00');
    });

    it('[Happy Path] OUT → "-50.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'OUT', quantity: 50 }),
      });

      expect(wrapper.text()).toContain('-50.00');
    });

    it('[Happy Path] OUT dengan quantity negatif → tetap "-50.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'OUT', quantity: -50 }),
      });

      expect(wrapper.text()).toContain('-50.00');
    });

    it('[Happy Path] ADJUSTMENT positif → "+25.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT', quantity: 25 }),
      });

      expect(wrapper.text()).toContain('+25.00');
    });

    it('[Happy Path] ADJUSTMENT negatif → "-25.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT', quantity: -25 }),
      });

      expect(wrapper.text()).toContain('-25.00');
    });

    it('[Happy Path] quantity desimal → "+12.50"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN', quantity: 12.5 }),
      });

      expect(wrapper.text()).toContain('+12.50');
    });

    it('[Happy Path] unit ditampilkan setelah quantity', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          quantity: 50,
          raw_material: {
            id: 1,
            name: 'Milk',
            sku: 'RM-001',
            unit: 'L',
            category: { id: 1, name: 'Dairy' },
          } as any,
        }),
      });

      expect(wrapper.text()).toContain('L');
    });
  });

  // =========================================================================
  // 4. QUANTITY CLASS
  // =========================================================================
  describe('Quantity Class', () => {
    it('[Happy Path] IN → text-success', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN' }),
      });

      const qtyEl = wrapper.find('.text-3xl');
      expect(qtyEl.classes()).toContain('text-success');
    });

    it('[Happy Path] OUT → text-error', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'OUT' }),
      });

      const qtyEl = wrapper.find('.text-3xl');
      expect(qtyEl.classes()).toContain('text-error');
    });

    it('[Happy Path] ADJUSTMENT positif → text-success', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT', quantity: 10 }),
      });

      const qtyEl = wrapper.find('.text-3xl');
      expect(qtyEl.classes()).toContain('text-success');
    });

    it('[Happy Path] ADJUSTMENT negatif → text-error', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'ADJUSTMENT', quantity: -10 }),
      });

      const qtyEl = wrapper.find('.text-3xl');
      expect(qtyEl.classes()).toContain('text-error');
    });
  });

  // =========================================================================
  // 5. BALANCE FLOW
  // =========================================================================
  describe('Balance Flow', () => {
    it('[Happy Path] menampilkan balance_before dengan 2 desimal', () => {
      const wrapper = createWrapper({
        movement: createMovement({ balance_before: 100.5 }),
      });

      expect(wrapper.text()).toContain('100.50');
    });

    it('[Happy Path] menampilkan balance_after dengan 2 desimal', () => {
      const wrapper = createWrapper({
        movement: createMovement({ balance_after: 150.75 }),
      });

      expect(wrapper.text()).toContain('150.75');
    });

    it('[Happy Path] balance_after=0 → text-error', () => {
      const wrapper = createWrapper({
        movement: createMovement({ balance_after: 0 }),
      });

      const afterLabels = wrapper.findAll('.text-error');
      expect(afterLabels.length).toBeGreaterThan(0);
    });

    it('[Happy Path] label "Before" & "After" ada', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Before');
      expect(wrapper.text()).toContain('After');
    });

    it('[Happy Path] label "Balance Flow" ada', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Balance Flow');
    });
  });

  // =========================================================================
  // 6. REFERENCE ID
  // =========================================================================
  describe('Reference ID', () => {
    it('[Happy Path] reference_id ditampilkan jika ada', () => {
      const wrapper = createWrapper({
        movement: createMovement({ reference_id: 'REF-12345' }),
      });

      expect(wrapper.text()).toContain('REF-12345');
      expect(wrapper.text()).toContain('Reference ID');
    });

    it('[Happy Path] reference_id TIDAK ditampilkan jika null', () => {
      const wrapper = createWrapper({
        movement: createMovement({ reference_id: null }),
      });

      expect(wrapper.text()).not.toContain('Reference ID');
    });

    it('[Happy Path] reference_id TIDAK ditampilkan jika empty string', () => {
      const wrapper = createWrapper({
        movement: createMovement({ reference_id: '' }),
      });

      expect(wrapper.text()).not.toContain('Reference ID');
    });
  });

  // =========================================================================
  // 7. USER INFO — with & without user
  // =========================================================================
  describe('User Info — with user', () => {
    it('[Happy Path] menampilkan nama user', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: 'John Doe', role: 'admin' } as any,
        }),
      });

      expect(wrapper.text()).toContain('John Doe');
    });

    it('[Happy Path] menampilkan role user uppercase', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: 'John Doe', role: 'admin' } as any,
        }),
      });

      const roleEl = wrapper.find('.uppercase.tracking-widest');
      expect(roleEl.exists()).toBe(true);
    });

    it('[Happy Path] menampilkan initials user', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: 'John Doe', role: 'admin' } as any,
        }),
      });

      expect(wrapper.text()).toContain('JD');
    });

    it('[Happy Path] initials dari 1 kata → 1 huruf', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: 'John', role: 'admin' } as any,
        }),
      });

      expect(wrapper.text()).toContain('J');
    });

    it('[Happy Path] initials dari 3 kata → 2 huruf pertama', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: 'John Michael Doe', role: 'admin' } as any,
        }),
      });

      expect(wrapper.text()).toContain('JM');
    });
  });

  describe('User Info — without user', () => {
    it('[Happy Path] user null → tampil "System"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ user: null as any }),
      });

      expect(wrapper.text()).toContain('System');
    });

    it('[Happy Path] user null → tampil "Automated (POS)"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ user: null as any }),
      });

      expect(wrapper.text()).toContain('Automated (POS)');
    });

    it('[Happy Path] user null → icon info (bg-info/10)', () => {
      const wrapper = createWrapper({
        movement: createMovement({ user: null as any }),
      });

      expect(wrapper.find('.bg-info\\/10').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 8. TIMESTAMP FORMATTING
  // =========================================================================
  describe('Timestamp Formatting', () => {
    it('[Happy Path] menampilkan tanggal format Indonesia', () => {
      const wrapper = createWrapper({
        movement: createMovement({ created_at: '2024-01-20T10:30:45Z' }),
      });

      expect(wrapper.text()).toContain('Januari');
      expect(wrapper.text()).toContain('2024');
    });

    it('[Happy Path] menampilkan waktu dengan format HH:MM:SS', () => {
      const wrapper = createWrapper({
        movement: createMovement({ created_at: '2024-01-20T10:30:45Z' }),
      });

      expect(wrapper.text()).toMatch(/\d{2}[.:]\d{2}/);
    });

    it('[Happy Path] menampilkan suffix "WIB"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('WIB');
    });

    it('[Happy Path] created_at null → "-"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ created_at: null as any }),
      });

      expect(wrapper.text()).toContain('-');
    });

    it('[Happy Path] created_at invalid → "-"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ created_at: 'invalid-date' }),
      });

      expect(wrapper.text()).toContain('-');
    });
  });

  // =========================================================================
  // 9. EVENT EMISSION — close — ✅ FIX non-null assertion (line 545 di CI)
  // =========================================================================
  describe('Event Emission — close', () => {
    it('[Happy Path] emit "close" saat klik tombol X', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      await buttons[0]!.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit "close" saat klik tombol Close di footer', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const closeBtn = buttons.find((b) => b.text() === 'Close')!;
      await closeBtn.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit "close" saat klik backdrop (self)', async () => {
      const wrapper = createWrapper();

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Negative Path] klik di dalam modal TIDAK emit close', async () => {
      const wrapper = createWrapper();

      const modalContent = wrapper.find('.max-w-lg');
      await modalContent.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  // =========================================================================
  // 10. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] modal tertutup saat isOpen=false', async () => {
      const wrapper = createWrapper({ isOpen: true });

      expect(wrapper.find('.fixed').exists()).toBe(true);

      await wrapper.setProps({ isOpen: false });

      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] modal tertutup saat movement=null', async () => {
      const wrapper = createWrapper({ isOpen: true, movement: createMovement() });

      expect(wrapper.find('.fixed').exists()).toBe(true);

      await wrapper.setProps({ movement: null });

      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] tipe movement berubah dari IN ke OUT', async () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN' }),
      });

      expect(wrapper.text()).toContain('Stock In');

      await wrapper.setProps({
        movement: createMovement({ movement_type: 'OUT' }),
      });

      expect(wrapper.text()).toContain('Stock Out');
      expect(wrapper.text()).not.toContain('Stock In');
    });
  });

  // =========================================================================
  // 11. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - isOpen=false, movement ada] tidak render', () => {
      const wrapper = createWrapper({ isOpen: false, movement: createMovement() });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[BVA - isOpen=true, movement=null] tidak render', () => {
      const wrapper = createWrapper({ isOpen: true, movement: null });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[BVA - quantity=0] IN → "+0.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ movement_type: 'IN', quantity: 0 }),
      });

      expect(wrapper.text()).toContain('+0.00');
    });

    it('[BVA - balance_before=0] → "0.00"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ balance_before: 0 }),
      });

      expect(wrapper.text()).toContain('0.00');
    });

    it('[BVA - balance_after=0] → text-error', () => {
      const wrapper = createWrapper({
        movement: createMovement({ balance_after: 0 }),
      });

      expect(wrapper.find('.text-error').exists()).toBe(true);
    });

    it('[BVA - movement id besar] render dengan benar', () => {
      const wrapper = createWrapper({
        movement: createMovement({ id: 999999 }),
      });

      expect(wrapper.text()).toContain('Movement #999999');
    });
  });

  // =========================================================================
  // 12. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] material null → "Unknown Material"', () => {
      const wrapper = createWrapper({
        movement: createMovement({ raw_material: null as any }),
      });

      expect(wrapper.text()).toContain('Unknown Material');
    });

    it('[Edge Case] material tanpa category → tidak crash', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          raw_material: {
            id: 1,
            name: 'Coffee',
            sku: 'RM-001',
            unit: 'kg',
            category: null,
          } as any,
        }),
      });

      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Corner Case] user name kosong → initials "??"', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: '', role: 'admin' } as any,
        }),
      });

      expect(wrapper.text()).toContain('??');
    });

    it('[Corner Case] user name dengan multiple spasi → initials benar', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          user: { id: '1', name: '  John   Doe  ', role: 'admin' } as any,
        }),
      });

      expect(wrapper.text()).toContain('JD');
    });

    it('[Edge Case] immutability notice muncul', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('immutable audit trail');
      expect(wrapper.text()).toContain('ADJUSTMENT');
    });

    it('[Edge Case] immutability notice punya bg-info/5', () => {
      const wrapper = createWrapper();

      const notice = wrapper.find('.bg-info\\/5');
      expect(notice.exists()).toBe(true);
    });

    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Edge Case] quantity string → Number() coercion', () => {
      const wrapper = createWrapper({
        movement: createMovement({ quantity: '25.5' as any }),
      });

      expect(wrapper.text()).toContain('+25.50');
    });

    it('[Corner Case] balance string → Number() coercion', () => {
      const wrapper = createWrapper({
        movement: createMovement({
          balance_before: '100.5' as any,
          balance_after: '150.5' as any,
        }),
      });

      expect(wrapper.text()).toContain('100.50');
      expect(wrapper.text()).toContain('150.50');
    });

    it('[Edge Case] reason dengan unicode', () => {
      const wrapper = createWrapper({
        movement: createMovement({ reason: 'Café ☕ restock' }),
      });

      expect(wrapper.text()).toContain('Café ☕ restock');
    });
  });

  // =========================================================================
  // 13. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa handle close event', async () => {
      const Parent = {
        components: { MovementDetailModal },
        template: `
          <MovementDetailModal
            :is-open="isOpen"
            :movement="movement"
            @close="isOpen = false"
          />
          <span data-testid="open">{{ isOpen }}</span>
        `,
        data() {
          return {
            isOpen: true,
            movement: {
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
          };
        },
      };

      const wrapper = mount(Parent as any, {
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const buttons = wrapper.findAll('button');
      const closeBtn = buttons.find((b) => b.text() === 'Close')!;
      await closeBtn.trigger('click');

      expect(wrapper.find('[data-testid="open"]').text()).toBe('false');
    });
  });
});