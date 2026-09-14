import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialFormModal from '../MaterialFormModal.vue';
import type { RawMaterial } from '@/types/inventory';
import type { CategoryOption } from '@/composables/useCategoryOptions';

describe('MaterialFormModal.vue (Component Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createCategoryOptions = (): CategoryOption[] => [
    { value: 1, label: 'Coffee' },
    { value: 2, label: 'Tea' },
    { value: 3, label: 'Sugar' },
  ];

  const createMaterial = (overrides: Partial<RawMaterial> = {}): RawMaterial => ({
    id: 1,
    category_id: 1,
    sku: 'RM-0012-APF',
    name: 'Fresh Milk UHT',
    unit: 'kg',
    current_stock: 25.5,
    minimum_stock: 5,
    is_low_stock: false,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  } as RawMaterial);

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MaterialFormModal, {
      props: {
        isOpen: true,
        isLoading: false,
        materialToEdit: null,
        categoryOptions: createCategoryOptions(),
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
  // 1. HAPPY PATH — Rendering — ✅ FIX non-null assertion
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] tidak render saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] render modal saat isOpen=true', () => {
      const wrapper = createWrapper({ isOpen: true });
      expect(wrapper.find('.fixed').exists()).toBe(true);
      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Happy Path] judul "Add New Material" untuk create mode', () => {
      const wrapper = createWrapper({ materialToEdit: null });
      expect(wrapper.find('h3').text()).toBe('Add New Material');
    });

    it('[Happy Path] judul "Edit Material" untuk edit mode', () => {
      const wrapper = createWrapper({ materialToEdit: createMaterial() });
      expect(wrapper.find('h3').text()).toBe('Edit Material');
    });

    it('[Happy Path] label submit "Create Material" untuk create', () => {
      const wrapper = createWrapper({ materialToEdit: null });
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.text()).toContain('Create Material');
    });

    it('[Happy Path] label submit "Save Changes" untuk edit', () => {
      const wrapper = createWrapper({ materialToEdit: createMaterial() });
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.text()).toContain('Save Changes');
    });

    it('[Happy Path] info banner muncul di create mode', () => {
      const wrapper = createWrapper({ materialToEdit: null });
      expect(wrapper.text()).toContain('Initial stock will be');
      expect(wrapper.text()).toContain('Stock Movements');
    });

    it('[Happy Path] info banner TIDAK muncul di edit mode', () => {
      const wrapper = createWrapper({ materialToEdit: createMaterial() });
      expect(wrapper.text()).not.toContain('Initial stock will be');
    });

    it('[Happy Path] render 5 field wajib (SKU, Category, Name, Unit, Minimum Stock)', () => {
      const wrapper = createWrapper();

      expect(wrapper.find('input[placeholder="RM-0012-APF"]').exists()).toBe(true);
      expect(wrapper.findAll('select').length).toBeGreaterThanOrEqual(2);
      expect(wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').exists()).toBe(true);
      expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    });

    it('[Happy Path] render toggle Active Status', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Active Status');
    });
  });

  // =========================================================================
  // 2. FORM STATE — Watch on Open
  // =========================================================================
  describe('Form State — Watch on Open', () => {
    it('[Happy Path] form kosong saat create mode', () => {
      const wrapper = createWrapper({ materialToEdit: null });

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      const nameInput = wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]');

      expect((skuInput.element as HTMLInputElement).value).toBe('');
      expect((nameInput.element as HTMLInputElement).value).toBe('');
    });

    it('[Happy Path] form terisi saat edit mode', () => {
      const material = createMaterial({
        sku: 'RM-9999-XYZ',
        name: 'Premium Coffee',
        unit: 'kg',
        minimum_stock: 10,
      });
      const wrapper = createWrapper({ materialToEdit: material });

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      const nameInput = wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]');
      const minStockInput = wrapper.find('input[type="number"]');

      expect((skuInput.element as HTMLInputElement).value).toBe('RM-9999-XYZ');
      expect((nameInput.element as HTMLInputElement).value).toBe('Premium Coffee');
      expect((minStockInput.element as HTMLInputElement).value).toBe('10');
    });

    it('[Happy Path] form ter-reset saat isOpen true (create)', async () => {
      const wrapper = createWrapper({ isOpen: false, materialToEdit: null });

      await wrapper.setProps({ isOpen: true });

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      expect((skuInput.element as HTMLInputElement).value).toBe('');
    });

    it('[Happy Path] form ter-reset saat isOpen true (edit)', async () => {
      const material = createMaterial({ sku: 'NEW-SKU' });
      const wrapper = createWrapper({ isOpen: false, materialToEdit: material });

      await wrapper.setProps({ isOpen: true });

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      expect((skuInput.element as HTMLInputElement).value).toBe('NEW-SKU');
    });
  });

  // =========================================================================
  // 3. VALIDATION — Computed isValid — ✅ FIX non-null assertion
  // =========================================================================
  describe('Validation — Computed isValid', () => {
    it('[Happy Path] submit disabled saat semua field kosong', () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit enabled saat semua field valid', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('[Happy Path] submit disabled saat name kosong', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit disabled saat minimum_stock negatif', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('-5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] submit disabled saat isLoading=true', () => {
      const wrapper = createWrapper({
        isLoading: true,
        materialToEdit: createMaterial(),
      });
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });
  });

  // =========================================================================
  // 4. EVENT EMISSION — submit (create) — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — submit (create)', () => {
    it('[Happy Path] emit submit dengan payload lengkap', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Fresh Milk');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('2');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted).toBeTruthy();
      expect(emitted![0]![0]).toMatchObject({
        category_id: 2,
        sku: 'RM-001',
        name: 'Fresh Milk',
        unit: 'kg',
        minimum_stock: 5,
        is_active: true,
      });
    });

    it('[Happy Path] sku di-uppercase dan trim', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('  rm-001  ');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).sku).toBe('RM-001');
    });

    it('[Happy Path] name di-trim', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('  Milk  ');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).name).toBe('Milk');
    });

    it('[Happy Path] category_id dikonversi ke number', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('3');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(typeof (emitted![0]![0] as any).category_id).toBe('number');
      expect((emitted![0]![0] as any).category_id).toBe(3);
    });

    it('[Happy Path] minimum_stock dikonversi ke number', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('25.5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(typeof (emitted![0]![0] as any).minimum_stock).toBe('number');
      expect((emitted![0]![0] as any).minimum_stock).toBe(25.5);
    });

    it('[Negative Path] tidak emit saat form invalid', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('[Negative Path] tidak emit saat isLoading=true', async () => {
      const wrapper = createWrapper({
        isLoading: true,
        materialToEdit: createMaterial(),
      });

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. TOGGLE ACTIVE — ✅ FIX non-null assertion
  // =========================================================================
  describe('Toggle Active Status', () => {
    it('[Happy Path] default is_active=true di create mode', async () => {
      const wrapper = createWrapper();

      const toggleBtn = wrapper.find('button[type="button"]');
      expect(toggleBtn.classes()).toContain('bg-success');
    });

    it('[Happy Path] toggle mengubah is_active', async () => {
      const wrapper = createWrapper();

      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger('click');

      expect(toggleBtn.classes()).toContain('bg-gray-300');
    });

    it('[Happy Path] toggle ganda kembali ke active', async () => {
      const wrapper = createWrapper();

      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger('click');
      await toggleBtn.trigger('click');

      expect(toggleBtn.classes()).toContain('bg-success');
    });

    it('[Happy Path] is_active=false terkirim di submit', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger('click');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).is_active).toBe(false);
    });
  });

  // =========================================================================
  // 6. CURRENT STOCK (edit mode only)
  // =========================================================================
  describe('Current Stock (edit mode only)', () => {
    it('[Happy Path] current stock field muncul di edit mode', () => {
      const wrapper = createWrapper({
        materialToEdit: createMaterial({ current_stock: 25.5 }),
      });

      expect(wrapper.text()).toContain('Current Stock');
      expect(wrapper.text()).toContain('read-only');
    });

    it('[Happy Path] current stock TIDAK muncul di create mode', () => {
      const wrapper = createWrapper({ materialToEdit: null });

      expect(wrapper.text()).not.toContain('read-only');
    });

    it('[Happy Path] current stock ditampilkan dengan 2 desimal', () => {
      const wrapper = createWrapper({
        materialToEdit: createMaterial({ current_stock: 25.5 }),
      });

      const readonlyInput = wrapper.find('input[readonly]');
      expect((readonlyInput.element as HTMLInputElement).value).toBe('25.50');
    });

    it('[Happy Path] current stock integer diformat 2 desimal', () => {
      const wrapper = createWrapper({
        materialToEdit: createMaterial({ current_stock: 10 }),
      });

      const readonlyInput = wrapper.find('input[readonly]');
      expect((readonlyInput.element as HTMLInputElement).value).toBe('10.00');
    });

    it('[Happy Path] info text "Stock can only be changed through Stock Movements"', () => {
      const wrapper = createWrapper({
        materialToEdit: createMaterial(),
      });

      expect(wrapper.text()).toContain('Stock can only be changed through Stock Movements');
    });
  });

  // =========================================================================
  // 7. EVENT EMISSION — close — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — close', () => {
    it('[Happy Path] emit close saat klik tombol X', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      await buttons[0]!.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit close saat klik tombol Cancel', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const cancelBtn = buttons.find((b) => b.text() === 'Cancel')!;
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit close saat klik backdrop', async () => {
      const wrapper = createWrapper();

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Negative Path] tidak emit close saat isLoading=true (X button)', async () => {
      const wrapper = createWrapper({ isLoading: true });

      const buttons = wrapper.findAll('button');
      await buttons[0]!.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Negative Path] tidak emit close saat isLoading=true (Cancel)', async () => {
      const wrapper = createWrapper({ isLoading: true });

      const buttons = wrapper.findAll('button');
      const cancelBtn = buttons.find((b) => b.text() === 'Cancel')!;
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Negative Path] tidak emit close saat klik di dalam modal', async () => {
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
    it('[Happy Path] menampilkan error untuk sku', () => {
      const wrapper = createWrapper({
        errors: { sku: ['SKU already exists'] },
      });

      expect(wrapper.text()).toContain('SKU already exists');
    });

    it('[Happy Path] menampilkan error untuk name', () => {
      const wrapper = createWrapper({
        errors: { name: ['Name is required'] },
      });

      expect(wrapper.text()).toContain('Name is required');
    });

    it('[Happy Path] menampilkan error untuk category_id', () => {
      const wrapper = createWrapper({
        errors: { category_id: ['Category is required'] },
      });

      expect(wrapper.text()).toContain('Category is required');
    });

    it('[Happy Path] menampilkan error untuk minimum_stock', () => {
      const wrapper = createWrapper({
        errors: { minimum_stock: ['Must be positive'] },
      });

      expect(wrapper.text()).toContain('Must be positive');
    });

    it('[Happy Path] input sku border-error saat errors.sku ada', () => {
      const wrapper = createWrapper({ errors: { sku: ['Error'] } });

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      expect(skuInput.classes()).toContain('border-error');
    });

    it('[Happy Path] input sku border-gray-200 saat tidak ada error', () => {
      const wrapper = createWrapper({ errors: {} });

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      expect(skuInput.classes()).toContain('border-gray-200');
    });

    it('[Happy Path] counter karakter name ter-update', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');

      expect(wrapper.text()).toContain('4/150 characters');
    });
  });

  // =========================================================================
  // 9. BOUNDARY VALUE ANALYSIS (BVA) — ✅ FIX non-null assertion
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - minimum_stock = 0] valid', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('0');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1]!;
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('[BVA - sku maxlength 50', () => {
      const wrapper = createWrapper();

      const skuInput = wrapper.find('input[placeholder="RM-0012-APF"]');
      expect(skuInput.attributes('maxlength')).toBe('50');
    });

    it('[BVA - name maxlength 150', () => {
      const wrapper = createWrapper();

      const nameInput = wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]');
      expect(nameInput.attributes('maxlength')).toBe('150');
    });

    it('[BVA - unit default "kg"', () => {
      const wrapper = createWrapper();

      const unitSelect = wrapper.findAll('select')[1]!;
      expect((unitSelect.element as HTMLSelectElement).value).toBe('kg');
    });

    it('[BVA - semua unit options tersedia', () => {
      const wrapper = createWrapper();

      const unitSelect = wrapper.findAll('select')[1]!;
      const options = unitSelect.findAll('option');
      const optionValues = options.map((o) => o.element.value);
      expect(optionValues).toEqual(['kg', 'gr', 'L', 'ml', 'pcs']);
    });
  });

  // =========================================================================
  // 10. EDGE CASES & CORNER CASES — ✅ FIX non-null assertion
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] sku lowercase di-uppercase di submit', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('abc-123');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Test');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).sku).toBe('ABC-123');
    });

    it('[Corner Case] submit saat create mode mengirim is_active default true', async () => {
      const wrapper = createWrapper();

      await wrapper.find('input[placeholder="RM-0012-APF"]').setValue('RM-001');
      await wrapper.find('input[placeholder="e.g., Fresh Milk UHT"]').setValue('Milk');
      await wrapper.find('input[type="number"]').setValue('5');
      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('1');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1]!.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).is_active).toBe(true);
    });

    it('[Edge Case] loading spinner tampil saat isLoading=true', () => {
      const wrapper = createWrapper({ isLoading: true });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('[Edge Case] loading spinner tidak tampil saat isLoading=false', () => {
      const wrapper = createWrapper({ isLoading: false });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
    });

    it('[Corner Case] error hanya menampilkan index 0', () => {
      const wrapper = createWrapper({
        errors: { name: ['First error', 'Second error'] },
      });

      expect(wrapper.text()).toContain('First error');
      expect(wrapper.text()).not.toContain('Second error');
    });

    it('[Edge Case] toggle hanya emit click, tidak submit', async () => {
      const wrapper = createWrapper();

      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });
});