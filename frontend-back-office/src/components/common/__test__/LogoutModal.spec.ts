import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LogoutModal from '../LogoutModal.vue';

describe('LogoutModal.vue (Common Component Testing)', () => {
  const mountModal = async (propsData: any = {}) => {
    const wrapper = mount(LogoutModal, {
      props: {
        isOpen: false,
        isLoading: false,
        ...propsData
      },
      global: {
        stubs: { Teleport: true, Transition: true }
      }
    });

    await wrapper.setProps({ isOpen: true });
    return wrapper;
  };

  it('[UI] Menampilkan modal beserta teks judul dan deskripsi default dengan benar', async () => {
    const wrapper = await mountModal();
    
    expect(wrapper.text()).toContain('Ready to Leave?');
    expect(wrapper.text()).toContain('Are you sure you want to logout');
    
    const buttons = wrapper.findAll('button');
    const confirmBtn = buttons[1];
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn?.text()).toContain('Yes, Logout');
  });

  it('[UI] Tidak me-render isi modal jika isOpen bernilai false', () => {
    const wrapper = mount(LogoutModal, {
      props: { isOpen: false },
      global: { stubs: { Teleport: true, Transition: true } }
    });

    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
  });

  it('[Event] Memancarkan event "close" saat tombol Cancel diklik', async () => {
    const wrapper = await mountModal();
    const buttons = wrapper.findAll('button');
    const cancelBtn = buttons[0];
    
    expect(cancelBtn).toBeDefined();
    await cancelBtn?.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('[Event] Memancarkan event "confirm" saat tombol "Yes, Logout" diklik', async () => {
    const wrapper = await mountModal();
    const buttons = wrapper.findAll('button');
    const confirmBtn = buttons[1];
    
    expect(confirmBtn).toBeDefined();
    await confirmBtn?.trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('[Event] Memancarkan event "close" saat area background (backdrop) diklik', async () => {
    const wrapper = await mountModal();
    
    const backdrop = wrapper.find('.bg-black\\/20');
    
    expect(backdrop.exists()).toBe(true);
    await backdrop.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('[Loading] Menonaktifkan tombol dan mengubah teks saat isLoading = true', async () => {
    const wrapper = await mountModal({ isLoading: true });
    
    const buttons = wrapper.findAll('button');
    const cancelBtn = buttons[0];
    const confirmBtn = buttons[1];

    expect(cancelBtn).toBeDefined();
    expect(confirmBtn).toBeDefined();

    expect(cancelBtn?.attributes('disabled')).toBeDefined();
    expect(confirmBtn?.attributes('disabled')).toBeDefined();

    expect(confirmBtn?.text()).toContain('Logging out...');
    expect(confirmBtn?.text()).not.toContain('Yes, Logout');
  });
});