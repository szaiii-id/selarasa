import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AuthLayout from '../layouts/AuthLayout.vue';
import Login from '../pages/Login.vue';
import { useAuthStore } from '../stores/authStore';

declare module 'vue-router' {
  interface RouteMeta {
    layout?: typeof AuthLayout;
    requiresAuth?: boolean;
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
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
    meta: { 
      requiresAuth: true 
    }
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
 * Global navigation guard to secure routes and manage session state.
 * Restores the user session from the backend on page refresh before evaluating route access.
 */
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  
  if (!authStore.isSessionChecked && to.name !== 'Login') {
    await authStore.fetchUser();
  }

  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'Login' };
  }

  if (to.name === 'Login' && isAuthenticated) {
    return { name: 'Dashboard' };
  }

  return true;
});
export default router;