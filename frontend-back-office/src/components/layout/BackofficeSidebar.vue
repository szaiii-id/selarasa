<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
</script>

<template>
  <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
    
    <router-link
      to="/dashboard"
      custom
      v-slot="{ isActive, navigate, href }"
    >
      <a 
        :href="href" 
        @click="navigate"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
          isActive 
            ? 'bg-primary/90 text-surface shadow-md backdrop-blur-sm' 
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm'
        ]"
      >
        <svg class="w-5 h-5 shrink-0 transition-colors" :class="isActive ? 'text-surface' : 'text-text-secondary'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        
        <span>Dashboard</span>

        <span v-if="isActive" class="ml-auto w-1.5 h-1.5 rounded-full bg-surface shadow-sm"></span>
      </a>
    </router-link>

    <router-link
      v-if="authStore.user?.role === 'admin' || authStore.user?.role === 'manager'"
      to="/users"
      custom
      v-slot="{ isActive, navigate, href }"
    >
      <a 
        :href="href" 
        @click="navigate"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
          isActive 
            ? 'bg-primary/90 text-surface shadow-md backdrop-blur-sm' 
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm'
        ]"
      >
        <svg class="w-5 h-5 shrink-0 transition-colors" :class="isActive ? 'text-surface' : 'text-text-secondary'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>

        <span>User Management</span>

        <span v-if="isActive" class="ml-auto w-1.5 h-1.5 rounded-full bg-surface shadow-sm"></span>
      </a>
    </router-link>

    <router-link
      v-if="authStore.user?.role === 'admin' || authStore.user?.role === 'manager'"
      to="/shifts"
      custom
      v-slot="{ isActive, navigate, href }"
    >
      <a 
        :href="href" 
        @click="navigate"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
          isActive 
            ? 'bg-primary/90 text-surface shadow-md backdrop-blur-sm' 
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm'
        ]"
      >
        <svg class="w-5 h-5 shrink-0 transition-colors" :class="isActive ? 'text-surface' : 'text-text-secondary'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <span>Shift Management</span>

        <span v-if="isActive" class="ml-auto w-1.5 h-1.5 rounded-full bg-surface shadow-sm"></span>
      </a>
    </router-link>

  </nav>
</template>