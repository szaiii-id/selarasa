<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import LogoutModal from '@/components/common/LogoutModal.vue';

const authStore = useAuthStore();

// State untuk mengatur buka/tutup modal
const isLogoutModalOpen = ref(false);

const handleLogoutConfirm = async () => {
  await authStore.logout();
  // Opsional: Tutup modal setelah logout selesai jika routing belum berpindah
  isLogoutModalOpen.value = false; 
};
</script>

<template>
  <!-- 
    PERUBAHAN DI SINI: 
    Mengganti bg-surface/40 menjadi bg-white/20 (atau bg-surface/20) dan menggunakan backdrop-blur-lg 
    agar efek kaca buramnya jauh lebih tembus pandang dan elegan saat di-scroll.
  -->
  <header class="h-16 bg-white/20 backdrop-blur-lg border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl flex items-center justify-between px-6 shrink-0">
    
    <!-- KIRI: Kotak Pencarian -->
    <div class="flex-1 max-w-md">
      <div class="relative group">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <svg class="w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <!-- Kotak search juga sedikit disesuaikan opasitasnya agar menyatu -->
        <input 
          type="text" 
          placeholder="Search anything..." 
          class="w-full pl-10 pr-4 py-2 bg-white/30 border border-white/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-2xl text-sm font-medium text-text-primary outline-none transition-all placeholder:text-text-secondary/70 backdrop-blur-sm"
        >
      </div>
    </div>

    <!-- KANAN: Profil & Logout -->
    <div class="flex items-center gap-4 ml-4">
      <div class="text-sm text-right hidden sm:block">
        <p class="font-semibold text-text-primary">{{ authStore.user?.name || 'Administrator' }}</p>
        <p class="text-[11px] font-medium tracking-wider text-text-secondary uppercase mt-0.5">{{ authStore.user?.role || 'Role' }}</p>
      </div>
      
      <!-- Garis Pemisah -->
      <div class="h-8 w-px bg-custom-border/60 mx-1"></div>

      <!-- Tombol Logout -->
      <button
        @click="isLogoutModalOpen = true"
        class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold text-error hover:bg-error/10 transition-all duration-200"
      >
        <span>Logout</span>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>

  </header>

  <!-- Pasang Komponen Modal di sini -->
  <LogoutModal 
    :is-open="isLogoutModalOpen" 
    :is-loading="authStore.isLoading"
    @close="isLogoutModalOpen = false"
    @confirm="handleLogoutConfirm"
  />
</template>