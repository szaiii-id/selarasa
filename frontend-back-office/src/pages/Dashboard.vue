<script setup lang="ts">
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
};
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-primary">Dashboard</h1>
    <p class="text-text-primary mt-2">Welcome to SelaRasa Back Office!</p>
    
    <button 
      @click="handleLogout"
      class="mt-4 px-4 py-2 bg-error text-surface rounded-md hover:bg-opacity-90"
    >
      Sign Out
    </button>
  </div>
</template>