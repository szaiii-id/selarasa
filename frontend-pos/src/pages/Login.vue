<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  username: '',
  password: ''
});

const showPassword = ref(false);

/**
 * Submits the login credentials and redirects to the dashboard upon success.
 */
const handleLogin = async () => {
  const success = await authStore.login(form.value);
  if (success) {
    router.replace('/dashboard');
  }
};
</script>

<template>
  <div class="relative min-h-screen w-full flex items-center justify-center bg-background px-4 overflow-hidden">
    
    <!-- Extended Fixed Top Background (Covers 52% of the viewport height) -->
    <div class="fixed top-0 left-0 right-0 w-full h-[52%] bg-primary m-0 p-0 pointer-events-none z-0">
      
      <!-- Top Floating Icons Wrapper (overflow-hidden scoped ONLY to this container so the wave below is not clipped) -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        
        <!-- Top Icon 1: Coffee Cup (Top-Left corner) -->
        <div class="absolute left-[7%] top-[12%] text-surface/20 animate-float-slow">
          <svg class="w-14 h-14 rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
          </svg>
        </div>

        <!-- Top Icon 2: Coffee Bean (Top-Left mid) -->
        <div class="absolute left-[20%] top-[28%] text-surface/15 animate-float-fast">
          <svg class="w-11 h-11 -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 0c2.5 3.5 2.5 6.5 0 10s-2.5 6.5 0 10" />
          </svg>
        </div>

        <!-- Top Icon 3: Donut (Mid-Left top) -->
        <div class="absolute left-[4%] top-[42%] text-surface/20 animate-float-medium">
          <svg class="w-16 h-16 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
            <path stroke-linecap="round" d="M8 8.5a4.5 4.5 0 018 0" />
          </svg>
        </div>

        <!-- Top Icon 4: Croissant / Pastry (Top-Right corner) -->
        <div class="absolute right-[8%] top-[10%] text-surface/20 animate-float-medium">
          <svg class="w-14 h-14 -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.5 14.5c-.8-3.6-3.5-6.5-7-7.5C10 6 6.5 8 5 11c-1.5 3-.5 6.5 2 8.5 2.5 2 6 2 9 0 3-2 5-3 4.5-5zM12 7v10M8.5 8.5l7 7M15.5 8.5l-7 7" />
          </svg>
        </div>

        <!-- Top Icon 5: To-Go Cup (Top-Right mid) -->
        <div class="absolute right-[22%] top-[22%] text-surface/15 animate-float-slow">
          <svg class="w-12 h-12 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>

        <!-- Top Icon 6: Coffee Bean (Mid-Right top) -->
        <div class="absolute right-[5%] top-[38%] text-surface/20 animate-float-fast">
          <svg class="w-10 h-10 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 0c2.5 3.5 2.5 6.5 0 10s-2.5 6.5 0 10" />
          </svg>
        </div>

        <!-- Top Icon 7: Donut (Center-Left top) -->
        <div class="absolute left-[30%] top-[8%] text-surface/15 animate-float-medium hidden sm:block">
          <svg class="w-12 h-12 -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        <!-- Top Icon 8: Coffee Cup (Center-Right top) -->
        <div class="absolute right-[32%] top-[12%] text-surface/15 animate-float-slow hidden sm:block">
          <svg class="w-12 h-12 rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
          </svg>
        </div>

      </div>

      <!-- Multi-Wave Seamless Bottom SVG (Positioned outside overflow-hidden wrapper) -->
      <svg 
        class="absolute top-full left-0 w-full h-16 sm:h-24 text-primary block" 
        viewBox="0 0 1440 100" 
        fill="none" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0,40 C160,90 320,10 480,50 C640,90 800,10 960,50 C1120,90 1280,10 1440,40 L1440,0 L0,0 Z" 
          fill="currentColor"
        ></path>
      </svg>
    </div>

    <!-- Floating Coffee Shop Background Icons (Bottom cream background area - Terracotta stroke color) -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      
      <!-- Bottom Icon 1: Coffee Cup (Top-Left below wave) -->
      <div class="absolute left-[8%] bottom-[30%] text-primary/25 animate-float-slow">
        <svg class="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
      </div>

      <!-- Bottom Icon 2: Coffee Bean (Bottom-Left corner) -->
      <div class="absolute left-[15%] bottom-[10%] text-primary/20 animate-float-medium">
        <svg class="w-12 h-12 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 0c2.5 3.5 2.5 6.5 0 10s-2.5 6.5 0 10" />
        </svg>
      </div>

      <!-- Bottom Icon 3: Donut (Mid-Left edge) -->
      <div class="absolute left-[4%] bottom-[18%] text-primary/25 animate-float-fast">
        <svg class="w-16 h-16 -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path stroke-linecap="round" d="M8 8.5a4.5 4.5 0 018 0" />
        </svg>
      </div>

      <!-- Bottom Icon 4: Croissant / Pastry (Top-Right below wave) -->
      <div class="absolute right-[10%] bottom-[33%] text-primary/20 animate-float-medium">
        <svg class="w-14 h-14 rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.5 14.5c-.8-3.6-3.5-6.5-7-7.5C10 6 6.5 8 5 11c-1.5 3-.5 6.5 2 8.5 2.5 2 6 2 9 0 3-2 5-3 4.5-5zM12 7v10M8.5 8.5l7 7M15.5 8.5l-7 7" />
        </svg>
      </div>

      <!-- Bottom Icon 5: Coffee Cup (Bottom-Right corner) -->
      <div class="absolute right-[6%] bottom-[12%] text-primary/25 animate-float-slow">
        <svg class="w-16 h-16 -rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>

      <!-- Bottom Icon 6: Coffee Bean (Mid-Right edge) -->
      <div class="absolute right-[18%] bottom-[22%] text-primary/20 animate-float-fast">
        <svg class="w-10 h-10 -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 0c2.5 3.5 2.5 6.5 0 10s-2.5 6.5 0 10" />
        </svg>
      </div>

      <!-- Bottom Icon 7: Donut (Center-Left bottom) -->
      <div class="absolute left-[28%] bottom-[5%] text-primary/15 animate-float-medium hidden sm:block">
        <svg class="w-12 h-12 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      <!-- Bottom Icon 8: Coffee Cup (Center-Right bottom) -->
      <div class="absolute right-[28%] bottom-[6%] text-primary/15 animate-float-slow hidden sm:block">
        <svg class="w-12 h-12 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
      </div>

    </div>

    <!-- Centered Login Card -->
    <div class="relative z-10 w-full max-w-md bg-surface p-8 sm:p-10 rounded-2xl shadow-xl border border-custom-border">
      
      <!-- Brand & Header Section -->
      <div class="text-center mb-10 flex flex-col items-center justify-center">
        <div class="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
          <svg class="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
          <span class="text-xs font-semibold uppercase tracking-widest text-primary">SelaRasa</span>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-text-primary mb-1.5 bg-gradient-to-r from-text-primary via-primary to-text-primary bg-clip-text text-transparent">
          Point of Sale
        </h1>
        <p class="text-text-secondary/80 text-xs tracking-widest uppercase font-medium">Sign In to Your Account</p>
      </div>

      <!-- Global Authentication Error Alert -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform -translate-y-2 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-2 opacity-0"
      >
        <div 
          v-if="authStore.errorMessage" 
          class="mb-6 p-3 rounded-xl bg-error/10 border border-error/20 text-center"
        >
          <p class="text-sm font-semibold text-error leading-tight">
            {{ authStore.errorMessage }}
          </p>
        </div>
      </Transition>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-5" novalidate>
        
        <!-- Username Field -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-1.5">Username</label>
          <div class="relative">
            <input 
              v-model="form.username"
              @input="authStore.clearError('username')"
              type="text" 
              autocomplete="username"
              :disabled="authStore.isLoading"
              :class="[
                'w-full px-4 py-2.5 rounded-xl bg-background border focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50',
                authStore.validationErrors?.username 
                  ? 'border-error focus:ring-error text-error' 
                  : 'border-custom-border focus:ring-primary focus:border-transparent'
              ]"
              placeholder="Enter your username"
            />
          </div>
          <p v-if="authStore.validationErrors?.username" class="mt-1.5 text-xs text-error font-medium">
            {{ authStore.validationErrors.username[0] }}
          </p>
        </div>

        <!-- Password Field -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-1.5">Password</label>
          <div class="relative">
            <input 
              v-model="form.password"
              @input="authStore.clearError('password')"
              :type="showPassword ? 'text' : 'password'" 
              autocomplete="current-password"
              :disabled="authStore.isLoading"
              :class="[
                'w-full px-4 py-2.5 pr-12 rounded-xl bg-background border focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50',
                authStore.validationErrors?.password 
                  ? 'border-error focus:ring-error text-error' 
                  : 'border-custom-border focus:ring-primary focus:border-transparent'
              ]"
              placeholder="••••••••"
            />
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
            >
              <svg v-if="!showPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.52-3.83m4.53-2.36A10.04 10.04 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.52 3.83m-4.53 2.36l-1.52-1.52m0 0L7.47 10.47m2.91-2.91l-1.52 1.52m0 0l-1.52-1.52m2.91 2.91a3 3 0 014.24 4.24m0 0l1.52 1.52m-1.52-1.52l1.52-1.52" />
              </svg>
            </button>
          </div>
          <p v-if="authStore.validationErrors?.password" class="mt-1.5 text-xs text-error font-medium">
            {{ authStore.validationErrors.password[0] }}
          </p>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit"
          :disabled="authStore.isLoading"
          class="w-full mt-8 py-2.5 px-4 bg-primary text-surface font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
        >
          <svg v-if="authStore.isLoading" class="animate-spin h-5 w-5 text-surface" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ authStore.isLoading ? 'Authenticating...' : 'Sign In' }}</span>
        </button>
        
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Gentle vertical floating keyframes for background coffee shop icons */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-float-slow {
  animation: float 6s ease-in-out infinite;
}

.animate-float-medium {
  animation: float 4.5s ease-in-out infinite;
}

.animate-float-fast {
  animation: float 3.5s ease-in-out infinite;
}
</style>