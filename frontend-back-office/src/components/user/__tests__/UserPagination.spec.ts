import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserPagination from '../UserPagination.vue';

describe('UserPagination.vue (UI Logic & Boundary Testing)', () => {

  // =========================================================================
  // 1. STATE RENDERING
  // =========================================================================
  it('[UI] Menampilkan informasi total data, current page, dan last page dengan benar', () => {
    const wrapper = mount(UserPagination, {
      props: { currentPage: 2, lastPage: 5, total: 50 }
    });

    const text = wrapper.text();
    expect(text).toContain('Total: 50 items');
    expect(text).toContain('2');
    expect(text).toContain('/ 5');
  });

  // =========================================================================
  // 2. BOUNDARY VALUE ANALYSIS (Tombol Prev)
  // =========================================================================
  it('[BVA - Batas Bawah] Tombol Prev disabled saat di halaman 1, dan aktif saat > 1', async () => {
    // Render di Halaman 1 (Batas Bawah)
    const wrapper = mount(UserPagination, {
      props: { currentPage: 1, lastPage: 5, total: 50 }
    });

    const buttons = wrapper.findAll('button');
    const prevButton = buttons[0]; // Tombol pertama adalah Prev

    // Harus disabled
    expect(prevButton.attributes('disabled')).toBeDefined();

    // Ubah ke halaman 2 (Bergerak menjauhi batas)
    await wrapper.setProps({ currentPage: 2 });
    
    // Harus bisa diklik
    expect(prevButton.attributes('disabled')).toBeUndefined();
    
    // Klik tombolnya
    await prevButton.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('prev');
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (Tombol Next)
  // =========================================================================
  it('[BVA - Batas Atas] Tombol Next disabled saat di halaman terakhir, dan aktif saat < terakhir', async () => {
    // Render di Halaman 5 dari total 5 halaman (Batas Atas)
    const wrapper = mount(UserPagination, {
      props: { currentPage: 5, lastPage: 5, total: 50 }
    });

    const buttons = wrapper.findAll('button');
    const nextButton = buttons[2]; // Tombol ketiga adalah Next (Prev, Angka, Next)

    // Harus disabled
    expect(nextButton.attributes('disabled')).toBeDefined();

    // Ubah ke halaman 4 (Bergerak mundur dari batas)
    await wrapper.setProps({ currentPage: 4 });
    
    // Harus bisa diklik
    expect(nextButton.attributes('disabled')).toBeUndefined();
    
    // Klik tombolnya
    await nextButton.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('next');
  });

});