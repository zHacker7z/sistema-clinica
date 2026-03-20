<template>
  <div class="row" style="align-items: flex-start">
    <div style="flex: 1 1 380px">
      <div class="card">
        <h2 class="section-title">Minha conta</h2>
        <div class="field">
          <label>Nome</label>
          <input v-model="name" placeholder="Seu nome" />
        </div>
        <div class="field" style="margin-top: 10px">
          <label>Telefone</label>
          <input
            v-model="phone"
            placeholder="(00) 00000-0000"
            inputmode="numeric"
            maxlength="15"
            @input="handlePhoneInput"
          />
        </div>

        <div style="display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap">
          <button v-if="hasChanges" class="primary" @click="handleSave">Salvar dados</button>
          <span v-else class="muted">Dados salvos</span>
        </div>
        <div v-if="error" class="error-box">{{ error }}</div>
      </div>
    </div>

    <div style="flex: 1 1 520px">
      <div class="card">
        <h2 class="section-title">Meus atendimentos</h2>
        <div class="field" style="max-width: 220px">
          <label>Data</label>
          <input v-model="dateISO" type="date" />
        </div>

        <div v-if="loading" style="margin-top: 12px">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
        <div v-else-if="appointments.length === 0" class="muted" style="margin-top: 10px">
          Você ainda não possui atendimentos nessa data.
        </div>
        <div v-for="a in appointments" :key="a.id" style="padding-top: 10px">
          <div style="display: flex; justify-content: space-between; gap: 10px">
            <div>
              <div style="font-weight: 700">{{ formatTime(a.startAt) }} - {{ formatTime(a.endAt) }}</div>
              <div class="muted" style="font-size: 13px; margin-top: 4px">
                {{ a.address.localidade }} - {{ a.address.uf }} | CEP {{ a.address.cep }}
              </div>
            </div>
            <span class="badge">{{ translateStatus(a.status) }}</span>
          </div>
          <hr style="border: none; border-top: 1px solid var(--card-border); margin: 12px 0" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '../services/api.js';
import { me, updateMe } from '../services/auth.js';
import { extractErrorMessage } from '../services/errors.js';

const dateISO = ref(new Date().toLocaleDateString('sv-SE'));
const appointments = ref([]);
const loading = ref(false);

const name = ref('');
const phone = ref('');
const error = ref('');
const initialName = ref('');
const initialPhone = ref('');

const hasChanges = computed(() => {
  return (
    String(name.value || '').trim() !== initialName.value ||
    normalizePhone(phone.value) !== initialPhone.value
  );
});

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function translateStatus(status) {
  if (status === 'scheduled') return 'Agendado';
  if (status === 'completed') return 'Concluído';
  if (status === 'cancelled') return 'Cancelado';
  return status || '-';
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

function handlePhoneInput(e) {
  phone.value = formatPhone(e?.target?.value || phone.value);
}

async function loadMe() {
  const user = await me();
  const loadedName = String(user?.name || '').trim();
  const loadedPhone = normalizePhone(user?.phone || '');
  name.value = loadedName;
  phone.value = formatPhone(loadedPhone);
  initialName.value = loadedName;
  initialPhone.value = loadedPhone;
}

async function loadAppointments() {
  loading.value = true;
  try {
    const { data } = await api.get('/api/appointments', { params: { date: dateISO.value } });
    appointments.value = data?.items || [];
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  error.value = '';
  const nameValue = String(name.value || '').trim();
  const phoneValue = normalizePhone(phone.value);
  if (nameValue.length < 2) {
    error.value = 'Informe seu nome com pelo menos 2 caracteres.';
    return;
  }
  if (phoneValue && phoneValue.length < 10) {
    error.value = 'Telefone inválido. Use DDD + número.';
    return;
  }
  try {
    const user = await updateMe({ name: nameValue, phone: phoneValue });
    name.value = user.name;
    phone.value = formatPhone(user.phone);
    initialName.value = String(user.name || '').trim();
    initialPhone.value = normalizePhone(user.phone);
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Dados atualizados com sucesso.' } }));
  } catch (e) {
    error.value = extractErrorMessage(e, 'Não foi possível atualizar seus dados.');
  }
}

watch(dateISO, () => {
  loadAppointments();
});

onMounted(async () => {
  await loadMe();
  await loadAppointments();
});
</script>

