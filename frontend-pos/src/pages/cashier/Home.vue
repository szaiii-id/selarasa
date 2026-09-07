<script setup lang="ts">
import { ref, computed } from 'vue';
import { useShiftStore } from '@/stores/shiftStore'; // Import Shift Store

const shiftStore = useShiftStore(); // Initialize Shift Store

// ==========================================
// DUMMY PRODUCTS & CATEGORIES DATA
// ==========================================
const categories = ['All', 'Coffee', 'Non-Coffee', 'Food', 'Snack'];
const selectedCategory = ref('All');
const searchQuery = ref('');

const dummyProducts = [
  { id: 1, name: 'Espresso', price: 15000, category: 'Coffee', stock: 50 },
  { id: 2, name: 'Cafe Latte', price: 25000, category: 'Coffee', stock: 30 },
  { id: 3, name: 'Matcha Frappe', price: 28000, category: 'Non-Coffee', stock: 20 },
  { id: 4, name: 'Special Fried Rice', price: 35000, category: 'Food', stock: 15 },
  { id: 5, name: 'French Fries', price: 18000, category: 'Snack', stock: 40 },
  { id: 6, name: 'Americano', price: 18000, category: 'Coffee', stock: 45 },
  { id: 7, name: 'Red Velvet Latte', price: 26000, category: 'Non-Coffee', stock: 25 },
  { id: 8, name: 'Seafood Fried Noodles', price: 38000, category: 'Food', stock: 10 },
];

// ==========================================
// CART & NOTE STATE
// ==========================================
const cart = ref<{ id: number; name: string; price: number; qty: number }[]>([]);
const orderNote = ref<string>(''); 

// ==========================================
// COMPUTED PROPERTIES
// ==========================================
const filteredProducts = computed(() => {
  return dummyProducts.filter(p => {
    const matchCategory = selectedCategory.value === 'All' || p.category === selectedCategory.value;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCategory && matchSearch;
  });
});

const cartTotal = computed(() => {
  return cart.value.reduce((total, item) => total + (item.price * item.qty), 0);
});

// ==========================================
// ACTIONS
// ==========================================
const addToCart = (product: any) => {
  // If grace period is exhausted during overtime, block adding new items
  if (shiftStore.shiftStatus === 'overtime' && shiftStore.hasUsedGracePeriod) {
    alert('Shift time has ended! You cannot process new transactions. Please click End Shift above.');
    return;
  }

  const existingItem = cart.value.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.value.push({ ...product, qty: 1 });
  }
};

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1);
};

const clearCart = () => {
  cart.value = [];
  orderNote.value = '';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

const checkout = () => {
  if (cart.value.length === 0) return;
  
  // ==========================================
  // OVERTIME & GRACE PERIOD LOGIC
  // ==========================================
  if (shiftStore.shiftStatus === 'overtime') {
    if (!shiftStore.hasUsedGracePeriod) {
      shiftStore.isFinishingOvertimeTransaction = true;
      shiftStore.hasUsedGracePeriod = true;
      alert('Warning: Your shift time has ended! The system allows this 1 final transaction. After this, you must perform an End Shift.');
    } else {
      alert('Shift time has ended! You cannot process new transactions. Please click End Shift above.');
      return; 
    }
  }

  // Simulate payment process
  const noteText = orderNote.value ? `\nNote: ${orderNote.value}` : '';
  alert(`Processing payment of ${formatCurrency(cartTotal.value)} ${noteText}\n\n(Simulation Successful!)`);
  
  // Reset cart after 'payment'
  clearCart();

  // End Shift reminder if this was the final grace period transaction
  if (shiftStore.isFinishingOvertimeTransaction) {
    shiftStore.isFinishingOvertimeTransaction = false;
    alert('Final transaction completed. The End Shift screen will open automatically.');
  }
};
</script>

<template>
  <div class="h-full flex flex-col lg:flex-row gap-6 animate-fade-in absolute inset-0 pb-6 pr-4 lg:pr-6">
    
    <!-- ========================================== -->
    <!-- LEFT COLUMN: PRODUCT CATALOG (65% WIDTH)   -->
    <!-- ========================================== -->
    <div class="flex-1 flex flex-col min-w-0 bg-surface/50 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
      
      <!-- Left Header (Category & Search) -->
      <div class="p-5 border-b border-custom-border/50 bg-surface/40 shrink-0">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-text-primary">Product Catalog</h2>
          <!-- Search Bar -->
          <div class="relative">
            <svg class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search products..." 
              class="pl-10 pr-4 py-2 bg-surface/80 border border-custom-border/60 rounded-xl text-sm w-48 lg:w-64 focus:outline-none focus:border-primary transition-colors" 
            />
          </div>
        </div>

        <!-- Category Filter (Horizontal Scroll) -->
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            v-for="cat in categories" 
            :key="cat"
            @click="selectedCategory = cat"
            class="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer"
            :class="selectedCategory === cat ? 'bg-primary text-surface shadow-md shadow-primary/20' : 'bg-surface text-text-secondary hover:bg-primary/5 border border-custom-border/50'"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- RED OVERTIME BANNER (Appears if shift has ended) -->
      <div 
        v-if="shiftStore.shiftStatus === 'overtime'" 
        class="mx-5 mt-5 p-4 bg-error/10 border border-error/20 text-error rounded-xl shadow-sm flex items-start gap-4 shrink-0"
      >
        <svg class="w-6 h-6 text-error mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 class="font-bold text-error">Shift Time Ended!</h3>
          <p class="text-sm mt-1">Your shift time has ended. Perform <strong>End Shift</strong> immediately from the top menu to balance the cash drawer.</p>
        </div>
      </div>

      <!-- Product Grid (Scrollable Area) -->
      <div class="flex-1 p-5 overflow-y-auto bg-transparent">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          
          <div 
            v-for="product in filteredProducts" 
            :key="product.id"
            @click="addToCart(product)"
            class="bg-surface border border-custom-border/40 rounded-2xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col relative"
            :class="{'opacity-50 grayscale cursor-not-allowed pointer-events-none': shiftStore.shiftStatus === 'overtime' && shiftStore.hasUsedGracePeriod}"
          >
            <!-- Badge if item is already in cart -->
            <div v-if="cart.find(c => c.id === product.id)" class="absolute top-2 right-2 w-6 h-6 bg-primary text-surface text-xs font-bold flex items-center justify-center rounded-full shadow-md z-10">
              {{ cart.find(c => c.id === product.id)?.qty }}
            </div>

            <!-- Dummy Image Area -->
            <div class="w-full aspect-square bg-background rounded-xl mb-3 flex items-center justify-center text-4xl group-hover:bg-primary/5 transition-colors">
              <span v-if="product.category === 'Coffee' || product.category === 'Non-Coffee'">☕</span>
              <span v-else-if="product.category === 'Food'">🍝</span>
              <span v-else>🍟</span>
            </div>
            
            <p class="font-bold text-text-primary text-sm line-clamp-2 mb-1 leading-tight">{{ product.name }}</p>
            <div class="mt-auto flex items-center justify-between">
              <p class="font-bold text-primary">{{ formatCurrency(product.price) }}</p>
              <button class="w-8 h-8 rounded-full bg-background text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-surface transition-colors cursor-pointer">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>

          <!-- Empty Search State -->
          <div v-if="filteredProducts.length === 0" class="col-span-full py-12 flex flex-col items-center justify-center text-text-secondary">
            <p class="font-medium text-lg">No products found</p>
            <p class="text-sm mt-1">Try another keyword or select the "All" category</p>
          </div>

        </div>
      </div>

    </div>

    <!-- ========================================== -->
    <!-- RIGHT COLUMN: ORDER CART (35% WIDTH)       -->
    <!-- ========================================== -->
    <div class="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-surface/50 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden shrink-0">
      
      <!-- Cart Header -->
      <div class="p-5 border-b border-custom-border/50 bg-surface/40 flex items-center justify-between shrink-0">
        <h2 class="text-lg font-bold text-text-primary">Cart ({{ cart.length }})</h2>
        <button v-if="cart.length > 0" @click="clearCart" class="text-xs font-semibold text-error hover:underline cursor-pointer">
          Clear All
        </button>
      </div>

      <!-- Item List (Scrollable) -->
      <div class="flex-1 p-5 overflow-y-auto bg-background/30">
        
        <!-- Empty Cart State -->
        <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
          <svg class="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <p class="font-medium">Cart is empty</p>
          <p class="text-xs mt-1">Select products from the left</p>
        </div>

        <!-- Item List -->
        <div v-else class="space-y-3">
          <div v-for="(item, index) in cart" :key="index" class="bg-surface p-3 rounded-2xl border border-custom-border/40 flex gap-3 shadow-sm">
            <!-- Item Info -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-text-primary text-sm truncate">{{ item.name }}</p>
              <p class="text-primary font-bold text-sm">{{ formatCurrency(item.price) }}</p>
            </div>
            
            <!-- Quantity Control & Remove -->
            <div class="flex flex-col items-end justify-between">
              <button @click="removeFromCart(index)" class="text-error/70 hover:text-error p-1 cursor-pointer">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <div class="flex items-center gap-2 bg-background rounded-lg p-1 border border-custom-border/30 mt-1">
                <button @click="item.qty > 1 ? item.qty-- : removeFromCart(index)" class="w-6 h-6 flex items-center justify-center bg-surface rounded shadow-sm text-text-primary font-bold cursor-pointer hover:bg-primary/5">-</button>
                <span class="text-xs font-bold w-4 text-center">{{ item.qty }}</span>
                <button @click="item.qty++" class="w-6 h-6 flex items-center justify-center bg-surface rounded shadow-sm text-text-primary font-bold cursor-pointer hover:bg-primary/5">+</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer: Note, Total & Checkout Button -->
      <div class="bg-surface border-t border-custom-border/50 shrink-0">
        
        <!-- Note Input Area -->
        <div class="px-5 pt-4 pb-2">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-start pt-3 pointer-events-none">
              <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <textarea 
              v-model="orderNote"
              rows="2" 
              placeholder="Note (Takeaway, Table number, etc.)..." 
              class="w-full pl-9 pr-3 py-2.5 bg-background border border-custom-border/50 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary/20 transition-all resize-none text-text-primary placeholder-text-secondary/70"
            ></textarea>
          </div>
        </div>

        <!-- Total Details -->
        <div class="px-5 pb-5 pt-2">
          <div class="flex justify-between items-center mb-4">
            <span class="text-text-secondary font-semibold">Total Amount</span>
            <span class="text-2xl font-black text-primary">{{ formatCurrency(cartTotal) }}</span>
          </div>
          
          <button 
            @click="checkout"
            :disabled="cart.length === 0 || (shiftStore.shiftStatus === 'overtime' && shiftStore.hasUsedGracePeriod)"
            class="w-full py-4 bg-primary text-surface font-bold rounded-2xl shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>PAY NOW</span>
          </button>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* Hide scrollbar for category filter and product list areas */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Use absolute positioning to ensure Home content fully occupies the <main> area in Layout */
.absolute {
  position: absolute;
}
.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>