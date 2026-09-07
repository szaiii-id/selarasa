<script setup lang="ts">
import PosTopbar from '@/components/layout/PosTopbar.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    
    <!-- 
      TOPBAR POS
      Tinggi sekarang dibebaskan (h-auto) dan ditambah padding/margin bawah
      agar tidak menutupi konten di bawahnya.
    -->
    <div class="sticky top-0 z-20 h-auto shrink-0 px-4 lg:px-6 pt-4 lg:pt-6 pb-4 bg-background">
      <PosTopbar />
    </div>
    
    <!-- KONTEN UTAMA -->
    <main class="flex-1 relative z-0 px-4 lg:px-6 pb-6 pt-2">
      <router-view /> 
    </main>

  </div>
</template>