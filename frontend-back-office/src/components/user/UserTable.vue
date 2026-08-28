<script setup lang="ts">
import type { User } from '@/types/user';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

defineProps<{
  users: User[];
  isLoading: boolean;
  errorMessage: string | null;
}>();

defineEmits<{
  (e: 'view', user: User): void;
  (e: 'edit', user: User): void;
  (e: 'deactivate', id: string): void;
  (e: 'activate', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'retry'): void;
}>();
</script>

<template>
  <div class="relative flex-1 flex flex-col">
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="absolute inset-0 bg-white/30 backdrop-blur-sm z-10 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="absolute inset-0 bg-white/30 backdrop-blur-sm z-10 flex items-center justify-center">
      <div class="bg-white px-6 py-4 rounded-xl border border-error text-error text-sm font-bold shadow-sm">
        {{ errorMessage }}
        <button @click="$emit('retry')" class="ml-4 underline hover:text-error/80">Retry</button>
      </div>
    </div>

    <div class="overflow-x-auto flex-1">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-white/30 border-b border-white/60 text-xs uppercase tracking-wider text-text-secondary">
            <th class="px-6 py-4 font-bold">User</th>
            <th class="px-6 py-4 font-bold">Role</th>
            <th class="px-6 py-4 font-bold">Status</th>
            <th class="px-6 py-4 font-bold text-right">Actions</th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-white/40">
          <tr v-if="users.length === 0 && !isLoading && !errorMessage">
            <td colspan="4" class="px-6 py-12 text-center text-text-secondary text-sm">
              No users found.
            </td>
          </tr>
          <tr 
            v-for="user in users" 
            :key="user.id"
            class="hover:bg-white/40 transition-colors"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                  {{ user.name ? user.name.charAt(0) : 'U' }}
                </div>
                <div>
                  <p class="text-sm font-bold text-text-primary">{{ user.name }}</p>
                  <p class="text-xs text-text-secondary font-mono tracking-tight">@{{ user.username }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-primary">{{ user.role }}</span>
            </td>
            <td class="px-6 py-4">
              <span 
                :class="[
                  'px-3 py-1 text-[10px] font-bold uppercase rounded-full',
                  user.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-text-secondary/10 text-text-secondary'
                ]"
              >
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              
              <!-- ACTIONS GROUP -->
              <div class="flex items-center justify-end gap-2 relative z-20">
                
                <!-- 1. Tombol VIEW (Semua user bisa dilihat oleh siapapun) -->
                <button @click="$emit('view', user)" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 hover:bg-blue-500/20 text-text-secondary hover:text-blue-600 transition-colors border border-white/40 text-xs font-semibold" title="View Detail">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>View</span>
                </button>

                <!-- 2. Tombol EDIT (Disembunyikan jika Manager melihat baris Admin) -->
                <button 
                  v-if="authStore.user?.role === 'admin' || user.role !== 'admin'"
                  @click="$emit('edit', user)" 
                  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors border border-white/40 text-xs font-semibold" 
                  title="Edit User"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  <span>Edit</span>
                </button>

                <!-- 3 & 4. PROTEKSI AKUN SENDIRI & RBAC -->
                <template v-if="user.id !== authStore.user?.id && (authStore.user?.role === 'admin' || user.role !== 'admin')">
                  
                  <!-- Tombol DEACTIVATE (Hanya jika aktif) -->
                  <button v-if="user.is_active" @click="$emit('deactivate', user.id)" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 hover:bg-orange-500/20 text-text-secondary hover:text-orange-600 transition-colors border border-white/40 text-xs font-semibold" title="Deactivate User">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <span>Deactivate</span>
                  </button>

                  <!-- Tombol ACTIVATE & DELETE (Hanya jika Inactive) -->
                  <template v-else>
                    <button @click="$emit('activate', user.id)" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 hover:bg-emerald-500/20 text-text-secondary hover:text-emerald-600 transition-colors border border-white/40 text-xs font-semibold" title="Activate User">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Activate</span>
                    </button>
                    
                    <button @click="$emit('delete', user.id)" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 hover:bg-error/20 text-text-secondary hover:text-error transition-colors border border-white/40 text-xs font-semibold" title="Delete User Permanently">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      <span>Delete</span>
                    </button>
                  </template>
                </template>
                
                <!-- Tampilan JIKA baris ini ADALAH user yang sedang login -->
                <template v-else-if="user.id === authStore.user?.id">
                  <span class="flex items-center justify-center px-3 py-1.5 ml-1 text-[10px] font-bold text-primary/70 bg-primary/10 rounded-lg border border-primary/20 cursor-default uppercase tracking-wider">
                    You
                  </span>
                </template>

                <!-- Tampilan JIKA Manager sedang melihat baris Admin -->
                <template v-else>
                  <span class="flex items-center justify-center gap-1 px-2.5 py-1.5 ml-1 text-[10px] font-bold text-text-secondary/50 bg-text-secondary/5 rounded-lg border border-text-secondary/10 cursor-not-allowed uppercase tracking-wider" title="Restricted Action">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Locked
                  </span>
                </template>

              </div>

            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>