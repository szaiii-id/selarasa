import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AuthLayout from '../layouts/AuthLayout.vue';
import PosLayout from '../layouts/PosLayout.vue';
import Login from '../pages/Login.vue';
import Home from '../pages/cashier/Home.vue';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';

declare module 'vue-router' {
  interface RouteMeta {
    layout?: typeof AuthLayout | typeof PosLayout | any;
    requiresAuth?: boolean;
    requiresShift?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { 
      layout: AuthLayout 
    }
  },
  {
    path: '/shift',
    component: () => import('../layouts/ShiftLayout.vue'),
    meta: { 
      requiresAuth: true 
    },
    children: [
      {
        path: 'open',
        name: 'OpenShift',
        component: () => import('../pages/shift/OpenShiftIndex.vue'),
      }
    ]
  },
  {
    path: '/home',
    component: PosLayout,
    meta: { 
      requiresAuth: true,
      requiresShift: true
    },
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
      }
    ]
  },
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * Global navigation guard to secure routes, manage session state,
 * and ensure active cashier shifts.
 */
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const shiftStore = useShiftStore();
  
  if (!authStore.isSessionChecked) {
    await authStore.fetchUser();
  }

  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'Login' };
  }

  if (to.name === 'Login' && isAuthenticated) {
    return { name: 'Home' };
  }

  if (to.meta.requiresShift && isAuthenticated) {
    if (shiftStore.currentShift === null) {
      await shiftStore.fetchCurrentShift();
    }

    if (!shiftStore.currentShift) {
      return { name: 'OpenShift' };
    }
  }

  if (to.name === 'OpenShift' && isAuthenticated) {
    if (shiftStore.currentShift === null) {
      await shiftStore.fetchCurrentShift();
    }
    
    if (shiftStore.currentShift) {
      return { name: 'Home' };
    }
  }

  return true;
});

export default router;