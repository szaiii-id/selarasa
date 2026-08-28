<script setup lang="ts">
import type { User } from '@/types/user';
import BrandLogo from '@/components/common/BrandLogo.vue';

defineProps<{
  isOpen: boolean;
  user: User | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <!-- Backdrop -->
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <!-- Modal Card -->
      <div class="w-full max-w-sm bg-surface/90 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl overflow-hidden relative">
        
        <!-- Header & Brand Logo -->
        <div class="pt-8 pb-6 px-6 bg-gradient-to-b from-primary/10 to-transparent flex flex-col items-center justify-center text-center relative border-b border-white/20">
          <!-- Tombol Close (X) -->
          <button @click="$emit('close')" class="absolute top-4 right-4 p-2 rounded-full hover:bg-white/40 text-text-secondary hover:text-text-primary transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div class="mb-2 flex items-center justify-center transform scale-90">
            <BrandLogo />
          </div>
          
          <p class="text-xs text-text-secondary font-medium uppercase tracking-widest">User Dashboard</p>
        </div>

        <!-- Body / Data -->
        <div class="p-6" v-if="user">
          
          <!-- Profile Quick Info -->
          <div class="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white/60 mb-5 shadow-sm">
            <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase shrink-0">
              {{ user.name ? user.name.charAt(0) : 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-text-primary text-sm truncate">{{ user.name }}</h3>
              <p class="text-xs text-text-secondary font-mono truncate">@{{ user.username }}</p>
            </div>
            <div class="shrink-0">
              <span 
                :class="[
                  'px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg border',
                  user.is_active 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : 'bg-text-secondary/10 text-text-secondary border-text-secondary/20'
                ]"
              >
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <!-- Activity Statistics Grid -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <!-- Join Date -->
            <div class="p-3.5 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
              <div class="flex items-center gap-1.5 mb-2 text-text-secondary">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p class="text-[10px] font-bold uppercase tracking-wider">Joined</p>
              </div>
              <p class="text-sm font-semibold text-text-primary">{{ user.joined_at || '-' }}</p>
              <p class="text-[10px] text-text-secondary mt-0.5 font-medium">{{ user.account_age || 'Just now' }}</p>
            </div>

            <!-- Last Login -->
            <div class="p-3.5 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
              <div class="flex items-center gap-1.5 mb-2 text-text-secondary">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p class="text-[10px] font-bold uppercase tracking-wider">Last Login</p>
              </div>
              <p class="text-sm font-semibold text-text-primary">{{ user.last_login_at || 'Never' }}</p>
              <p class="text-[10px] text-text-secondary mt-0.5 font-mono truncate" :title="user.last_login_ip || ''">
                IP: {{ user.last_login_ip || 'Unknown' }}
              </p>
            </div>
          </div>

          <!-- Security Notice / Call to Action -->
          <div class="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-2.5">
            <svg class="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p class="text-[10px] leading-relaxed text-text-secondary">
              Credentials are strictly hidden (Zero Trust). To reset a forgotten password or PIN, please use the <strong class="text-primary uppercase tracking-wide">Edit</strong> menu.
            </p>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>