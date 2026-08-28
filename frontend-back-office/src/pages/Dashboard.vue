<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore';
import BackofficeLayout from '@/layouts/BackofficeLayout.vue';

const authStore = useAuthStore();
</script>

<template>
  <BackofficeLayout>
    
    <!-- Hapus 'h-full' agar wadah memanjang natural ke bawah mengikuti isinya -->
    <div class="bg-surface/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
      
      <h1 class="text-2xl font-bold text-primary">Dashboard</h1>
      
      <p class="text-text-secondary mt-2">
        Selamat datang kembali, <span class="font-bold text-primary capitalize">{{ authStore.user?.name || 'Admin' }}</span>! 
        di SelaRasa Back Office.
      </p>

      <!-- Widget Area -->
      <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Widget 1 -->
        <div class="p-6 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-sm shadow-sm transition-transform hover:-translate-y-1">
          <p class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Akses Anda</p>
          <p class="text-xl font-bold text-text-primary capitalize mt-2">{{ authStore.user?.role || '-' }}</p>
        </div>
        
        <!-- Widget 2 -->
        <div class="p-6 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-sm shadow-sm transition-transform hover:-translate-y-1">
          <p class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Transaksi Hari Ini</p>
          <p class="text-3xl font-bold text-primary mt-2">0</p>
        </div>

      </div>

      <!-- AREA KONTEN PANJANG UNTUK TES SCROLL -->
      <div class="mt-12">
        <h2 class="text-xl font-bold text-text-primary mb-6">Aktivitas Terbaru (Scroll Test)</h2>
        
        <div class="space-y-4">
          <!-- Looping 20 kotak dummy agar halaman jadi sangat panjang -->
          <div 
            v-for="i in 20" 
            :key="i"
            class="p-5 rounded-2xl border border-white/60 bg-white/20 backdrop-blur-sm shadow-sm flex items-center justify-between"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                #{{ i }}
              </div>
              <div>
                <p class="text-base font-bold text-text-primary">Data Dummy Transaksi ke-{{ i }}</p>
                <p class="text-sm text-text-secondary">Ini adalah teks contoh untuk membuat halaman memanjang ke bawah.</p>
              </div>
            </div>
            <span class="text-xs bg-emerald-500/10 text-emerald-600 font-bold px-3 py-1 rounded-full">
              Selesai
            </span>
          </div>
        </div>
      </div>

    </div>

  </BackofficeLayout>
</template>