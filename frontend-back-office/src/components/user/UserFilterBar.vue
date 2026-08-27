<script setup lang="ts">
import type { UserRole } from '@/types/user';

defineProps<{
  search: string;
  role: UserRole | '';
  isActive: boolean | '';
}>();

defineEmits<{
  (e: 'update:search', value: string): void;
  (e: 'update:role', value: UserRole | ''): void;
  (e: 'update:isActive', value: boolean | ''): void;
}>();
</script>

<template>
  <!-- justify-between akan mendorong search ke kiri dan bungkus filter ke kanan -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
    
    <!-- KIRI: Search Input -->
    <div class="relative w-full sm:max-w-xs md:max-w-sm">
      <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
        <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <input 
        :value="search"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="Search name or username..." 
        class="w-full pl-10 pr-4 py-2 bg-surface/40 border border-white/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl text-sm font-medium text-text-primary outline-none transition-all placeholder:text-text-secondary/70 backdrop-blur-sm"
      >
    </div>

    <!-- KANAN: Kelompok Filter -->
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      
      <!-- Role Filter -->
      <select 
        :value="role"
        @change="$emit('update:role', ($event.target as HTMLSelectElement).value as UserRole | '')"
        class="w-full sm:w-auto px-4 py-2 bg-surface/40 border border-white/60 rounded-xl text-sm font-medium text-text-primary outline-none focus:border-primary/40 backdrop-blur-sm"
      >
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="inventory">Inventory</option>
        <option value="cashier">Cashier</option>
      </select>

      <!-- Status Filter -->
      <select 
        :value="isActive === '' ? '' : isActive.toString()"
        @change="$emit('update:isActive', ($event.target as HTMLSelectElement).value === '' ? '' : ($event.target as HTMLSelectElement).value === 'true')"
        class="w-full sm:w-auto px-4 py-2 bg-surface/40 border border-white/60 rounded-xl text-sm font-medium text-text-primary outline-none focus:border-primary/40 backdrop-blur-sm"
      >
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>

    </div>
    
  </div>
</template>