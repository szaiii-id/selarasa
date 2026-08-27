import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserFilterBar from '../UserFilterBar.vue';

describe('UserFilterBar.vue (v-model & Data Conversion Testing)', () => {

  // =========================================================================
  // 1. STATE RENDERING (Data mengalir dari Parent ke Child)
  // =========================================================================
  it('[UI] Menampilkan nilai input dan select sesuai dengan Props (v-model)', () => {
    const wrapper = mount(UserFilterBar, {
      props: { 
        search: 'brian', 
        role: 'manager', 
        isActive: false 
      }
    });

    // Cek Input Search
    const searchInput = wrapper.find('input[type="text"]');
    expect((searchInput.element as HTMLInputElement).value).toBe('brian');

    // Cek Select Role
    const selects = wrapper.findAll('select');
    const roleSelect = selects[0];
    expect((roleSelect.element as HTMLSelectElement).value).toBe('manager');

    // Cek Select Status (diubah menjadi string 'false' di UI HTML)
    const statusSelect = selects[1];
    expect((statusSelect.element as HTMLSelectElement).value).toBe('false');
  });

  // =========================================================================
  // 2. EVENT EMITTERS (Data mengalir dari Child ke Parent)
  // =========================================================================
  it('[Event] Mengetik di kolom pencarian memancarkan "update:search"', async () => {
    const wrapper = mount(UserFilterBar, {
      props: { search: '', role: '', isActive: '' }
    });

    const searchInput = wrapper.find('input[type="text"]');
    await searchInput.setValue('kopi susu'); // setValue otomatis memicu event 'input'

    expect(wrapper.emitted()).toHaveProperty('update:search');
    expect(wrapper.emitted('update:search')![0]).toEqual(['kopi susu']);
  });

  it('[Event] Mengubah dropdown Role memancarkan "update:role"', async () => {
    const wrapper = mount(UserFilterBar, {
      props: { search: '', role: '', isActive: '' }
    });

    const roleSelect = wrapper.findAll('select')[0];
    await roleSelect.setValue('cashier'); // Memicu event 'change'

    expect(wrapper.emitted()).toHaveProperty('update:role');
    expect(wrapper.emitted('update:role')![0]).toEqual(['cashier']);
  });

  // =========================================================================
  // 3. EQUIVALENCE PARTITIONING / EDGE CASES (Konversi Boolean)
  // =========================================================================
  it('[Data Conversion] Mengubah dropdown Status melakukan konversi tipe data yang akurat (String ke Boolean/Kosong)', async () => {
    const wrapper = mount(UserFilterBar, {
      props: { search: '', role: '', isActive: '' }
    });

    const statusSelect = wrapper.findAll('select')[1];

    // Skenario 1: Pilih "Active" -> Harus jadi Boolean TRUE (bukan string 'true')
    await statusSelect.setValue('true');
    expect(wrapper.emitted('update:isActive')![0]).toEqual([true]);

    // Skenario 2: Pilih "Inactive" -> Harus jadi Boolean FALSE (bukan string 'false')
    await statusSelect.setValue('false');
    expect(wrapper.emitted('update:isActive')![1]).toEqual([false]);

    // Skenario 3: Pilih "All Status" -> Harus kembali jadi String kosong ''
    await statusSelect.setValue('');
    expect(wrapper.emitted('update:isActive')![2]).toEqual(['']);
  });

});