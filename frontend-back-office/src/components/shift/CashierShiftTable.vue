<script setup lang="ts">
import { ref } from 'vue';
import type { CashierShift } from '@/types/shift';
import { useDateFormat } from '@/composables/useDateFormat';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useUserInitials } from '@/composables/useUserInitials';

const { formatDateTime } = useDateFormat();
const { formatCurrency } = useCurrencyFormat();
const { getInitials } = useUserInitials();

const props = defineProps<{
  shifts: CashierShift[];
  isLoading: boolean;
  errorMessage: string | null;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}>();

const emit = defineEmits<{
  (e: 'force-close', shift: CashierShift): void;
  (e: 'retry'): void;
  (e: 'page-change', page: number): void;
  (e: 'filter-change', filters: Record<string, any>): void;
}>();

const statusFilter = ref('');
const dateFilter = ref('7days');

const dateFilters = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' }
];

const applyFilter = () => {
  const filters: Record<string, any> = {};
  
  if (statusFilter.value) {
    filters.status = statusFilter.value;
  }
  
  if (dateFilter.value === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filters.date = today;
  } else if (dateFilter.value === '7days') {
    // Backend default 7 days, no need to send date_from/date_to
  } else if (dateFilter.value === '30days') {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    filters.date_from = dateFrom.toISOString().split('T')[0];
  }
  
  emit('filter-change', filters);
};

const changePage = (page: number) => {
  if (page < 1 || page > props.pagination.last_page) return;
  emit('page-change', page);
};
</script>

<template>
  <div class="flex flex-col">
    
    <!-- Filter Bar -->
    <div class="p-4 border-b border-custom-border bg-surface/60">
      <div class="flex flex-col sm:flex-row gap-3">
        
        <!-- Status Filter -->
        <select 
          v-model="statusFilter"
          @change="applyFilter"
          class="px-4 py-2 bg-background border border-custom-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-40"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        
        <!-- Quick Date Filter -->
        <div class="flex gap-2">
          <button 
            v-for="filter in dateFilters" 
            :key="filter.value"
            @click="dateFilter = filter.value; applyFilter()"
            class="px-4 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap"
            :class="dateFilter === filter.value 
              ? 'bg-primary text-white shadow-md shadow-primary/20' 
              : 'text-text-secondary bg-background border border-custom-border hover:bg-custom-border/40'"
          >
            {{ filter.label }}
          </button>
        </div>
        
      </div>
    </div>

    <!-- Table Container -->
    <div class="w-full overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-surface/60 border-b border-custom-border text-sm font-semibold text-text-secondary uppercase tracking-wider">
            <th class="px-6 py-4">Cashier</th>
            <th class="px-6 py-4">Shift</th>
            <th class="px-6 py-4">Opening</th>
            <th class="px-6 py-4">Closing</th>
            <th class="px-6 py-4">Status</th>
            <th class="px-6 py-4">Started</th>
            <th class="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <!-- Loading State -->
          <tr v-if="isLoading && shifts.length === 0">
            <td colspan="7" class="px-6 py-12 text-center">
              <div class="flex flex-col items-center justify-center space-y-3">
                <div class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p class="text-text-secondary text-sm font-medium">Loading cashier shifts...</p>
              </div>
            </td>
          </tr>

          <!-- Error State -->
          <tr v-else-if="errorMessage">
            <td colspan="7" class="px-6 py-12 text-center">
              <div class="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                <svg class="w-12 h-12 text-error/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-error font-medium">{{ errorMessage }}</p>
                <button 
                  @click="$emit('retry')" 
                  class="px-4 py-2 mt-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                >
                  Try Again
                </button>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="shifts.length === 0">
            <td colspan="7" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center justify-center space-y-3">
                <div class="w-16 h-16 bg-disabled/20 rounded-full flex items-center justify-center mb-2">
                  <svg class="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p class="text-text-primary font-medium text-lg">No Shifts Found</p>
                <p class="text-text-secondary text-sm">No cashier shifts recorded for this period.</p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr 
            v-for="shift in shifts" 
            v-else
            :key="shift.id"
            class="border-b border-custom-border/60 hover:bg-white/50 transition-colors"
            :class="{ 'bg-warning/5': shift.status === 'open' }"
          >
            <!-- Cashier Info -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span class="text-xs font-bold text-primary">{{ getInitials(shift.user?.name || 'Unknown') }}</span>
                </div>
                <div>
                  <p class="font-medium text-text-primary">{{ shift.user?.name || 'Unknown' }}</p>
                  <p class="text-xs text-text-secondary">@{{ shift.user?.username || 'unknown' }}</p>
                </div>
              </div>
            </td>

            <!-- Shift Name -->
            <td class="px-6 py-4">
              <span class="text-text-secondary">{{ shift.shift?.name || '-' }}</span>
            </td>

            <!-- Opening Balance -->
            <td class="px-6 py-4">
              <span class="text-text-primary font-medium">{{ formatCurrency(shift.opening_balance) }}</span>
            </td>

            <!-- Closing Balance -->
            <td class="px-6 py-4">
              <span v-if="shift.closing_balance !== null" class="text-text-primary font-medium">
                {{ formatCurrency(shift.closing_balance) }}
              </span>
              <span v-else class="text-text-secondary">-</span>
            </td>

            <!-- Status -->
            <td class="px-6 py-4">
              <span 
                v-if="shift.status === 'open'" 
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/20"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-warning mr-1.5"></span>
                Open
              </span>
              
              <div v-else class="flex flex-col items-start gap-1.5">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-disabled/30 text-text-secondary border border-disabled/40">
                  <span class="w-1.5 h-1.5 rounded-full bg-text-secondary mr-1.5"></span>
                  Closed
                </span>
                
                <span 
                  v-if="shift.closed_by_user" 
                  class="inline-flex items-center text-[10px] font-medium text-error bg-error/10 px-1.5 py-0.5 rounded shadow-sm border border-error/20"
                  title="Force Closed by Manager"
                >
                  by {{ shift.closed_by_user.name }}
                </span>
              </div>
            </td>

            <!-- Started At -->
            <td class="px-6 py-4">
              <span class="text-text-secondary text-sm">{{ formatDateTime(shift.started_at) }}</span>
            </td>

            <!-- Actions -->
            <td class="px-6 py-4">
              <div class="flex items-center justify-end">
                <button 
                  v-if="shift.status === 'open'"
                  @click="$emit('force-close', shift)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors"
                  title="Force Close Shift"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Force Close
                </button>
                <span v-else class="text-text-secondary text-sm">-</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="px-6 py-4 border-t border-custom-border bg-surface/60 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="text-sm text-text-secondary font-medium text-center sm:text-left">
        Showing page <span class="text-text-primary font-bold">{{ pagination.current_page }}</span> 
        of <span class="text-text-primary font-bold">{{ pagination.last_page }}</span> 
        <span class="text-text-secondary/70 ml-1">({{ pagination.total }} total records)</span>
      </div>

      <div class="flex gap-2">
        <button 
          @click="changePage(pagination.current_page - 1)"
          :disabled="pagination.current_page <= 1"
          class="px-4 py-2 text-sm font-semibold rounded-xl transition-all border border-custom-border flex items-center gap-1"
          :class="pagination.current_page <= 1 
            ? 'text-disabled bg-background/50 cursor-not-allowed' 
            : 'text-text-primary bg-surface hover:bg-custom-border/40 shadow-sm'"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        
        <button 
          @click="changePage(pagination.current_page + 1)"
          :disabled="pagination.current_page >= pagination.last_page"
          class="px-4 py-2 text-sm font-semibold rounded-xl transition-all border border-custom-border flex items-center gap-1"
          :class="pagination.current_page >= pagination.last_page 
            ? 'text-disabled bg-background/50 cursor-not-allowed' 
            : 'text-text-primary bg-surface hover:bg-custom-border/40 shadow-sm'"
        >
          Next
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>