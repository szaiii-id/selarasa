import { ref, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export function useTableFilters<T extends Record<string, any>>(
  defaultFilters: T,
  fetchCallback: () => void
) {
  const route = useRoute();
  const router = useRouter();

  // 1. Inisialisasi state pintar: Cek URL dulu, kalau kosong pakai default
  const initializeFilters = (): T => {
    const init: any = { ...defaultFilters };
    for (const key in init) {
      if (route.query[key] !== undefined) {
        const val = route.query[key];
        if (typeof defaultFilters[key] === 'boolean') {
          init[key] = val === 'true';
        } else if (typeof defaultFilters[key] === 'number') {
          init[key] = Number(val);
        } else {
          init[key] = val;
        }
      }
    }
    return init;
  };

  const filters = ref<T>(initializeFilters() as T);
  let debounceTimer: ReturnType<typeof setTimeout>;

  // 2. Fungsi Sinkronisasi ke URL (Otomatis membuang nilai kosong agar URL bersih)
  const syncToUrl = () => {
    const query: Record<string, any> = { ...route.query };
    for (const key in filters.value) {
      const value = filters.value[key];
      if (value === '' || value === null || (key === 'page' && value === 1)) {
        delete query[key];
      } else {
        query[key] = String(value);
      }
    }
    router.replace({ query }).catch(() => {});
  };

  // 3. Fungsi untuk dipanggil saat ada perubahan pencarian (Debounce & Reset Page)
  const applyFilters = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if ('page' in filters.value) {
        (filters.value as any).page = 1; // Reset ke hal 1 setiap kali filter berubah
      }
      syncToUrl();
      fetchCallback();
    }, 300);
  };

  // 4. Fungsi khusus untuk klik pindah halaman (Tanpa Reset)
  const changePage = (newPage: number) => {
    (filters.value as any).page = newPage;
    syncToUrl();
    fetchCallback();
  };

  // 5. MENCEGAH MEMORY LEAK! (Bug Kategori 2)
  onUnmounted(() => {
    clearTimeout(debounceTimer);
  });

  return {
    filters,
    applyFilters,
    changePage,
    syncToUrl
  };
}