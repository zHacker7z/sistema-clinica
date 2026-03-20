import { api } from './api.js';

const TOKEN_KEY = 'auth_token';
function emitAuthChanged() {
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  emitAuthChanged();
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  emitAuthChanged();
}

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = String(payload).replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = JSON.parse(atob(padded));
    return decoded;
  } catch {
    return null;
  }
}

export function getRoleFromToken(token) {
  const decoded = decodeJwt(token);
  return decoded?.role;
}

export async function login({ email, password }) {
  const { data } = await api.post('/api/auth/login', { email, password });
  if (!data?.ok) throw new Error(data?.error || 'Falha no login');
  setToken(data.token);
  return data.user;
}

export async function register({ name, email, password, role, phone }) {
  const { data } = await api.post('/api/auth/register', { name, email, password, role, phone });
  if (!data?.ok) throw new Error(data?.error || 'Falha no cadastro');
  // login opcional via usuário
  return data.user;
}

export async function logout() {
  clearToken();
}

export async function me() {
  const { data } = await api.get('/api/auth/me');
  if (!data?.ok) throw new Error(data?.error || 'Falha ao obter usuário');
  return data.user;
}

export async function updateMe({ name, phone }) {
  const { data } = await api.patch('/api/auth/me', { name, phone });
  if (!data?.ok) throw new Error(data?.error || 'Falha ao atualizar dados do usuário');
  return data.user;
}

