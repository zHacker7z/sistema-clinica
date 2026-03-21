<template>
  <div>
    <header class="container" style="padding-top: 18px; padding-bottom: 10px">
      <div class="card app-header">
        <div>
          <div
            style="
              font-weight: 800;
              display: flex;
              gap: 8px;
              align-items: center;
            "
          >
            <Stethoscope :size="18" />
            Sistema de Atendimento Inteligente
          </div>
          <div
            class="muted"
            style="font-size: 13px; margin-top: 4px"
            v-if="user"
          >
            {{ user.name }} |
            {{ user.role === "secretary" ? "Secretária" : "Paciente" }}
          </div>
        </div>
        <div
          style="
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
          "
        >
          <button
            @click="toggleTheme"
            :title="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
          >
            <Sun v-if="isDark" :size="16" />
            <Moon v-else :size="16" />
          </button>
          <router-link
            v-if="currentRole === 'secretary'"
            to="/admin"
            class="nav-btn"
            >Admin</router-link
          >
          <router-link to="/" class="nav-btn">Agendamentos</router-link>
          <router-link v-if="isAuthenticated" to="/user" class="nav-btn"
            >Usuário</router-link
          >
          <button
            v-if="isAuthenticated"
            class="danger nav-btn"
            @click="handleLogout"
          >
            <LogOut :size="16" />
          </button>
        </div>
      </div>
    </header>

    <main class="container">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <div class="toast-wrap" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" class="toast">
        {{ t.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { LogOut, Moon, Stethoscope, Sun } from "lucide-vue-next";
import {
  clearToken,
  getRoleFromToken,
  getToken,
  logout,
  me,
} from "./services/auth.js";

const router = useRouter();
const user = ref(null);
const toasts = ref([]);
const isDark = ref(false);
const isAuthenticated = ref(false);
const currentRole = ref(null);

function pushToast(message) {
  toasts.value.push({ id: `${Date.now()}_${Math.random()}`, message });
  setTimeout(() => {
    toasts.value.shift();
  }, 3500);
}

function setupToastListener() {
  window.addEventListener("toast", (e) => {
    const message = e?.detail?.message;
    if (message) pushToast(message);
  });
}

async function syncUser() {
  const token = getToken();
  if (!token) {
    isAuthenticated.value = false;
    currentRole.value = null;
    user.value = null;
    return;
  }
  isAuthenticated.value = true;
  currentRole.value = getRoleFromToken(token) || null;
  user.value = await me().catch(() => null);
}

async function handleLogout() {
  await logout();
  clearToken(); // garante
  user.value = null;
  router.push("/login");
}

function applyTheme(dark) {
  isDark.value = Boolean(dark);
  document.documentElement.classList.toggle("theme-dark", isDark.value);
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
}

function toggleTheme() {
  applyTheme(!isDark.value);
}

function handleAuthExpired() {
  user.value = null;
  isAuthenticated.value = false;
  currentRole.value = null;
  pushToast("Sua sessão expirou. Faça login novamente.");
  router.push("/login");
}

onMounted(() => {
  setupToastListener();
  syncUser();
  window.addEventListener("auth-changed", syncUser);
  window.addEventListener("auth-expired", handleAuthExpired);
  const savedTheme = localStorage.getItem("theme");
  applyTheme(savedTheme === "dark");
});
</script>
