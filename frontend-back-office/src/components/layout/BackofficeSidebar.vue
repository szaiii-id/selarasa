<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useLowStockAlert } from '@/composables/useLowStockAlert';

const authStore = useAuthStore();
const route = useRoute();

// ==========================================
// ROLE HELPERS
// ==========================================
const canManageUsers = computed(
  () => authStore.user?.role === 'admin' || authStore.user?.role === 'manager'
);

const canManageShifts = computed(
  () => authStore.user?.role === 'admin' || authStore.user?.role === 'manager'
);

const canAccessInventory = computed(() =>
  ['admin', 'manager', 'inventory'].includes(authStore.user?.role || '')
);

// ==========================================
// INVENTORY GROUP (collapsible)
// ==========================================
const inventoryOpen = ref<boolean>(false);

/**
 * Detects if any of the inventory routes are currently active.
 * Used to auto-expand the group and highlight the parent.
 */
const isInventoryActive = computed(() =>
  route.path.startsWith('/inventory')
);

// Auto-expand when navigating to any inventory page
const initInventoryOpenState = () => {
  if (isInventoryActive.value) {
    inventoryOpen.value = true;
  }
};

const toggleInventory = () => {
  inventoryOpen.value = !inventoryOpen.value;
};

// ==========================================
// LOW STOCK BADGE
// ==========================================
const { count: lowStockCount } = useLowStockAlert();

// ==========================================
// LIFECYCLE
// ==========================================
onMounted(() => {
  initInventoryOpenState();
});
</script>

<template>
  <nav class="flex-1 p-4 space-y-2 overflow-y-auto">

    <!-- ========================================== -->
    <!-- DASHBOARD                                  -->
    <!-- ========================================== -->
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
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm',
        ]"
      >
        <svg
          class="w-5 h-5 shrink-0 transition-colors"
          :class="isActive ? 'text-surface' : 'text-text-secondary'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>

        <span>Dashboard</span>

        <span
          v-if="isActive"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-surface shadow-sm"
        ></span>
      </a>
    </router-link>

    <!-- ========================================== -->
    <!-- USER MANAGEMENT                            -->
    <!-- ========================================== -->
    <router-link
      v-if="canManageUsers"
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
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm',
        ]"
      >
        <svg
          class="w-5 h-5 shrink-0 transition-colors"
          :class="isActive ? 'text-surface' : 'text-text-secondary'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>

        <span>User Management</span>

        <span
          v-if="isActive"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-surface shadow-sm"
        ></span>
      </a>
    </router-link>

    <!-- ========================================== -->
    <!-- SHIFT MANAGEMENT                           -->
    <!-- ========================================== -->
    <router-link
      v-if="canManageShifts"
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
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm',
        ]"
      >
        <svg
          class="w-5 h-5 shrink-0 transition-colors"
          :class="isActive ? 'text-surface' : 'text-text-secondary'"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <span>Shift Management</span>

        <span
          v-if="isActive"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-surface shadow-sm"
        ></span>
      </a>
    </router-link>

    <!-- ========================================== -->
    <!-- INVENTORY GROUP (collapsible)              -->
    <!-- ========================================== -->
    <div v-if="canAccessInventory" class="space-y-1">

      <!-- Group Header Button -->
      <button
        type="button"
        @click="toggleInventory"
        :class="[
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
          isInventoryActive
            ? 'text-primary bg-primary/10'
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary hover:shadow-sm',
        ]"
      >
        <svg
          class="w-5 h-5 shrink-0 transition-colors"
          :class="isInventoryActive ? 'text-primary' : 'text-text-secondary'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>

        <span>Inventory</span>

        <!-- Collapse chevron -->
        <svg
          class="w-4 h-4 ml-auto shrink-0 transition-transform duration-200"
          :class="inventoryOpen ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Sub-menu Items -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out overflow-hidden"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-96 opacity-100"
        leave-active-class="transition-all duration-150 ease-in overflow-hidden"
        leave-from-class="max-h-96 opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div v-if="inventoryOpen" class="ml-4 pl-3 border-l-2 border-primary/20 space-y-0.5">

          <!-- Categories -->
          <router-link
            to="/inventory/categories"
            custom
            v-slot="{ isActive, navigate, href }"
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-surface shadow-sm'
                  : 'text-text-secondary hover:bg-white/60 hover:text-text-primary',
              ]"
            >
              <svg
                class="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Categories</span>
            </a>
          </router-link>

          <!-- Raw Materials -->
          <router-link
            to="/inventory/materials"
            custom
            v-slot="{ isActive, navigate, href }"
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-surface shadow-sm'
                  : 'text-text-secondary hover:bg-white/60 hover:text-text-primary',
              ]"
            >
              <svg
                class="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Raw Materials</span>

              <!-- Low Stock Badge -->
              <span
                v-if="lowStockCount > 0"
                class="ml-auto px-1.5 py-0.5 rounded-full bg-error text-white text-[10px] font-bold shrink-0"
              >
                {{ lowStockCount > 99 ? '99+' : lowStockCount }}
              </span>
            </a>
          </router-link>

          <!-- Stock Movements -->
          <router-link
            to="/inventory/stock-movements"
            custom
            v-slot="{ isActive, navigate, href }"
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-surface shadow-sm'
                  : 'text-text-secondary hover:bg-white/60 hover:text-text-primary',
              ]"
            >
              <svg
                class="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Stock Movements</span>
            </a>
          </router-link>

        </div>
      </Transition>

    </div>

  </nav>
</template>