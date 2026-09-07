<script setup lang="ts">
import BrandLogo from '@/components/common/BrandLogo.vue';
</script>

<template>
  <div class="min-h-screen w-full bg-background text-text-primary font-sans overflow-x-hidden flex flex-col relative">
    
    
    <!-- Router View akan merender semua halaman shift di bawah logo -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

  </div>
</template>