// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmModal from '../ConfirmModal.vue';

describe('ConfirmModal Component', () => {
  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan modal saat isOpen=true', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete User',
          message: 'Are you sure you want to delete this user?',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true);
      expect(wrapper.text()).toContain('Delete User');
      expect(wrapper.text()).toContain('Are you sure you want to delete this user?');
    });

    it('[Negative Path] Tidak menampilkan modal saat isOpen=false', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: false,
          title: 'Delete User',
          message: 'Are you sure?',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
    });

    it('[Happy Path] Menampilkan judul yang diberikan', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Confirm Action',
          message: 'Test message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const heading = wrapper.find('h2');
      expect(heading.text()).toBe('Confirm Action');
    });

    it('[Happy Path] Menampilkan pesan yang diberikan', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'This is a test message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const paragraph = wrapper.find('p');
      expect(paragraph.text()).toBe('This is a test message');
    });
  });

  // =====================================================================
  // 2. EMIT EVENTS
  // =====================================================================
  describe('Emit Events', () => {
    it('[Happy Path] Emit "close" saat tombol Cancel diklik', async () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Cancel'));
      await cancelButton!.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Happy Path] Emit "confirm" saat tombol Confirm diklik', async () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const confirmButton = wrapper.findAll('button').find(btn => btn.text().includes('Confirm'));
      await confirmButton!.trigger('click');

      expect(wrapper.emitted('confirm')).toBeTruthy();
    });
  });

  // =====================================================================
  // 3. EQUIVALENCE PARTITIONING (Theme)
  // =====================================================================
  describe('Equivalence Partitioning (Theme)', () => {
    it('[Partisi 1 - Theme danger] Menggunakan warna error', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          theme: 'danger',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const confirmButton = wrapper.findAll('button').find(btn => btn.text().includes('Confirm'));
      expect(confirmButton!.classes()).toContain('bg-error');
    });

    it('[Partisi 2 - Theme warning] Menggunakan warna yellow', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Warning',
          message: 'Are you sure?',
          theme: 'warning',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const confirmButton = wrapper.findAll('button').find(btn => btn.text().includes('Confirm'));
      expect(confirmButton!.classes()).toContain('bg-yellow-500');
    });

    it('[Partisi 3 - Theme primary] Menggunakan warna primary', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Approve',
          message: 'Are you sure?',
          theme: 'primary',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const confirmButton = wrapper.findAll('button').find(btn => btn.text().includes('Confirm'));
      expect(confirmButton!.classes()).toContain('bg-primary');
    });

    it('[Partisi 4 - Theme undefined] Menggunakan warna error (default)', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const confirmButton = wrapper.findAll('button').find(btn => btn.text().includes('Confirm'));
      expect(confirmButton!.classes()).toContain('bg-error');
    });
  });

  // =====================================================================
  // 4. CONFIRM TEXT
  // =====================================================================
  describe('Confirm Text', () => {
    it('[Happy Path] Menampilkan confirmText custom', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Yes, Delete',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.text()).toContain('Yes, Delete');
    });

    it('[Happy Path] Menampilkan "Confirm" jika confirmText tidak diberikan', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.text()).toContain('Confirm');
    });
  });

  // =====================================================================
  // 5. LOADING STATE
  // =====================================================================
  describe('Loading State', () => {
    it('[Happy Path] Menampilkan spinner saat isLoading=true', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          isLoading: true,
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.find('svg.animate-spin').exists()).toBe(true);
    });

    it('[Happy Path] Tidak menampilkan spinner saat isLoading=false', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          isLoading: false,
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.find('svg.animate-spin').exists()).toBe(false);
    });

    it('[Happy Path] Tombol disabled saat isLoading=true', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          isLoading: true,
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const buttons = wrapper.findAll('button');
      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined();
      });
    });

    it('[Happy Path] Tombol tidak disabled saat isLoading=false', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          isLoading: false,
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const buttons = wrapper.findAll('button');
      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeUndefined();
      });
    });
  });

  // =====================================================================
  // 6. CSS CLASSES & STYLING
  // =====================================================================
  describe('CSS Classes & Styling', () => {
    it('Modal container memiliki class fixed inset-0', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const container = wrapper.find('.fixed.inset-0');
      expect(container.exists()).toBe(true);
      expect(container.classes()).toContain('bg-background/80');
      expect(container.classes()).toContain('backdrop-blur-md');
    });

    it('Card memiliki class rounded-3xl', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const card = wrapper.find('.rounded-3xl');
      expect(card.exists()).toBe(true);
    });

    it('Icon wrapper memiliki class w-20 h-20', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const iconWrapper = wrapper.find('.w-20.h-20');
      expect(iconWrapper.exists()).toBe(true);
    });

    it('Judul memiliki class text-xl font-bold', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const heading = wrapper.find('h2');
      expect(heading.classes()).toContain('text-xl');
      expect(heading.classes()).toContain('font-bold');
    });
  });

  // =====================================================================
  // 7. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Judul kosong', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: '',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const heading = wrapper.find('h2');
      expect(heading.text()).toBe('');
    });

    it('[Edge Case] Pesan kosong', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: '',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      const paragraph = wrapper.find('p');
      expect(paragraph.text()).toBe('');
    });

    it('[Corner Case] confirmText kosong', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
          confirmText: '',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      // Jika confirmText kosong, tampilkan "Confirm"
      expect(wrapper.text()).toContain('Confirm');
    });

    it('[Edge Case] Pesan panjang', () => {
      const longMessage = 'A'.repeat(500);
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: longMessage,
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      expect(wrapper.text()).toContain(longMessage);
    });

    it('[Corner Case] Modal dengan semua props default', () => {
      const wrapper = mount(ConfirmModal, {
        props: {
          isOpen: true,
          title: 'Title',
          message: 'Message',
        },
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
          },
        },
      });

      // Default theme adalah danger
      const confirmButton = wrapper.findAll('button').find(btn => btn.text().includes('Confirm'));
      expect(confirmButton!.classes()).toContain('bg-error');
      
      // Default confirmText adalah "Confirm"
      expect(wrapper.text()).toContain('Confirm');
    });
  });
});