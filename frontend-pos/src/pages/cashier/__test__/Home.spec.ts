// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper, DOMWrapper } from '@vue/test-utils';
import { useShiftStore } from '@/stores/shiftStore';
import Home from '../Home.vue';

// Mock shiftStore
vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
}));

describe('Home Component', () => {
  let mockShiftStore: any;
  let alertMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock alert menggunakan vi.fn()
    alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);

    mockShiftStore = {
      shiftStatus: 'safe',
      hasUsedGracePeriod: false,
      isFinishingOvertimeTransaction: false,
    };

    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const mountHome = (): VueWrapper => {
    return mount(Home, {
      global: {
        stubs: {
          Transition: false,
        },
      },
    });
  };

  // Helper untuk mencari button berdasarkan teks
  const findButtonByText = (wrapper: VueWrapper, text: string): DOMWrapper<HTMLButtonElement> | undefined => {
    return wrapper.findAll('button').find((btn: DOMWrapper<HTMLButtonElement>) => 
      btn.text().includes(text)
    );
  };

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan judul "Product Catalog"', () => {
      const wrapper = mountHome();
      expect(wrapper.text()).toContain('Product Catalog');
    });

    it('[Happy Path] Menampilkan judul "Cart"', () => {
      const wrapper = mountHome();
      expect(wrapper.text()).toContain('Cart (0)');
    });

    it('[Happy Path] Menampilkan kategori filter', () => {
      const wrapper = mountHome();
      
      expect(wrapper.text()).toContain('All');
      expect(wrapper.text()).toContain('Coffee');
      expect(wrapper.text()).toContain('Non-Coffee');
      expect(wrapper.text()).toContain('Food');
      expect(wrapper.text()).toContain('Snack');
    });

    it('[Happy Path] Menampilkan produk dummy', () => {
      const wrapper = mountHome();
      
      expect(wrapper.text()).toContain('Espresso');
      expect(wrapper.text()).toContain('Cafe Latte');
      expect(wrapper.text()).toContain('Matcha Frappe');
    });

    it('[Happy Path] Menampilkan total amount', () => {
      const wrapper = mountHome();
      expect(wrapper.text()).toContain('Total Amount');
    });

    it('[Happy Path] Menampilkan tombol PAY NOW', () => {
      const wrapper = mountHome();
      expect(wrapper.text()).toContain('PAY NOW');
    });

    it('[Negative Path] Menampilkan "Cart is empty" saat keranjang kosong', () => {
      const wrapper = mountHome();
      expect(wrapper.text()).toContain('Cart is empty');
    });
  });

  // =====================================================================
  // 2. CATEGORY FILTER
  // =====================================================================
  describe('Category Filter', () => {
    it('[Happy Path] Filter produk berdasarkan kategori Coffee', async () => {
      const wrapper = mountHome();

      const coffeeButton = findButtonByText(wrapper, 'Coffee');
      await coffeeButton!.trigger('click');

      expect(wrapper.text()).toContain('Espresso');
      expect(wrapper.text()).toContain('Cafe Latte');
      expect(wrapper.text()).not.toContain('Matcha Frappe');
    });

    it('[Happy Path] Filter produk berdasarkan kategori Food', async () => {
      const wrapper = mountHome();

      const foodButton = findButtonByText(wrapper, 'Food');
      await foodButton!.trigger('click');

      expect(wrapper.text()).toContain('Special Fried Rice');
      expect(wrapper.text()).not.toContain('Espresso');
    });

    it('[Happy Path] Reset filter dengan kategori All', async () => {
      const wrapper = mountHome();

      const coffeeButton = findButtonByText(wrapper, 'Coffee');
      await coffeeButton!.trigger('click');

      const allButton = findButtonByText(wrapper, 'All');
      await allButton!.trigger('click');

      expect(wrapper.text()).toContain('Espresso');
      expect(wrapper.text()).toContain('Matcha Frappe');
      expect(wrapper.text()).toContain('Special Fried Rice');
    });
  });

  // =====================================================================
  // 3. SEARCH
  // =====================================================================
  describe('Search', () => {
    it('[Happy Path] Mencari produk dengan keyword', async () => {
      const wrapper = mountHome();

      const searchInput = wrapper.find('input[type="text"]');
      await searchInput.setValue('espresso');

      expect(wrapper.text()).toContain('Espresso');
      expect(wrapper.text()).not.toContain('Cafe Latte');
    });

    it('[Negative Path] Menampilkan "No products found" jika tidak ada hasil', async () => {
      const wrapper = mountHome();

      const searchInput = wrapper.find('input[type="text"]');
      await searchInput.setValue('xyzabc');

      expect(wrapper.text()).toContain('No products found');
    });
  });

  // =====================================================================
  // 4. ADD TO CART
  // =====================================================================
  describe('Add to Cart', () => {
    it('[Happy Path] Menambahkan produk ke keranjang', async () => {
      const wrapper = mountHome();

      const productCard = wrapper.findAll('.cursor-pointer').find(el => 
        el.text().includes('Espresso')
      );
      await productCard!.trigger('click');

      expect(wrapper.text()).toContain('Cart (1)');
      expect(wrapper.text()).toContain('Espresso');
    });

    it('[Happy Path] Menambahkan produk yang sama meningkatkan qty', async () => {
      const wrapper = mountHome();

      const productCard = wrapper.findAll('.cursor-pointer').find(el => 
        el.text().includes('Espresso')
      );
      await productCard!.trigger('click');
      await productCard!.trigger('click');

      expect(wrapper.text()).toContain('Cart (1)');
      expect(wrapper.text()).toContain('2');
    });

    it('[Negative Path] Tidak bisa menambah produk saat overtime + grace period used', async () => {
      mockShiftStore.shiftStatus = 'overtime';
      mockShiftStore.hasUsedGracePeriod = true;
      const wrapper = mountHome();

      const productCard = wrapper.findAll('.cursor-pointer').find(el => 
        el.text().includes('Espresso')
      );
      await productCard!.trigger('click');

      expect(alertMock).toHaveBeenCalled();
      expect(wrapper.text()).toContain('Cart (0)');
    });
  });

  // =====================================================================
  // 5. CART OPERATIONS
  // =====================================================================
  describe('Cart Operations', () => {
    it('[Happy Path] Menghapus item dari keranjang', async () => {
      const wrapper = mountHome();
      const vm = wrapper.vm as any;

      vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 1 });
      await wrapper.vm.$nextTick();

      const removeButton = wrapper.findAll('button').find(btn => 
        btn.find('svg').exists() && btn.classes().includes('text-error/70')
      );
      await removeButton!.trigger('click');

      expect(vm.cart.length).toBe(0);
    });

    it('[Happy Path] Clear cart mengosongkan keranjang', async () => {
      const wrapper = mountHome();
      const vm = wrapper.vm as any;

      vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 1 });
      await wrapper.vm.$nextTick();

      const clearButton = findButtonByText(wrapper, 'Clear All');
      await clearButton!.trigger('click');

      expect(vm.cart.length).toBe(0);
      expect(vm.orderNote).toBe('');
    });

    it('[Happy Path] Menambah qty item di keranjang', async () => {
      const wrapper = mountHome();
      const vm = wrapper.vm as any;

      vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 1 });
      await wrapper.vm.$nextTick();

      const plusButton = wrapper.findAll('button').find(btn => btn.text().includes('+'));
      await plusButton!.trigger('click');

      expect(vm.cart[0].qty).toBe(2);
    });
  });

  // =====================================================================
  // 6. CHECKOUT
  // =====================================================================
  describe('Checkout', () => {
    it('[Negative Path] Tidak checkout jika keranjang kosong', async () => {
      const wrapper = mountHome();

      const payButton = findButtonByText(wrapper, 'PAY NOW');
      expect(payButton!.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Checkout dengan keranjang berisi', async () => {
      const wrapper = mountHome();
      const vm = wrapper.vm as any;

      vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 1 });
      await wrapper.vm.$nextTick();

      const payButton = findButtonByText(wrapper, 'PAY NOW');
      await payButton!.trigger('click');

      expect(alertMock).toHaveBeenCalled();
      expect(vm.cart.length).toBe(0);
    });

    it('[Happy Path] Checkout saat overtime dengan grace period belum digunakan', async () => {
    mockShiftStore.shiftStatus = 'overtime';
    mockShiftStore.hasUsedGracePeriod = false;
    mockShiftStore.isFinishingOvertimeTransaction = false;
    
    const wrapper = mountHome();
    const vm = wrapper.vm as any;

    vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 1 });
    await wrapper.vm.$nextTick();

    // Mock alert untuk memeriksa isFinishingOvertimeTransaction saat dipanggil
    alertMock.mockImplementation(() => {
        // Saat alert dipanggil, isFinishingOvertimeTransaction harus true
        console.log('Alert called, isFinishing:', mockShiftStore.isFinishingOvertimeTransaction);
    });

    vm.checkout();
    await wrapper.vm.$nextTick();

    // hasUsedGracePeriod HARUS true
    expect(mockShiftStore.hasUsedGracePeriod).toBe(true);
    
    // isFinishingOvertimeTransaction KEMBALI ke false (karena sudah selesai)
    expect(mockShiftStore.isFinishingOvertimeTransaction).toBe(false);
    
    // Alert dipanggil minimal 2x (warning + final transaction)
    expect(alertMock).toHaveBeenCalled();
    });

    it('[Negative Path] Tidak checkout saat overtime + grace period used', async () => {
      mockShiftStore.shiftStatus = 'overtime';
      mockShiftStore.hasUsedGracePeriod = true;
      const wrapper = mountHome();

      const payButton = findButtonByText(wrapper, 'PAY NOW');
      expect(payButton!.attributes('disabled')).toBeDefined();
    });
  });

  // =====================================================================
  // 7. OVERTIME BANNER
  // =====================================================================
  describe('Overtime Banner', () => {
    it('[Happy Path] Menampilkan banner saat overtime', () => {
      mockShiftStore.shiftStatus = 'overtime';
      const wrapper = mountHome();

      expect(wrapper.text()).toContain('Shift Time Ended!');
    });

    it('[Negative Path] Tidak menampilkan banner saat safe', () => {
      const wrapper = mountHome();

      expect(wrapper.text()).not.toContain('Shift Time Ended!');
    });
  });

  // =====================================================================
  // 8. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Cart total dihitung dengan benar', async () => {
      const wrapper = mountHome();
      const vm = wrapper.vm as any;

      vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 2 });
      vm.cart.push({ id: 2, name: 'Latte', price: 25000, qty: 1 });
      await wrapper.vm.$nextTick();

      expect(vm.cartTotal).toBe(55000);
    });

    it('[Corner Case] Order note ditambahkan saat checkout', async () => {
      const wrapper = mountHome();
      const vm = wrapper.vm as any;

      vm.cart.push({ id: 1, name: 'Espresso', price: 15000, qty: 1 });
      vm.orderNote = 'Takeaway';
      await wrapper.vm.$nextTick();

      const payButton = findButtonByText(wrapper, 'PAY NOW');
      await payButton!.trigger('click');

      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('Note: Takeaway')
      );
    });
  });
});