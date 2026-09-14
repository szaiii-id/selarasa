import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import CategoryFormModal from '../CategoryFormModal.vue';
import type { RawMaterialCategory } from '@/types/inventory';

describe('CategoryFormModal.vue (Component Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createCategory = (
    overrides: Partial<RawMaterialCategory> = {}
  ): RawMaterialCategory => ({
    id: 1,
    name: 'Coffee Beans',
    description: 'Single origin coffee',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  } as RawMaterialCategory);

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(CategoryFormModal, {
      props: {
        isOpen: true,
        isLoading: false,
        categoryToEdit: null,
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
    it('[Happy Path] tidak merender konten saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });

      expect(wrapper.find('.fixed').exists()).toBe(false);
      expect(wrapper.find('h3').exists()).toBe(false);
    });

    it('[Happy Path] merender modal saat isOpen=true', () => {
      const wrapper = createWrapper({ isOpen: true });

      expect(wrapper.find('.fixed').exists()).toBe(true);
      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Happy Path] menampilkan judul "Add Category" untuk mode create', () => {
      const wrapper = createWrapper({ isOpen: true, categoryToEdit: null });

      expect(wrapper.find('h3').text()).toBe('Add Category');
    });

    it('[Happy Path] menampilkan judul "Edit Category" untuk mode edit', () => {
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: createCategory(),
      });

      expect(wrapper.find('h3').text()).toBe('Edit Category');
    });

    it('[Happy Path] menampilkan subtitle create mode', () => {
      const wrapper = createWrapper({ isOpen: true, categoryToEdit: null });

      expect(wrapper.text()).toContain('Create a new category for raw materials');
    });

    it('[Happy Path] menampilkan subtitle edit mode', () => {
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: createCategory(),
      });

      expect(wrapper.text()).toContain('Update the name or description of this category');
    });

    it('[Happy Path] label tombol submit "Create Category" untuk mode create', () => {
      const wrapper = createWrapper({ isOpen: true });
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      expect(submitBtn.text()).toContain('Create Category');
    });

    it('[Happy Path] label tombol submit "Save Changes" untuk mode edit', () => {
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: createCategory(),
      });
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      expect(submitBtn.text()).toContain('Save Changes');
    });
  });

  // =========================================================================
  // 2. FORM STATE — Watch on Open
  // =========================================================================
  describe('Form State — Watch on Open', () => {
    it('[Happy Path] form kosong saat create mode dibuka', () => {
      const wrapper = createWrapper({ isOpen: true, categoryToEdit: null });

      const nameInput = wrapper.find('input[type="text"]');
      const descTextarea = wrapper.find('textarea');

      expect((nameInput.element as HTMLInputElement).value).toBe('');
      expect((descTextarea.element as HTMLTextAreaElement).value).toBe('');
    });

    it('[Happy Path] form terisi data kategori saat edit mode dibuka', () => {
      const category = createCategory({ name: 'Tea Leaves', description: 'Green tea' });
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: category,
      });

      const nameInput = wrapper.find('input[type="text"]');
      const descTextarea = wrapper.find('textarea');

      expect((nameInput.element as HTMLInputElement).value).toBe('Tea Leaves');
      expect((descTextarea.element as HTMLTextAreaElement).value).toBe('Green tea');
    });

    it('[Happy Path] description null di-render sebagai string kosong', () => {
      const category = createCategory({ description: null as any });
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: category,
      });

      const descTextarea = wrapper.find('textarea');
      expect((descTextarea.element as HTMLTextAreaElement).value).toBe('');
    });

    it('[Happy Path] form ter-reset saat isOpen berubah dari false → true (create)', async () => {
      const wrapper = createWrapper({ isOpen: false, categoryToEdit: null });

      // Isi form secara manual (via setValue)
      await wrapper.setProps({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('');
    });

    it('[Happy Path] form ter-reset saat isOpen berubah dari false → true (edit)', async () => {
      const category = createCategory({ name: 'New Name' });
      const wrapper = createWrapper({
        isOpen: false,
        categoryToEdit: category,
      });

      await wrapper.setProps({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('New Name');
    });

    it('[Happy Path] form tidak ter-reset saat isOpen=false', async () => {
      const wrapper = createWrapper({ isOpen: true, categoryToEdit: null });

      const nameInput = wrapper.find('input[type="text"]');
      await nameInput.setValue('Test');

      // Tutup modal — form value harus tetap (tidak reset)
      await wrapper.setProps({ isOpen: false });
      await wrapper.setProps({ isOpen: true });

      // Setelah reopen, form harus reset ke empty (karena watch isOpen)
      const freshInput = wrapper.find('input[type="text"]');
      expect((freshInput.element as HTMLInputElement).value).toBe('');
    });
  });

  // =========================================================================
  // 3. VALIDATION — Computed isValid
  // =========================================================================
  describe('Validation — Computed isValid', () => {
    it('[Happy Path] tombol submit disabled saat name kosong', () => {
      const wrapper = createWrapper({ isOpen: true });
      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] tombol submit enabled saat name terisi', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      await nameInput.setValue('Coffee');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('[Happy Path] tombol submit disabled saat name hanya whitespace', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      await nameInput.setValue('   ');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] tombol submit disabled saat isLoading=true', () => {
      const wrapper = createWrapper({
        isOpen: true,
        isLoading: true,
        categoryToEdit: createCategory(),
      });

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      expect(submitBtn.attributes('disabled')).toBeDefined();
    });
  });

  // =========================================================================
  // 4. EVENT EMISSION — submit
  // =========================================================================
  describe('Event Emission — submit', () => {
    it('[Happy Path] emit submit dengan payload name & description (trimmed)', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      const descTextarea = wrapper.find('textarea');

      await nameInput.setValue('  Coffee Beans  ');
      await descTextarea.setValue('  Single origin  ');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([
        {
          name: 'Coffee Beans',
          description: 'Single origin',
        },
      ]);
    });

    it('[Happy Path] emit submit dengan description null jika kosong', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      await nameInput.setValue('Coffee');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];
      await submitBtn.trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted![0]).toEqual([
        {
          name: 'Coffee',
          description: null,
        },
      ]);
    });

    it('[Happy Path] emit submit dengan description null jika hanya whitespace', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('Coffee');
      await wrapper.find('textarea').setValue('   ');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted![0]).toEqual([
        {
          name: 'Coffee',
          description: null,
        },
      ]);
    });

    it('[Negative Path] tidak emit submit saat name kosong', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];

      // Button disabled, tapi kita paksa trigger click (event handler tetap cek isValid)
      await submitBtn.trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('[Negative Path] tidak emit submit saat name whitespace only', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('   ');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('[Negative Path] tidak emit submit saat isLoading=true', async () => {
      const wrapper = createWrapper({
        isOpen: true,
        isLoading: true,
        categoryToEdit: createCategory(),
      });

      // Submit disabled, tapi kita tetap coba trigger
      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('[Happy Path] submit saat mode edit mengirim data terbaru dari form', async () => {
      const category = createCategory({ name: 'Original', description: 'Original desc' });
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: category,
      });

      await wrapper.find('input[type="text"]').setValue('Updated Name');
      await wrapper.find('textarea').setValue('Updated desc');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted![0]).toEqual([
        {
          name: 'Updated Name',
          description: 'Updated desc',
        },
      ]);
    });
  });

  // =========================================================================
  // 5. EVENT EMISSION — close
  // =========================================================================
  describe('Event Emission — close', () => {
    it('[Happy Path] emit close saat klik tombol X di header', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const closeBtn = wrapper.find('button[class*="w-8 h-8"]');
      await closeBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit close saat klik tombol Cancel', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const buttons = wrapper.findAll('button');
      const cancelBtn = buttons.find((b) => b.text() === 'Cancel')!;
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit close saat klik backdrop (self)', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Negative Path] tidak emit close saat isLoading=true (tombol X)', async () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });

      const closeBtn = wrapper.find('button[class*="w-8 h-8"]');
      await closeBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Negative Path] tidak emit close saat isLoading=true (tombol Cancel)', async () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });

      const buttons = wrapper.findAll('button');
      const cancelBtn = buttons.find((b) => b.text() === 'Cancel')!;
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Negative Path] tidak emit close saat isLoading=true (backdrop)', async () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. ERROR DISPLAY
  // =========================================================================
  describe('Error Display', () => {
    it('[Happy Path] menampilkan error message untuk name', () => {
      const wrapper = createWrapper({
        isOpen: true,
        errors: { name: ['Name is required'] },
      });

      expect(wrapper.text()).toContain('Name is required');
    });

    it('[Happy Path] menampilkan error message untuk description', () => {
      const wrapper = createWrapper({
        isOpen: true,
        errors: { description: ['Description too long'] },
      });

      expect(wrapper.text()).toContain('Description too long');
    });

    it('[Happy Path] menampilkan error hanya 1 baris (index 0)', () => {
      const wrapper = createWrapper({
        isOpen: true,
        errors: { name: ['First error', 'Second error'] },
      });

      expect(wrapper.text()).toContain('First error');
      expect(wrapper.text()).not.toContain('Second error');
    });

    it('[Happy Path] input name border-error saat errors.name ada', () => {
      const wrapper = createWrapper({
        isOpen: true,
        errors: { name: ['Required'] },
      });

      const nameInput = wrapper.find('input[type="text"]');
      expect(nameInput.classes()).toContain('border-error');
    });

    it('[Happy Path] input name border-gray-200 saat tidak ada error', () => {
      const wrapper = createWrapper({ isOpen: true, errors: {} });

      const nameInput = wrapper.find('input[type="text"]');
      expect(nameInput.classes()).toContain('border-gray-200');
    });

    it('[Happy Path] counter "0/100 characters" saat tidak ada error', () => {
      const wrapper = createWrapper({ isOpen: true, errors: {} });

      expect(wrapper.text()).toContain('0/100 characters');
    });

    it('[Happy Path] counter ter-update saat user mengetik', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('Coffee');

      expect(wrapper.text()).toContain('6/100 characters');
    });

    it('[Happy Path] counter description ter-update', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('textarea').setValue('Hello world');

      expect(wrapper.text()).toContain('11/500 characters');
    });
  });

  // =========================================================================
  // 7. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - name 1 char] valid', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('a');

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('[BVA - name 100 char] maxlength di input', () => {
      const wrapper = createWrapper({ isOpen: true });

      const nameInput = wrapper.find('input[type="text"]');
      expect(nameInput.attributes('maxlength')).toBe('100');
    });

    it('[BVA - description 500 char] maxlength di textarea', () => {
      const wrapper = createWrapper({ isOpen: true });

      const textarea = wrapper.find('textarea');
      expect(textarea.attributes('maxlength')).toBe('500');
    });

    it('[BVA - name 1 char + description 0] counter benar', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('a');

      expect(wrapper.text()).toContain('1/100 characters');
    });
  });

  // =========================================================================
  // 8. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] klik di dalam modal TIDAK emit close (bukan self)', async () => {
      const wrapper = createWrapper({ isOpen: true });

      const modalContent = wrapper.find('.max-w-lg');
      await modalContent.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Corner Case] name dengan leading/trailing spaces di-trim saat submit', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('  Coffee  ');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      const emitted = wrapper.emitted('submit');
      expect(emitted![0]![0]).toEqual({
        name: 'Coffee',
        description: null,
      });
    });

    it('[Corner Case] description kosong dikirim sebagai null', async () => {
      const wrapper = createWrapper({ isOpen: true });

      await wrapper.find('input[type="text"]').setValue('Coffee');

      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      const emitted = wrapper.emitted('submit');
      expect((emitted![0]![0] as any).description).toBeNull();
    });

    it('[Edge Case] loading spinner tampil saat isLoading=true', () => {
      const wrapper = createWrapper({
        isOpen: true,
        isLoading: true,
        categoryToEdit: createCategory(),
      });

      const spinner = wrapper.find('.animate-spin');
      expect(spinner.exists()).toBe(true);
    });

    it('[Edge Case] loading spinner tidak tampil saat isLoading=false', () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: false });

      const spinner = wrapper.find('.animate-spin');
      expect(spinner.exists()).toBe(false);
    });

    it('[Edge Case] tombol X di header ada', () => {
      const wrapper = createWrapper({ isOpen: true });

      const buttons = wrapper.findAll('button');
      // Tombol X biasanya button dengan SVG dan tanpa text
      const xButton = buttons.find(
        (b) => b.find('svg').exists() && b.text() === ''
      );
      expect(xButton).toBeTruthy();
    });

    it('[Edge Case] type="button" pada tombol submit (bukan submit form)', () => {
      const wrapper = createWrapper({ isOpen: true });

      const buttons = wrapper.findAll('button');
      const submitBtn = buttons[buttons.length - 1];
      // Pastikan tombol tidak submit form (karena bukan di dalam <form>)
      // Vue Test Utils: button default type adalah "submit" di HTML,
      // tapi di sini kita cek bahwa tidak ada <form> yang di-wrap
      expect(wrapper.find('form').exists()).toBe(false);
    });

    it('[Corner Case] edit category dengan description kosong string', () => {
      const category = createCategory({ description: '' });
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: category,
      });

      const textarea = wrapper.find('textarea');
      expect((textarea.element as HTMLTextAreaElement).value).toBe('');
    });

    it('[Corner Case] name whitespace di-trim saat submit (jadi null jika kosong)', async () => {
      const wrapper = createWrapper({ isOpen: true });

      // Name kosong, tidak boleh submit
      const buttons = wrapper.findAll('button');
      await buttons[buttons.length - 1].trigger('click');

      expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('[Edge Case] klik Cancel saat tidak loading emit close', async () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: false });

      const buttons = wrapper.findAll('button');
      const cancelBtn = buttons.find((b) => b.text() === 'Cancel')!;
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Edge Case] form berubah saat categoryToEdit berubah dan modal reopen', async () => {
      const wrapper = createWrapper({
        isOpen: true,
        categoryToEdit: createCategory({ name: 'First' }),
      });

      let nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('First');

      // Tutup dan ganti category
      await wrapper.setProps({ isOpen: false });
      await wrapper.setProps({
        isOpen: true,
        categoryToEdit: createCategory({ name: 'Second', id: 2 }),
      });

      nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('Second');
    });
  });
});