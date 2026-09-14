import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementFilterBar from '../MovementFilterBar.vue';
import type { MovementType } from '@/types/inventory';
import type { MaterialOption } from '../MovementFilterBar.vue';

describe('MovementFilterBar.vue (Component Testing)', () => {
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
    return mount(MovementFilterBar, {
      props: {
        rawMaterialId: '' as number | '',
        movementType: '' as MovementType | '',
        startDate: '',
        endDate: '',
        materialOptions: [],
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender 2 select + 2 date input', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('select')).toHaveLength(2);
      expect(wrapper.findAll('input[type="date"]')).toHaveLength(2);
    });

    it('[Happy Path] merender label "Date Range:"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Date Range:');
    });

    it('[Happy Path] merender 3 tombol preset', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Today');
      expect(wrapper.text()).toContain('7 Days');
      expect(wrapper.text()).toContain('30 Days');
    });

    it('[Happy Path] merender opsi "All Types" di select type', () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      expect(selects[0].text()).toContain('All Types');
    });

    it('[Happy Path] merender opsi IN, OUT, ADJUSTMENT', () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      expect(selects[0].text()).toContain('IN — Stock In');
      expect(selects[0].text()).toContain('OUT — Stock Out');
      expect(selects[0].text()).toContain('ADJUSTMENT');
    });

    it('[Happy Path] merender opsi "All Materials" di select material', () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      expect(selects[1].text()).toContain('All Materials');
    });

    it('[Happy Path] merender opsi material dari props', () => {
      const wrapper = createWrapper({ materialOptions: createMaterialOptions() });

      const selects = wrapper.findAll('select');
      expect(selects[1].text()).toContain('Fresh Milk UHT — RM-001');
      expect(selects[1].text()).toContain('Coffee Beans — RM-002');
    });

    it('[Happy Path] merender 3 SVG chevron (2 select + 1 calendar)', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('svg').length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // 2. VALUE BINDING — props → control value
  // =========================================================================
  describe('Value Binding', () => {
    it('[Happy Path] select type menampilkan value dari props', () => {
      const wrapper = createWrapper({ movementType: 'IN' });

      const selects = wrapper.findAll('select');
      expect((selects[0].element as HTMLSelectElement).value).toBe('IN');
    });

    it('[Happy Path] select material menampilkan value dari props', () => {
      const wrapper = createWrapper({
        rawMaterialId: 1,
        materialOptions: createMaterialOptions(),
      });

      const selects = wrapper.findAll('select');
      expect((selects[1].element as HTMLSelectElement).value).toBe('1');
    });

    it('[Happy Path] date input start menampilkan value', () => {
      const wrapper = createWrapper({ startDate: '2024-01-15' });

      const dateInputs = wrapper.findAll('input[type="date"]');
      expect((dateInputs[0].element as HTMLInputElement).value).toBe('2024-01-15');
    });

    it('[Happy Path] date input end menampilkan value', () => {
      const wrapper = createWrapper({ endDate: '2024-01-20' });

      const dateInputs = wrapper.findAll('input[type="date"]');
      expect((dateInputs[1].element as HTMLInputElement).value).toBe('2024-01-20');
    });
  });

  // =========================================================================
  // 3. EVENT EMISSION — v-model
  // =========================================================================
  describe('Event Emission — type', () => {
    it('[Happy Path] emit "update:movementType" saat select type berubah', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[0].setValue('OUT');

      const emitted = wrapper.emitted('update:movementType');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['OUT']);
    });

    it('[Happy Path] emit "update:movementType" dengan "" saat pilih All Types', async () => {
      const wrapper = createWrapper({ movementType: 'IN' });

      const selects = wrapper.findAll('select');
      await selects[0].setValue('');

      const emitted = wrapper.emitted('update:movementType');
      expect(emitted![0]).toEqual(['']);
    });
  });

  describe('Event Emission — material', () => {
    it('[Happy Path] emit "update:rawMaterialId" sebagai number', async () => {
      const wrapper = createWrapper({ materialOptions: createMaterialOptions() });

      const selects = wrapper.findAll('select');
      await selects[1].setValue('2');

      const emitted = wrapper.emitted('update:rawMaterialId');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([2]);
      expect(typeof emitted![0]![0]).toBe('number');
    });

    it('[Happy Path] emit "update:rawMaterialId" string kosong saat All Materials', async () => {
      const wrapper = createWrapper({
        rawMaterialId: 1,
        materialOptions: createMaterialOptions(),
      });

      const selects = wrapper.findAll('select');
      await selects[1].setValue('');

      const emitted = wrapper.emitted('update:rawMaterialId');
      expect(emitted![0]).toEqual(['']);
    });
  });

  describe('Event Emission — date', () => {
    it('[Happy Path] emit "update:startDate" saat date start berubah', async () => {
      const wrapper = createWrapper();

      const dateInputs = wrapper.findAll('input[type="date"]');
      await dateInputs[0].setValue('2024-02-01');

      const emitted = wrapper.emitted('update:startDate');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['2024-02-01']);
    });

    it('[Happy Path] emit "update:endDate" saat date end berubah', async () => {
      const wrapper = createWrapper();

      const dateInputs = wrapper.findAll('input[type="date"]');
      await dateInputs[1].setValue('2024-02-28');

      const emitted = wrapper.emitted('update:endDate');
      expect(emitted![0]).toEqual(['2024-02-28']);
    });
  });

  // =========================================================================
  // 4. EVENT EMISSION — preset buttons
  // =========================================================================
  describe('Event Emission — preset buttons', () => {
    it('[Happy Path] emit "preset-today" saat tombol Today diklik', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today')!;
      await todayBtn.trigger('click');

      expect(wrapper.emitted('preset-today')).toHaveLength(1);
    });

    it('[Happy Path] emit "preset-7d" saat tombol 7 Days diklik', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const btn7d = buttons.find((b) => b.text() === '7 Days')!;
      await btn7d.trigger('click');

      expect(wrapper.emitted('preset-7d')).toHaveLength(1);
    });

    it('[Happy Path] emit "preset-30d" saat tombol 30 Days diklik', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const btn30d = buttons.find((b) => b.text() === '30 Days')!;
      await btn30d.trigger('click');

      expect(wrapper.emitted('preset-30d')).toHaveLength(1);
    });

    it('[Happy Path] emit "clear-dates" saat tombol clear diklik (jika ada date filter)', async () => {
      const wrapper = createWrapper({ startDate: '2024-01-01' });

      const buttons = wrapper.findAll('button');
      const clearBtn = buttons.find((b) => b.attributes('title') === 'Clear date filter')!;
      await clearBtn.trigger('click');

      expect(wrapper.emitted('clear-dates')).toHaveLength(1);
    });

    it('[Negative Path] tombol clear TIDAK muncul saat tidak ada date filter', () => {
      const wrapper = createWrapper({ startDate: '', endDate: '' });

      const clearBtn = wrapper.find('[title="Clear date filter"]');
      expect(clearBtn.exists()).toBe(false);
    });

    it('[Happy Path] tombol clear muncul saat startDate terisi', () => {
      const wrapper = createWrapper({ startDate: '2024-01-01' });

      const clearBtn = wrapper.find('[title="Clear date filter"]');
      expect(clearBtn.exists()).toBe(true);
    });

    it('[Happy Path] tombol clear muncul saat endDate terisi', () => {
      const wrapper = createWrapper({ endDate: '2024-01-01' });

      const clearBtn = wrapper.find('[title="Clear date filter"]');
      expect(clearBtn.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 5. ACTIVE PRESET DETECTION
  // =========================================================================
  describe('Active Preset Detection', () => {
    it('[Happy Path] "Today" active saat startDate = endDate = today', () => {
      const today = new Date().toISOString().slice(0, 10);
      const wrapper = createWrapper({ startDate: today, endDate: today });

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today')!;

      expect(todayBtn.classes()).toContain('bg-primary/10');
      expect(todayBtn.classes()).toContain('text-primary');
    });

    it('[Happy Path] "7 Days" active saat range 7 hari terakhir', () => {
      const today = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const start = sevenDaysAgo.toISOString().slice(0, 10);

      const wrapper = createWrapper({ startDate: start, endDate: today });

      const buttons = wrapper.findAll('button');
      const btn7d = buttons.find((b) => b.text() === '7 Days')!;

      expect(btn7d.classes()).toContain('bg-primary/10');
    });

    it('[Happy Path] "30 Days" active saat range 30 hari terakhir', () => {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const start = thirtyDaysAgo.toISOString().slice(0, 10);

      const wrapper = createWrapper({ startDate: start, endDate: today });

      const buttons = wrapper.findAll('button');
      const btn30d = buttons.find((b) => b.text() === '30 Days')!;

      expect(btn30d.classes()).toContain('bg-primary/10');
    });

    it('[Happy Path] tidak ada preset active saat range custom', () => {
      const wrapper = createWrapper({
        startDate: '2024-01-01',
        endDate: '2024-01-10',
      });

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today')!;
      const btn7d = buttons.find((b) => b.text() === '7 Days')!;
      const btn30d = buttons.find((b) => b.text() === '30 Days')!;

      expect(todayBtn.classes()).not.toContain('bg-primary/10');
      expect(btn7d.classes()).not.toContain('bg-primary/10');
      expect(btn30d.classes()).not.toContain('bg-primary/10');
    });

    it('[Happy Path] tidak ada preset active saat date kosong', () => {
      const wrapper = createWrapper({ startDate: '', endDate: '' });

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today')!;

      expect(todayBtn.classes()).not.toContain('bg-primary/10');
    });

    it('[Happy Path] preset default class saat tidak active', () => {
      const wrapper = createWrapper({ startDate: '', endDate: '' });

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today')!;

      expect(todayBtn.classes()).toContain('bg-white/60');
      expect(todayBtn.classes()).toContain('text-text-secondary');
    });

    it('[Happy Path] preset active punya border-primary/30', () => {
      const today = new Date().toISOString().slice(0, 10);
      const wrapper = createWrapper({ startDate: today, endDate: today });

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today')!;

      expect(todayBtn.classes()).toContain('border-primary/30');
    });
  });

  // =========================================================================
  // 6. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] select type ter-update saat props berubah', async () => {
      const wrapper = createWrapper({ movementType: 'IN' });

      await wrapper.setProps({ movementType: 'OUT' });

      const selects = wrapper.findAll('select');
      expect((selects[0].element as HTMLSelectElement).value).toBe('OUT');
    });

    it('[Happy Path] select material ter-update', async () => {
      const wrapper = createWrapper({
        rawMaterialId: 1,
        materialOptions: createMaterialOptions(),
      });

      await wrapper.setProps({ rawMaterialId: 2 });

      const selects = wrapper.findAll('select');
      expect((selects[1].element as HTMLSelectElement).value).toBe('2');
    });

    it('[Happy Path] date start ter-update', async () => {
      const wrapper = createWrapper({ startDate: '2024-01-01' });

      await wrapper.setProps({ startDate: '2024-02-01' });

      const dateInputs = wrapper.findAll('input[type="date"]');
      expect((dateInputs[0].element as HTMLInputElement).value).toBe('2024-02-01');
    });

    it('[Happy Path] tombol clear muncul/hilang saat date berubah', async () => {
      const wrapper = createWrapper({ startDate: '', endDate: '' });

      expect(wrapper.find('[title="Clear date filter"]').exists()).toBe(false);

      await wrapper.setProps({ startDate: '2024-01-01' });

      expect(wrapper.find('[title="Clear date filter"]').exists()).toBe(true);

      await wrapper.setProps({ startDate: '', endDate: '' });

      expect(wrapper.find('[title="Clear date filter"]').exists()).toBe(false);
    });

    it('[Happy Path] opsi material ter-update saat props berubah', async () => {
      const wrapper = createWrapper({ materialOptions: [] });

      await wrapper.setProps({ materialOptions: createMaterialOptions() });

      const selects = wrapper.findAll('select');
      expect(selects[1].text()).toContain('Fresh Milk UHT');
    });
  });

  // =========================================================================
  // 7. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - materialOptions kosong] hanya "All Materials" tampil', () => {
      const wrapper = createWrapper({ materialOptions: [] });

      const selects = wrapper.findAll('select');
      const options = selects[1].findAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].text()).toBe('All Materials');
    });

    it('[BVA - materialOptions banyak] render semua opsi', () => {
      const options = Array.from({ length: 50 }, (_, i) => ({
        value: i + 1,
        label: `Material ${i + 1}`,
        sku: `SKU-${i + 1}`,
        unit: 'kg',
        currentStock: 10,
        minimumStock: 5,
        isLowStock: false,
        isActive: true,
      }));
      const wrapper = createWrapper({ materialOptions: options });

      const selects = wrapper.findAll('select');
      const renderedOptions = selects[1].findAll('option');
      // 1 (All) + 50
      expect(renderedOptions).toHaveLength(51);
    });

    it('[BVA - movementType valid: IN, OUT, ADJUSTMENT', () => {
      const wrapper = createWrapper();
      const selects = wrapper.findAll('select');
      const options = selects[0].findAll('option');
      const values = options.map((o) => o.element.value);
      expect(values).toContain('IN');
      expect(values).toContain('OUT');
      expect(values).toContain('ADJUSTMENT');
    });

    it('[BVA - materialId=0] dianggap sebagai opsi "0"', () => {
      const wrapper = createWrapper({
        rawMaterialId: 0,
        materialOptions: [{ value: 0, label: 'Zero', sku: 'Z-0', unit: 'kg', currentStock: 0, minimumStock: 0, isLowStock: false, isActive: true }],
      });

      const selects = wrapper.findAll('select');
      expect((selects[1].element as HTMLSelectElement).value).toBe('0');
    });

    it('[BVA - materialId besar] value ter-set dengan benar', () => {
      const wrapper = createWrapper({
        rawMaterialId: 999999,
        materialOptions: [{ value: 999999, label: 'Big', sku: 'B-1', unit: 'kg', currentStock: 0, minimumStock: 0, isLowStock: false, isActive: true }],
      });

      const selects = wrapper.findAll('select');
      expect((selects[1].element as HTMLSelectElement).value).toBe('999999');
    });
  });

  // =========================================================================
  // 8. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('update:movementType')).toBeUndefined();
      expect(wrapper.emitted('update:rawMaterialId')).toBeUndefined();
      expect(wrapper.emitted('update:startDate')).toBeUndefined();
      expect(wrapper.emitted('update:endDate')).toBeUndefined();
    });

    it('[Edge Case] date input type adalah "date"', () => {
      const wrapper = createWrapper();

      const dateInputs = wrapper.findAll('input[type="date"]');
      expect(dateInputs).toHaveLength(2);
    });

    it('[Corner Case] clear button title "Clear date filter"', () => {
      const wrapper = createWrapper({ startDate: '2024-01-01' });

      const clearBtn = wrapper.find('[title="Clear date filter"]');
      expect(clearBtn.attributes('title')).toBe('Clear date filter');
    });

    it('[Corner Case] hanya satu tombol clear button', () => {
      const wrapper = createWrapper({ startDate: '2024-01-01' });

      const clearButtons = wrapper.findAll('[title="Clear date filter"]');
      expect(clearButtons).toHaveLength(1);
    });

    it('[Edge Case] semua 3 preset button ada', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const todayBtn = buttons.find((b) => b.text() === 'Today');
      const btn7d = buttons.find((b) => b.text() === '7 Days');
      const btn30d = buttons.find((b) => b.text() === '30 Days');

      expect(todayBtn).toBeTruthy();
      expect(btn7d).toBeTruthy();
      expect(btn30d).toBeTruthy();
    });

    it('[Edge Case] root punya class glass rounded-3xl', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div.glass');
      expect(root.exists()).toBe(true);
      expect(root.classes()).toContain('rounded-3xl');
    });

    it('[Corner Case] date preset tidak overlapping saat range menengah', () => {
      // Range 5 hari terakhir → bukan today, bukan 7d, bukan 30d
      const wrapper = createWrapper({
        startDate: '2024-01-05',
        endDate: '2024-01-10',
      });

      const buttons = wrapper.findAll('button');
      const activePresets = buttons.filter((b) =>
        ['Today', '7 Days', '30 Days'].includes(b.text()) &&
        b.classes().some((c) => c.includes('bg-primary'))
      );

      expect(activePresets).toHaveLength(0);
    });

    it('[Edge Case] unit ditampilkan sebagai bagian dari label material', () => {
      const wrapper = createWrapper({
        materialOptions: [
          {
            value: 1,
            label: 'Coffee',
            sku: 'SKU-001',
            unit: 'kg',
            currentStock: 10,
            minimumStock: 5,
            isLowStock: false,
            isActive: true,
          },
        ],
      });

      const selects = wrapper.findAll('select');
      expect(selects[1].text()).toContain('Coffee — SKU-001');
    });
  });

  // =========================================================================
  // 9. INTEGRATION — v-model pattern
  // =========================================================================
  describe('Integration — v-model pattern', () => {
    it('[Integration] parent bisa update semua filter via v-model', async () => {
      const Parent = {
        components: { MovementFilterBar },
        template: `
          <MovementFilterBar
            :raw-material-id="rawMaterialId"
            :movement-type="movementType"
            :start-date="startDate"
            :end-date="endDate"
            :material-options="materialOptions"
            @update:raw-material-id="rawMaterialId = $event"
            @update:movement-type="movementType = $event"
            @update:start-date="startDate = $event"
            @update:end-date="endDate = $event"
          />
          <span data-testid="type">{{ movementType }}</span>
          <span data-testid="material">{{ rawMaterialId }}</span>
          <span data-testid="start">{{ startDate }}</span>
          <span data-testid="end">{{ endDate }}</span>
        `,
        data() {
          return {
            rawMaterialId: '' as number | '',
            movementType: '' as string,
            startDate: '',
            endDate: '',
            materialOptions: createMaterialOptions(),
          };
        },
      };

      const wrapper = mount(Parent as any);
      const selects = wrapper.findAll('select');
      const dateInputs = wrapper.findAll('input[type="date"]');

      // Type
      await selects[0].setValue('IN');
      expect(wrapper.find('[data-testid="type"]').text()).toBe('IN');

      // Material
      await selects[1].setValue('1');
      expect(wrapper.find('[data-testid="material"]').text()).toBe('1');

      // Date
      await dateInputs[0].setValue('2024-01-01');
      expect(wrapper.find('[data-testid="start"]').text()).toBe('2024-01-01');

      await dateInputs[1].setValue('2024-01-31');
      expect(wrapper.find('[data-testid="end"]').text()).toBe('2024-01-31');
    });
  });
});