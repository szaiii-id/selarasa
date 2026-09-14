<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import BrandLogo from '@/components/common/BrandLogo.vue';
import BackofficeSidebar from '@/components/layout/BackofficeSidebar.vue';
import BackofficeTopbar from '@/components/layout/BackofficeTopbar.vue';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen flex bg-background">

    <div class="w-72 flex flex-col z-30 hidden md:flex p-6 pr-3 sticky top-0 h-screen">
      <div class="h-16 flex items-center justify-center shrink-0 mb-6">
        <BrandLogo />
      </div>
      <div class="flex-1 bg-surface/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col">
        <BackofficeSidebar />
      </div>
    </div>

    <div class="flex-1 flex flex-col min-w-0 pr-6 pb-6 pl-3 relative">

      <div class="sticky top-0 z-10 w-full h-12 bg-background pointer-events-none"></div>

      <div class="sticky top-6 z-20 h-16 shrink-0 mb-6 -mt-6">
        <BackofficeTopbar />
      </div>

      <main class="flex-1 relative z-0">
        <RouterView />
      </main>

    </div>

  </div>
</template>