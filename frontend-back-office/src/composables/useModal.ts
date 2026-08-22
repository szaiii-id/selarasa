import { ref } from 'vue';

export function useModal<T = any>(initialData: T | null = null) {
  const isOpen = ref(false);
  const data = ref<T | null>(initialData);

  const open = (payload?: T) => {
    if (payload !== undefined) {
      data.value = payload;
    }
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    setTimeout(() => {
      data.value = initialData;
    }, 300);
  };

  return {
    isOpen,
    data,
    open,
    close
  };
}