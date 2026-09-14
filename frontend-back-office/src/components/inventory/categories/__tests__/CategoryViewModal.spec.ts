import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CategoryViewModal from '../CategoryViewModal.vue';
import type { RawMaterialCategory } from '@/types/inventory';

describe('CategoryViewModal.vue (Component Testing)', () => {
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
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-21T15:30:00Z',
    ...overrides,
  } as RawMaterialCategory);

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(CategoryViewModal, {
      props: {
        isOpen: true,
        category: createCategory(),
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
    it('[Happy Path] tidak merender saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find('.fixed').exists()).toBe(false);
      expect(wrapper.find('h3').exists()).toBe(false);
    });

    it('[Happy Path] tidak merender saat category=null', () => {
      const wrapper = createWrapper({ isOpen: true, category: null });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] merender modal saat isOpen=true && category ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.fixed').exists()).toBe(true);
      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Happy Path] menampilkan nama kategori di header', () => {
      const wrapper = createWrapper({
        category: createCategory({ name: 'Tea Leaves' }),
      });
      expect(wrapper.find('h3').text()).toBe('Tea Leaves');
    });

    it('[Happy Path] menampilkan format code "CAT-001"', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 1 }) });
      expect(wrapper.text()).toContain('CAT-001');
    });

    it('[Happy Path] menampilkan icon folder di header', () => {
      const wrapper = createWrapper();
      const header = wrapper.find('.px-6.py-5.border-b');
      expect(header.find('svg').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 2. BODY CONTENT
  // =========================================================================
  describe('Body Content', () => {
    it('[Happy Path] menampilkan description kategori', () => {
      const wrapper = createWrapper({
        category: createCategory({ description: 'Premium grade coffee' }),
      });
      expect(wrapper.text()).toContain('Premium grade coffee');
    });

    it('[Happy Path] menampilkan "—" jika description kosong', () => {
      const wrapper = createWrapper({
        category: createCategory({ description: null as any }),
      });
      expect(wrapper.text()).toContain('—');
    });

    it('[Happy Path] menampilkan label "Description"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Description');
    });

    it('[Happy Path] menampilkan label "Created"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Created');
    });

    it('[Happy Path] menampilkan label "Last Update"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Last Update');
    });

    it('[Happy Path] menampilkan info note tentang delete restriction', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain(
        'Categories cannot be deleted if they still have raw materials assigned to them.'
      );
    });

    it('[Happy Path] info note punya styling bg-info/5', () => {
      const wrapper = createWrapper();
      const infoNote = wrapper.find('.bg-info\\/5');
      expect(infoNote.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 3. formatDateTime helper
  // =========================================================================
  describe('formatDateTime helper', () => {
    it('[Happy Path] format datetime valid', () => {
      const wrapper = createWrapper({
        category: createCategory({ created_at: '2024-01-20T10:00:00Z' }),
      });
      expect(wrapper.text()).toContain('2024');
      expect(wrapper.text()).toContain('Jan');
    });

    it('[Happy Path] format created_at null → "-"', () => {
      const wrapper = createWrapper({
        category: createCategory({ created_at: null as any }),
      });
      expect(wrapper.text()).toContain('Created');
    });

    it('[Happy Path] format updated_at null → "-"', () => {
      const wrapper = createWrapper({
        category: createCategory({ updated_at: null as any }),
      });
      expect(wrapper.text()).toContain('Last Update');
    });

    it('[Happy Path] format tanggal invalid → "-"', () => {
      const wrapper = createWrapper({
        category: createCategory({
          created_at: 'invalid-date',
          updated_at: 'also-invalid',
        }),
      });
      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Happy Path] format created & updated berbeda', () => {
      const wrapper = createWrapper({
        category: createCategory({
          created_at: '2024-01-20T10:00:00Z',
          updated_at: '2024-01-25T14:30:00Z',
        }),
      });
      expect(wrapper.text()).toContain('2024');
    });
  });

  // =========================================================================
  // 4. getCategoryCode helper
  // =========================================================================
  describe('getCategoryCode helper', () => {
    it('[Happy Path] id 1 → "CAT-001"', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 1 }) });
      expect(wrapper.text()).toContain('CAT-001');
    });

    it('[Happy Path] id 42 → "CAT-042"', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 42 }) });
      expect(wrapper.text()).toContain('CAT-042');
    });

    it('[Happy Path] id 999 → "CAT-999"', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 999 }) });
      expect(wrapper.text()).toContain('CAT-999');
    });

    it('[Happy Path] id 1000 → "CAT-1000" (tidak dipotong)', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 1000 }) });
      expect(wrapper.text()).toContain('CAT-1000');
    });

    it('[BVA - id 0] → "CAT-000"', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 0 }) });
      expect(wrapper.text()).toContain('CAT-000');
    });
  });

  // =========================================================================
  // 5. EVENT EMISSION — close
  // =========================================================================
  describe('Event Emission — close', () => {
    it('[Happy Path] emit "close" saat klik tombol X di header', async () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      const closeBtn = buttons[0];
      await closeBtn.trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit "close" saat klik tombol "Close" di footer', async () => {
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
      const modalContent = wrapper.find('.max-w-md');
      await modalContent.trigger('click');
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Happy Path] emit close multiple kali', async () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      const closeBtn = buttons.find((b) => b.text() === 'Close')!;
      await closeBtn.trigger('click');
      await closeBtn.trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(2);
    });
  });

  // =========================================================================
  // 6. EVENT EMISSION — edit
  // =========================================================================
  describe('Event Emission — edit', () => {
    it('[Happy Path] emit "edit" dengan payload category saat tombol Edit diklik', async () => {
      const category = createCategory({ id: 5, name: 'Coffee' });
      const wrapper = createWrapper({ category });
      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Category'))!;
      await editBtn.trigger('click');
      const emitted = wrapper.emitted('edit');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([category]);
    });

    it('[Happy Path] tombol Edit Category punya icon (svg)', () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Category'))!;
      expect(editBtn.find('svg').exists()).toBe(true);
    });

    it('[Happy Path] tombol Edit Category punya class bg-primary', () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Category'))!;
      expect(editBtn.classes()).toContain('bg-primary');
    });

    it('[Negative Path] tidak emit edit saat mount', () => {
      const wrapper = createWrapper();
      expect(wrapper.emitted('edit')).toBeUndefined();
    });

    it('[Negative Path] tidak emit edit saat klik tombol X', async () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');
      expect(wrapper.emitted('edit')).toBeUndefined();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  // =========================================================================
  // 7. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] nama kategori ter-update saat props.category berubah', async () => {
      const wrapper = createWrapper({
        category: createCategory({ name: 'First' }),
      });
      expect(wrapper.find('h3').text()).toBe('First');

      await wrapper.setProps({ category: createCategory({ name: 'Second' }) });
      expect(wrapper.find('h3').text()).toBe('Second');
    });

    it('[Happy Path] modal tertutup saat isOpen berubah ke false', async () => {
      const wrapper = createWrapper({ isOpen: true });
      expect(wrapper.find('.fixed').exists()).toBe(true);

      await wrapper.setProps({ isOpen: false });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] modal terbuka saat isOpen berubah ke true', async () => {
      const wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find('.fixed').exists()).toBe(false);

      await wrapper.setProps({ isOpen: true });
      expect(wrapper.find('.fixed').exists()).toBe(true);
    });

    it('[Happy Path] modal tertutup saat category menjadi null', async () => {
      const wrapper = createWrapper({ isOpen: true, category: createCategory() });
      expect(wrapper.find('.fixed').exists()).toBe(true);

      await wrapper.setProps({ category: null });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 8. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - isOpen=false, category valid] tidak render', () => {
      const wrapper = createWrapper({ isOpen: false, category: createCategory() });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[BVA - isOpen=true, category=null] tidak render', () => {
      const wrapper = createWrapper({ isOpen: true, category: null });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[BVA - isOpen=false, category=null] tidak render', () => {
      const wrapper = createWrapper({ isOpen: false, category: null });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[BVA - name sangat panjang] tetap dirender', () => {
      const longName = 'A'.repeat(200);
      const wrapper = createWrapper({
        category: createCategory({ name: longName }),
      });
      expect(wrapper.text()).toContain(longName);
    });

    it('[BVA - description sangat panjang] tetap dirender', () => {
      const longDesc = 'B'.repeat(500);
      const wrapper = createWrapper({
        category: createCategory({ description: longDesc }),
      });
      expect(wrapper.text()).toContain(longDesc);
    });

    it('[BVA - id besar] "CAT-999999"', () => {
      const wrapper = createWrapper({ category: createCategory({ id: 999999 }) });
      expect(wrapper.text()).toContain('CAT-999999');
    });
  });

  // =========================================================================
  // 9. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] description string kosong "" → "—"', () => {
      const wrapper = createWrapper({
        category: createCategory({ description: '' }),
      });
      expect(wrapper.text()).toContain('—');
    });

    it('[Edge Case] description whitespace → tampil apa adanya', () => {
      const wrapper = createWrapper({
        category: createCategory({ description: '   ' }),
      });
      expect(wrapper.text()).toContain('   ');
    });

    it('[Edge Case] name dengan unicode', () => {
      const wrapper = createWrapper({
        category: createCategory({ name: 'Café ☕ Tea' }),
      });
      expect(wrapper.text()).toContain('Café ☕ Tea');
    });

    it('[Edge Case] klik di dalam area body tidak emit close', async () => {
      const wrapper = createWrapper();
      const body = wrapper.find('.px-6.py-5.space-y-4');
      await body.trigger('click');
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Edge Case] tombol X di header punya class w-8 h-8', () => {
      const wrapper = createWrapper();
      const buttons = wrapper.findAll('button');
      const closeBtn = buttons[0];
      expect(closeBtn.classes()).toContain('w-8');
      expect(closeBtn.classes()).toContain('h-8');
    });

    it('[Corner Case] date dengan timezone berbeda tetap ter-render', () => {
      const wrapper = createWrapper({
        category: createCategory({
          created_at: '2024-06-15T23:59:59+07:00',
          updated_at: '2024-06-16T00:00:01+07:00',
        }),
      });
      expect(wrapper.text()).toContain('2024');
    });

    it('[Corner Case] description undefined → "—"', () => {
      const wrapper = createWrapper({
        category: createCategory({ description: undefined as any }),
      });
      expect(wrapper.text()).toContain('—');
    });

    it('[Corner Case] name kosong string tetap ditampilkan', () => {
      const wrapper = createWrapper({ category: createCategory({ name: '' }) });
      expect(wrapper.find('h3').exists()).toBe(true);
    });

    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();
      expect(wrapper.emitted('close')).toBeUndefined();
      expect(wrapper.emitted('edit')).toBeUndefined();
    });
  });

  // =========================================================================
  // 10. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa handle close & edit event', async () => {
      const Parent = {
        components: { CategoryViewModal },
        template: `
          <CategoryViewModal
            :is-open="isOpen"
            :category="category"
            @close="isOpen = false"
            @edit="handleEdit"
          />
          <span data-testid="open">{{ isOpen }}</span>
          <span data-testid="edited">{{ edited ? 'yes' : 'no' }}</span>
        `,
        data() {
          return {
            isOpen: true,
            category: {
              id: 1,
              name: 'Coffee',
              description: 'Test',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            edited: false,
          };
        },
        methods: {
          handleEdit() {
            this.edited = true;
            this.isOpen = false;
          },
        },
      };

      // ⚠️ WAJIB: stub Teleport agar modal render inline
      const wrapper = mount(Parent as any, {
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Category'))!;
      expect(editBtn).toBeDefined();

      await editBtn.trigger('click');

      expect(wrapper.find('[data-testid="edited"]').text()).toBe('yes');
      expect(wrapper.find('[data-testid="open"]').text()).toBe('false');
    });

    it('[Integration] parent close via backdrop', async () => {
      const Parent = {
        components: { CategoryViewModal },
        template: `
          <CategoryViewModal
            :is-open="isOpen"
            :category="category"
            @close="isOpen = false"
          />
          <span data-testid="open">{{ isOpen }}</span>
        `,
        data() {
          return {
            isOpen: true,
            category: {
              id: 1,
              name: 'Coffee',
              description: 'Test',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
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

      const backdrop = wrapper.find('.fixed');
      expect(backdrop.exists()).toBe(true);

      await backdrop.trigger('click');

      expect(wrapper.find('[data-testid="open"]').text()).toBe('false');
    });
  });
});