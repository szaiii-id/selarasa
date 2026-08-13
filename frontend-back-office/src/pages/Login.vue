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

const handleLogin = async () => {
  const success = await authStore.login(form.value);
  if (success) {
    router.replace('/dashboard');
  }
};
</script>

<template>
  <div class="w-full max-w-md bg-surface p-8 rounded-2xl shadow-xl border border-custom-border">
    
  <div class="text-center mb-10 flex flex-col items-center justify-center">
    <div class="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm backdrop-blur-md">
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
      Back Office
    </h1>
    <p class="text-text-secondary/80 text-xs tracking-widest uppercase font-medium">Management Portal</p>
  </div>

    <!-- Global Error -->
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

    <form @submit.prevent="handleLogin" class="space-y-5">
      
      <!-- Username Field -->
      <div>
        <label class="block text-sm font-medium text-text-primary mb-1.5">Username</label>
        <div class="relative">
          <input 
            v-model="form.username"
            @input="authStore.clearError('username')"
            type="text" 
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
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary focus:outline-none"
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
        class="w-full mt-8 py-2.5 px-4 bg-primary text-surface font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex justify-center items-center gap-2"
      >
        <svg v-if="authStore.isLoading" class="animate-spin h-5 w-5 text-surface" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ authStore.isLoading ? 'Authenticating...' : 'Sign In' }}</span>
      </button>
      
    </form>
  </div>
</template>