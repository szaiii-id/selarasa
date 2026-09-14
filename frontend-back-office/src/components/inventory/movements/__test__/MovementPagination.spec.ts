import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementPagination from '../MovementPagination.vue';

describe('MovementPagination.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MovementPagination, {
      props: {
        currentPage: 1,
        lastPage: 1,
        total: 0,
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender total movements dengan benar', () => {
      const wrapper = createWrapper({ total: 42 });

      expect(wrapper.text()).toContain('Total:');
      expect(wrapper.text()).toContain('42');
      expect(wrapper.text()).toContain('movements');
    });

    it('[Happy Path] total di-render dalam tag <strong>', () => {
      const wrapper = createWrapper({ total: 42 });

      const strong = wrapper.find('strong');
      expect(strong.exists()).toBe(true);
      expect(strong.text()).toBe('42');
    });

    it('[Happy Path] menampilkan currentPage / lastPage', () => {
      const wrapper = createWrapper({ currentPage: 2, lastPage: 5 });

      expect(wrapper.text()).toContain('2');
      expect(wrapper.text()).toContain('/ 5');
    });

    it('[Happy Path] merender tombol Prev', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const prevBtn = buttons[0];
      expect(prevBtn.text()).toContain('Prev');
    });

    it('[Happy Path] merender tombol Next', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const nextBtn = buttons[2];
      expect(nextBtn.text()).toContain('Next');
    });

    it('[Happy Path] merender indikator halaman (button di tengah)', () => {
      const wrapper = createWrapper({ currentPage: 3, lastPage: 10 });

      const buttons = wrapper.findAll('button');
      const indicatorBtn = buttons[1];
      expect(indicatorBtn.text()).toContain('3');
      expect(indicatorBtn.text()).toContain('/ 10');
    });

    it('[Happy Path] merender 3 button (prev, indicator, next)', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(3);
    });

    it('[Happy Path] merender 2 SVG icon (chevron left + right)', () => {
      const wrapper = createWrapper();

      const svgs = wrapper.findAll('svg');
      expect(svgs).toHaveLength(2);
    });

    it('[Happy Path] root punya class flex justify-between', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('flex');
      expect(root.classes()).toContain('justify-between');
      expect(root.classes()).toContain('items-center');
    });

    it('[Happy Path] root punya class border-t dan mt-auto', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('border-t');
      expect(root.classes()).toContain('mt-auto');
    });
  });

  // =========================================================================
  // 2. PREV/NEXT BUTTON STATE
  // =========================================================================
  describe('Prev/Next Button State', () => {
    it('[Happy Path] Prev disabled saat currentPage = 1', () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      const prevBtn = buttons[0];
      expect(prevBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Prev enabled saat currentPage > 1', () => {
      const wrapper = createWrapper({ currentPage: 2, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      const prevBtn = buttons[0];
      expect(prevBtn.attributes('disabled')).toBeUndefined();
    });

    it('[Happy Path] Next disabled saat currentPage = lastPage', () => {
      const wrapper = createWrapper({ currentPage: 5, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      const nextBtn = buttons[2];
      expect(nextBtn.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Next enabled saat currentPage < lastPage', () => {
      const wrapper = createWrapper({ currentPage: 3, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      const nextBtn = buttons[2];
      expect(nextBtn.attributes('disabled')).toBeUndefined();
    });

    it('[Happy Path] Prev & Next disabled saat single page', () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 1 });

      const buttons = wrapper.findAll('button');
      expect(buttons[0].attributes('disabled')).toBeDefined();
      expect(buttons[2].attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Prev disabled styling class ada saat disabled', () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      const prevBtn = buttons[0];
      expect(prevBtn.classes()).toContain('disabled:opacity-50');
      expect(prevBtn.classes()).toContain('disabled:cursor-not-allowed');
    });
  });

  // =========================================================================
  // 3. EVENT EMISSION — prev
  // =========================================================================
  describe('Event Emission — prev', () => {
    it('[Happy Path] emit "prev" saat tombol Prev diklik', async () => {
      const wrapper = createWrapper({ currentPage: 2, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');

      expect(wrapper.emitted('prev')).toBeTruthy();
      expect(wrapper.emitted('prev')).toHaveLength(1);
    });

    it('[Happy Path] emit "prev" tanpa payload', async () => {
      const wrapper = createWrapper({ currentPage: 3, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');

      const emitted = wrapper.emitted('prev');
      expect(emitted![0]).toEqual([]);
    });

    it('[Negative Path] Prev disabled tidak emit "prev" saat diklik', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');

      expect(wrapper.emitted('prev')).toBeUndefined();
    });

    it('[Happy Path] emit "prev" multiple kali', async () => {
      const wrapper = createWrapper({ currentPage: 3, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');
      await buttons[0].trigger('click');
      await buttons[0].trigger('click');

      expect(wrapper.emitted('prev')).toHaveLength(3);
    });
  });

  // =========================================================================
  // 4. EVENT EMISSION — next
  // =========================================================================
  describe('Event Emission — next', () => {
    it('[Happy Path] emit "next" saat tombol Next diklik', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[2].trigger('click');

      expect(wrapper.emitted('next')).toBeTruthy();
      expect(wrapper.emitted('next')).toHaveLength(1);
    });

    it('[Happy Path] emit "next" tanpa payload', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[2].trigger('click');

      const emitted = wrapper.emitted('next');
      expect(emitted![0]).toEqual([]);
    });

    it('[Negative Path] Next disabled tidak emit "next" saat diklik', async () => {
      const wrapper = createWrapper({ currentPage: 5, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[2].trigger('click');

      expect(wrapper.emitted('next')).toBeUndefined();
    });

    it('[Happy Path] emit "next" multiple kali', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[2].trigger('click');
      await buttons[2].trigger('click');

      expect(wrapper.emitted('next')).toHaveLength(2);
    });

    it('[Happy Path] emit prev & next terpisah', async () => {
      const wrapper = createWrapper({ currentPage: 3, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click'); // prev
      await buttons[2].trigger('click'); // next

      expect(wrapper.emitted('prev')).toHaveLength(1);
      expect(wrapper.emitted('next')).toHaveLength(1);
    });
  });

  // =========================================================================
  // 5. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - currentPage=1, lastPage=1] Prev & Next disabled', () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 1 });

      const buttons = wrapper.findAll('button');
      expect(buttons[0].attributes('disabled')).toBeDefined();
      expect(buttons[2].attributes('disabled')).toBeDefined();
    });

    it('[BVA - currentPage=1, lastPage=2] Prev disabled, Next enabled', () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 2 });

      const buttons = wrapper.findAll('button');
      expect(buttons[0].attributes('disabled')).toBeDefined();
      expect(buttons[2].attributes('disabled')).toBeUndefined();
    });

    it('[BVA - currentPage=2, lastPage=2] Prev enabled, Next disabled', () => {
      const wrapper = createWrapper({ currentPage: 2, lastPage: 2 });

      const buttons = wrapper.findAll('button');
      expect(buttons[0].attributes('disabled')).toBeUndefined();
      expect(buttons[2].attributes('disabled')).toBeDefined();
    });

    it('[BVA - currentPage di tengah] Prev & Next enabled', () => {
      const wrapper = createWrapper({ currentPage: 5, lastPage: 10 });

      const buttons = wrapper.findAll('button');
      expect(buttons[0].attributes('disabled')).toBeUndefined();
      expect(buttons[2].attributes('disabled')).toBeUndefined();
    });

    it('[BVA - total=0] tetap render "Total: 0 movements"', () => {
      const wrapper = createWrapper({ total: 0, currentPage: 1, lastPage: 1 });

      expect(wrapper.text()).toContain('Total:');
      expect(wrapper.find('strong').text()).toBe('0');
    });

    it('[BVA - total besar] total=999999', () => {
      const wrapper = createWrapper({ total: 999999 });

      expect(wrapper.find('strong').text()).toBe('999999');
    });

    it('[BVA - lastPage besar] currentPage=1, lastPage=1000', () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 1000 });

      const buttons = wrapper.findAll('button');
      const indicator = buttons[1];
      expect(indicator.text()).toContain('1');
      expect(indicator.text()).toContain('/ 1000');
    });
  });

  // =========================================================================
  // 6. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] total ter-update saat props berubah', async () => {
      const wrapper = createWrapper({ total: 10 });

      expect(wrapper.find('strong').text()).toBe('10');

      await wrapper.setProps({ total: 50 });
      expect(wrapper.find('strong').text()).toBe('50');
    });

    it('[Happy Path] indikator halaman ter-update', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      await wrapper.setProps({ currentPage: 3 });

      const buttons = wrapper.findAll('button');
      expect(buttons[1].text()).toContain('3');
    });

    it('[Happy Path] Prev enabled setelah currentPage berubah dari 1 ke 2', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      expect(buttons[0].attributes('disabled')).toBeDefined();

      await wrapper.setProps({ currentPage: 2 });
      expect(buttons[0].attributes('disabled')).toBeUndefined();
    });

    it('[Happy Path] Next disabled setelah currentPage sama dengan lastPage', async () => {
      const wrapper = createWrapper({ currentPage: 4, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      expect(buttons[2].attributes('disabled')).toBeUndefined();

      await wrapper.setProps({ currentPage: 5 });
      expect(buttons[2].attributes('disabled')).toBeDefined();
    });
  });

  // =========================================================================
  // 7. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('prev')).toBeUndefined();
      expect(wrapper.emitted('next')).toBeUndefined();
    });

    it('[Edge Case] klik indikator halaman tidak emit apapun', async () => {
      const wrapper = createWrapper({ currentPage: 3, lastPage: 5 });

      const buttons = wrapper.findAll('button');
      const indicator = buttons[1];
      await indicator.trigger('click');

      expect(wrapper.emitted('prev')).toBeUndefined();
      expect(wrapper.emitted('next')).toBeUndefined();
    });

    it('[Edge Case] indikator halaman punya class bg-primary (highlight)', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const indicator = buttons[1];
      expect(indicator.classes()).toContain('bg-primary');
      expect(indicator.classes()).toContain('font-bold');
    });

    it('[Corner Case] klik tombol Prev disabled tidak emit meski VTU bisa trigger', async () => {
      const wrapper = createWrapper({ currentPage: 1, lastPage: 5 });

      const prevBtn = wrapper.findAll('button')[0];
      await prevBtn.trigger('click');

      expect(wrapper.emitted('prev')).toBeUndefined();
    });

    it('[Corner Case] SVG chevron kiri ada di tombol Prev', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const prevBtn = buttons[0];
      expect(prevBtn.find('svg').exists()).toBe(true);
    });

    it('[Corner Case] SVG chevron kanan ada di tombol Next', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const nextBtn = buttons[2];
      expect(nextBtn.find('svg').exists()).toBe(true);
    });

    it('[Edge Case] indikator halaman min-width 40px', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const indicator = buttons[1];
      expect(indicator.classes()).toContain('min-w-[40px]');
    });

    it('[Corner Case] total dengan angka besar (>1000)', () => {
      const wrapper = createWrapper({ total: 123456 });

      expect(wrapper.find('strong').text()).toBe('123456');
    });

    it('[Corner Case] lastPage bisa bernilai 0 saat total=0', () => {
      const wrapper = createWrapper({ total: 0, currentPage: 1, lastPage: 0 });

      const buttons = wrapper.findAll('button');
      expect(buttons[2].attributes('disabled')).toBeDefined();
    });

    it('[Edge Case] teks "movements" muncul bukan "categories" atau "materials"', () => {
      const wrapper = createWrapper({ total: 10 });

      expect(wrapper.text()).toContain('movements');
      expect(wrapper.text()).not.toContain('categories');
      expect(wrapper.text()).not.toContain('materials');
    });
  });

  // =========================================================================
  // 8. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent handle prev & next untuk update page', async () => {
      const Parent = {
        components: { MovementPagination },
        template: `
          <MovementPagination
            :current-page="page"
            :last-page="5"
            :total="50"
            @prev="page--"
            @next="page++"
          />
          <span data-testid="page">{{ page }}</span>
        `,
        data() {
          return { page: 3 };
        },
      };

      const wrapper = mount(Parent as any);
      const buttons = wrapper.findAll('button');

      expect(wrapper.find('[data-testid="page"]').text()).toBe('3');

      await buttons[2].trigger('click'); // next
      expect(wrapper.find('[data-testid="page"]').text()).toBe('4');

      await buttons[0].trigger('click'); // prev
      expect(wrapper.find('[data-testid="page"]').text()).toBe('3');
    });

    it('[Integration] prev disabled saat page=1 di parent', async () => {
      const Parent = {
        components: { MovementPagination },
        template: `
          <MovementPagination
            :current-page="page"
            :last-page="5"
            :total="50"
            @prev="page--"
            @next="page++"
          />
        `,
        data() {
          return { page: 1 };
        },
      };

      const wrapper = mount(Parent as any);
      const buttons = wrapper.findAll('button');

      expect(buttons[0].attributes('disabled')).toBeDefined();
      expect(buttons[2].attributes('disabled')).toBeUndefined();
    });
  });
});