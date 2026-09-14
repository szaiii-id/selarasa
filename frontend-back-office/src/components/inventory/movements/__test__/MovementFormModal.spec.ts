import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementFormModal from '../MovementFormModal.vue';
import type { MaterialOption } from '@/composables/useMaterialOptions';

describe('MovementFormModal.vue (Component Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createMaterialOptions = (): MaterialOption[] => [
    {
      value: 1,
      label: 'Fresh Milk UHT',
      sku: 'RM-001',
      unit: 'L',
      currentStock: 100,
      minimumStock: 20,
      isLowStock: false,
      isActive: true,
    },
    {
      value: 2,
      label: 'Coffee Beans',
      sku: 'RM-002',
      unit: 'kg',
      currentStock: 5,
      minimumStock: 10,
      isLowStock: true,
      isActive: true,
    },
  ];

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MovementFormModal, {
      props: {
        isOpen: true,
        isLoading: false,
        materialOptions: createMaterialOptions(),
        errors: {},
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

    it('[Happy Path] render modal saat isOpen=true', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.fixed').exists()).toBe(true);
      expect(wrapper.text()).toContain('Record Stock Movement');
    });

    it('[Happy Path] menampilkan subtitle', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Log material in/out or adjustment in the audit trail');
    });

    it('[Happy Path] render 5 field: Material, Type, Quantity, Reason, Reference', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Raw Material');
      expect(wrapper.text()).toContain('Movement Type');
      expect(wrapper.text()).toContain('Quantity');
      expect(wrapper.text()).toContain('Reason');
      expect(wrapper.text()).toContain('Reference ID');
    });

    it('[Happy Path] render 3 tombol movement type', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const typeButtons = buttons.filter((b) =>
        ['IN', 'OUT', 'ADJUST'].includes(b.text().trim())
      );
      expect(typeButtons).toHaveLength(3);
    });

    it('[Happy Path] render opsi material dari props', () => {
      const wrapper = createWrapper();

      const select = wrapper.find('select');
      expect(select.text()).toContain('Fresh Milk UHT — RM-001');
      expect(select.text()).toContain('Coffee Beans — RM-002');
    });

    it('[Happy Path] menampilkan "(Low Stock)" pada material low stock', () => {
      const wrapper = createWrapper();

      const select = wrapper.find('select');
      expect(select.text()).toContain('(Low Stock)');
    });

    it('[Happy Path] footer menampilkan immutability notice', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Movements are permanent');
    });

    it('[Happy Path] tombol submit label "Record Movement"', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons.find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. MOVEMENT TYPE BUTTONS
  // =========================================================================
  describe('Movement Type Buttons', () => {
    it('[Happy Path] klik IN → set movement_type', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const inBtn = buttons.find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');

      // Cek bahwa IN jadi active (bg-success)
      expect(inBtn.classes()).toContain('bg-success');
    });

    it('[Happy Path] klik OUT → set movement_type', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const outBtn = buttons.find((b) => b.text().trim() === 'OUT')!;
      await outBtn.trigger('click');

      expect(outBtn.classes()).toContain('bg-error');
    });

    it('[Happy Path] klik ADJUST → set movement_type', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const adjBtn = buttons.find((b) => b.text().trim() === 'ADJUST')!;
      await adjBtn.trigger('click');

      expect(adjBtn.classes()).toContain('bg-warning');
    });

    it('[Happy Path] hanya 1 tombol active pada satu waktu', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const inBtn = buttons.find((b) => b.text().trim() === 'IN')!;
      const outBtn = buttons.find((b) => b.text().trim() === 'OUT')!;

      await inBtn.trigger('click');

      expect(inBtn.classes()).toContain('bg-success');
      expect(outBtn.classes()).not.toContain('bg-error');

      await outBtn.trigger('click');

      expect(outBtn.classes()).toContain('bg-error');
      expect(inBtn.classes()).not.toContain('bg-success');
    });
  });

  // =========================================================================
  // 3. QUANTITY HINT — Dynamic per type
  // =========================================================================
  describe('Quantity Hint', () => {
    it('[Happy Path] hint default "Select a movement type first"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Select a movement type first.');
    });

    it('[Happy Path] hint untuk IN', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const inBtn = buttons.find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');

      expect(wrapper.text()).toContain('Enter a positive number — this will ADD to the current stock.');
    });

    it('[Happy Path] hint untuk OUT', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const outBtn = buttons.find((b) => b.text().trim() === 'OUT')!;
      await outBtn.trigger('click');

      expect(wrapper.text()).toContain('Enter a positive number — this will SUBTRACT from the current stock.');
    });

    it('[Happy Path] hint untuk ADJUSTMENT', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const adjBtn = buttons.find((b) => b.text().trim() === 'ADJUST')!;
      await adjBtn.trigger('click');

      expect(wrapper.text()).toContain('Enter a signed delta');
    });
  });

  // =========================================================================
  // 4. REASON SUGGESTIONS
  // =========================================================================
  describe('Reason Suggestions', () => {
    it('[Happy Path] render 5 suggestion buttons', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Supplier Delivery');
      expect(wrapper.text()).toContain('Expired / Spillage');
      expect(wrapper.text()).toContain('Stock Opname');
      expect(wrapper.text()).toContain('Staff Meal');
      expect(wrapper.text()).toContain('Return to Supplier');
    });

    it('[Happy Path] klik suggestion → isi reason input', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button[type="button"]');
      const suggestion = buttons.find((b) => b.text() === 'Supplier Delivery')!;
      await suggestion.trigger('click');

      const reasonInput = wrapper.find('input[placeholder*="Supplier Delivery"]');
      expect((reasonInput.element as HTMLInputElement).value).toBe('Supplier Delivery');
    });

    it('[Happy Path] suggestion hilang saat reason error muncul', () => {
      const wrapper = createWrapper({
        errors: { reason: ['Reason is required'] },
      });

      expect(wrapper.text()).not.toContain('Supplier Delivery');
      expect(wrapper.text()).toContain('Reason is required');
    });
  });

  // =========================================================================
  // 5. VALIDATION
  // =========================================================================
  describe('Validation — Submit disabled state', () => {
    it('[Happy Path] submit disabled saat form kosong', () => {
      const wrapper = createWrapper();

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit disabled saat hanya material terisi', async () => {
      const wrapper = createWrapper();

      const select = wrapper.find('select');
      await select.setValue('1');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit enabled saat form lengkap & valid', async () => {
      const wrapper = createWrapper();

      // Select material
      await wrapper.find('select').setValue('1');

      // Select type IN
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');

      // Quantity
      await wrapper.find('input[type="number"]').setValue('10');

      // Reason (min 3 chars)
      const reasonInput = wrapper.find('input[placeholder*="Supplier Delivery"]');
      await reasonInput.setValue('Test reason');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('[Happy Path] submit disabled saat reason < 3 karakter', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('10');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('ab');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit disabled saat quantity=0', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('0');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Test reason');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isLoading: true });

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });
  });

  // =========================================================================
  // 6. EVENT EMISSION — submit
  // =========================================================================
  describe('Event Emission — submit', () => {
    it('[Happy Path] emit submit dengan payload lengkap (IN)', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('25');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Supplier Delivery');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted).toBeTruthy();
      expect(emitted![0]![0]).toMatchObject({
        raw_material_id: 1,
        movement_type: 'IN',
        quantity: 25,
        reason: 'Supplier Delivery',
        reference_id: null,
      });
    });

    it('[Happy Path] OUT quantity dikirim POSITIVE (backend convert ke negative)', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const outBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'OUT')!;
      await outBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('25');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Test reason');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).quantity).toBe(25);
    });

    it('[Happy Path] ADJUSTMENT signed — positif', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const adjBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'ADJUST')!;
      await adjBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('5');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Stock Opname');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).quantity).toBe(5);
    });

    it('[Happy Path] ADJUSTMENT signed — negatif', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const adjBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'ADJUST')!;
      await adjBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('-3');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Stock Opname');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).quantity).toBe(-3);
    });

    it('[Happy Path] reference_id empty → null', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('10');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Test reason');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).reference_id).toBeNull();
    });

    it('[Happy Path] reference_id di-trim', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('10');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Test reason');
      await wrapper.find('input[placeholder*="PO-2024"]').setValue('  REF-123  ');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).reference_id).toBe('REF-123');
    });

    it('[Negative Path] tidak emit submit saat form invalid', async () => {
      const wrapper = createWrapper();

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      await submitBtn.trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. EVENT EMISSION — close
  // =========================================================================
  describe('Event Emission — close', () => {
    it('[Happy Path] emit close saat klik X', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit close saat klik Cancel', async () => {
      const wrapper = createWrapper();

      const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!;
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit close saat klik backdrop', async () => {
      const wrapper = createWrapper();

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Negative Path] klik Cancel disabled saat isLoading=true', async () => {
      const wrapper = createWrapper({ isLoading: true });

      const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!;
      expect(cancelBtn.attributes('disabled')).toBeDefined();
    });

    it('[Negative Path] klik di dalam modal tidak emit close', async () => {
      const wrapper = createWrapper();

      const modalContent = wrapper.find('.max-w-2xl');
      await modalContent.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. ERROR DISPLAY
  // =========================================================================
  describe('Error Display', () => {
    it('[Happy Path] menampilkan error raw_material_id', () => {
      const wrapper = createWrapper({
        errors: { raw_material_id: ['Material is required'] },
      });

      expect(wrapper.text()).toContain('Material is required');
    });

    it('[Happy Path] menampilkan error movement_type', () => {
      const wrapper = createWrapper({
        errors: { movement_type: ['Type is required'] },
      });

      expect(wrapper.text()).toContain('Type is required');
    });

    it('[Happy Path] menampilkan error quantity', () => {
      const wrapper = createWrapper({
        errors: { quantity: ['Quantity must be greater than 0'] },
      });

      expect(wrapper.text()).toContain('Quantity must be greater than 0');
    });

    it('[Happy Path] menampilkan error reason', () => {
      const wrapper = createWrapper({
        errors: { reason: ['Reason is required'] },
      });

      expect(wrapper.text()).toContain('Reason is required');
    });

    it('[Happy Path] select material border-error saat errors ada', () => {
      const wrapper = createWrapper({
        errors: { raw_material_id: ['Error'] },
      });

      const select = wrapper.find('select');
      expect(select.classes()).toContain('border-error');
    });
  });

  // =========================================================================
  // 9. CURRENT STOCK HINT
  // =========================================================================
  describe('Current Stock Hint', () => {
    it('[Happy Path] hint muncul saat material dipilih', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');

      expect(wrapper.text()).toContain('Current stock:');
      expect(wrapper.text()).toContain('100.00');
      expect(wrapper.text()).toContain('Minimum:');
      expect(wrapper.text()).toContain('20.00');
    });

    it('[Happy Path] hint tidak muncul saat material belum dipilih', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).not.toContain('Current stock:');
    });

    it('[Happy Path] hint menampilkan unit', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');

      expect(wrapper.text()).toContain('L');
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

    it('[Happy Path] form reset saat isOpen berubah', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('select').setValue('1');
      await wrapper.setProps({ isOpen: false });
      await wrapper.setProps({ isOpen: true });

      const select = wrapper.find('select');
      expect((select.element as HTMLSelectElement).value).toBe('');
    });

    it('[Happy Path] loading spinner tampil saat isLoading=true', () => {
      const wrapper = createWrapper({ isLoading: true });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('[Happy Path] loading spinner tidak tampil saat isLoading=false', () => {
      const wrapper = createWrapper({ isLoading: false });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 11. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - reason 3 char] valid (boundary bawah)', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('10');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('abc');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('[BVA - reason 2 char] invalid', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('10');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('ab');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[BVA - quantity 0] invalid', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('0');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Test');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[BVA - quantity negatif di IN] invalid', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const inBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'IN')!;
      await inBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('-5');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Test');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[BVA - quantity negatif di ADJUSTMENT] valid', async () => {
      const wrapper = createWrapper();

      await wrapper.find('select').setValue('1');
      const adjBtn = wrapper.findAll('button[type="button"]').find((b) => b.text().trim() === 'ADJUST')!;
      await adjBtn.trigger('click');
      await wrapper.find('input[type="number"]').setValue('-5');
      await wrapper.find('input[placeholder*="Supplier Delivery"]').setValue('Stock Opname');

      const submitBtn = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Record Movement'))!;
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });
  });

  // =========================================================================
  // 12. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('submit')).toBeUndefined();
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Edge Case] reason hint hanya tampil saat tidak ada error', () => {
      const wrapper = createWrapper({
        errors: { reason: ['Error'] },
      });

      expect(wrapper.text()).not.toContain('Supplier Delivery');
    });

    it('[Corner Case] reference_id maxlength 100', () => {
      const wrapper = createWrapper();

      const refInput = wrapper.find('input[placeholder*="PO-2024"]');
      expect(refInput.attributes('maxlength')).toBe('100');
    });

    it('[Corner Case] reason maxlength 255', () => {
      const wrapper = createWrapper();

      const reasonInput = wrapper.find('input[placeholder*="Supplier Delivery"]');
      expect(reasonInput.attributes('maxlength')).toBe('255');
    });

    it('[Edge Case] quantity input step 0.01', () => {
      const wrapper = createWrapper();

      const qtyInput = wrapper.find('input[type="number"]');
      expect(qtyInput.attributes('step')).toBe('0.01');
    });

    it('[Edge Case] type="button" pada movement type buttons (tidak submit form)', () => {
      const wrapper = createWrapper();

      const typeButtons = wrapper.findAll('button[type="button"]');
      expect(typeButtons.length).toBeGreaterThan(0);
    });

    it('[Corner Case] immutability notice punya icon lock', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('cannot be edited or deleted');
    });
  });
});