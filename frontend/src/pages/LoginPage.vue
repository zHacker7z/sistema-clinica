<template>
  <div class="auth-layout">
    <div class="card auth-card">
    <h2 class="section-title">Entrar na plataforma</h2>
    <form @submit.prevent="handleSubmit" novalidate>
      <div class="row">
        <div class="field">
          <label>E-mail</label>
          <input v-model="email" type="email" placeholder="seuemail@exemplo.com" />
        </div>
        <div class="field">
          <label>Senha</label>
          <input v-model="password" type="password" placeholder="Sua senha" />
        </div>
      </div>

      <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap">
        <button class="primary" type="submit">Entrar</button>
        <router-link to="/register">Criar conta</router-link>
      </div>

      <div v-if="error" class="error-box">
        {{ error }}
      </div>
    </form>
  </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../services/auth.js';
import { extractErrorMessage } from '../services/errors.js';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');

async function handleSubmit() {
  error.value = '';
  const emailValue = String(email.value || '').trim();
  const passwordValue = String(password.value || '');

  if (!emailValue) {
    error.value = 'Informe seu e-mail.';
    return;
  }
  if (!emailValue.includes('@')) {
    error.value = 'Digite um e-mail válido.';
    return;
  }
  if (!passwordValue) {
    error.value = 'Informe sua senha.';
    return;
  }

  try {
    const user = await login({ email: emailValue, password: passwordValue });
    if (user.role === 'secretary') router.push('/admin');
    else router.push('/');
  } catch (e) {
    error.value = extractErrorMessage(e, 'Não foi possível fazer login.');
  }
}
</script>

