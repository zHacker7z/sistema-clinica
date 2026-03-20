import { createRouter, createWebHistory } from 'vue-router';

import LoginPage from './pages/LoginPage.vue';
import RegisterPage from './pages/RegisterPage.vue';
import AgendamentosPage from './pages/AgendamentosPage.vue';
import AdminPage from './pages/AdminPage.vue';
import UserPage from './pages/UserPage.vue';

import { getToken, getRoleFromToken } from './services/auth.js';

const routes = [
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/register', name: 'register', component: RegisterPage },
  { path: '/', name: 'appointments', component: AgendamentosPage, meta: { requiresAuth: true } },
  { path: '/user', name: 'user', component: UserPage, meta: { requiresAuth: true } },
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: { requiresAuth: true, roles: ['secretary'] },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const token = getToken();
  const requiresAuth = Boolean(to.meta?.requiresAuth);
  const allowedRoles = to.meta?.roles;

  if (requiresAuth && !token) {
    return '/login';
  }

  if (requiresAuth && allowedRoles && token) {
    const role = getRoleFromToken(token);
    if (!allowedRoles.includes(role)) {
      return '/';
    }
  }

  return true;
});

