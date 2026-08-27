import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserPageHeader from '../UserPageHeader.vue';

describe('UserPageHeader.vue (Dumb Component)', () => {
  
  it('[UI Render] Menampilkan judul dan deskripsi yang benar', () => {
    // Mount (pasang) komponen ke memori simulasi
    const wrapper = mount(UserPageHeader);

    // Pastikan teksnya muncul di layar
    expect(wrapper.text()).toContain('User Management');
    expect(wrapper.text()).toContain('Manage access roles');
    expect(wrapper.find('button').text()).toContain('Add User');
  });

  it('[Event Emitter] Menembakkan event "add" ketika tombol diklik', async () => {
    const wrapper = mount(UserPageHeader);

    // Cari tombolnya
    const button = wrapper.find('button');
    
    // Simulasikan user melakukan klik pada tombol
    await button.trigger('click');

    // Pastikan event 'add' benar-benar dipancarkan (emitted) ke induknya
    expect(wrapper.emitted()).toHaveProperty('add');
    
    // Pastikan eventnya dipancarkan tepat 1 kali
    expect(wrapper.emitted('add')).toHaveLength(1);
  });

});