<template>
  <div class="row" style="align-items: flex-start">
    <div style="flex: 1 1 520px">
      <div class="card">
        <h2 style="margin-top: 0">Agendar consulta</h2>

        <div class="row">
          <div class="field">
            <label>Data</label>
            <input v-model="dateISO" type="date" />
          </div>
          <div class="field">
            <label>Slot disponível</label>
            <select v-model="timeHHMM">
              <option v-if="slots.length === 0" value="">Sem slots para esta data</option>
              <option v-for="s in slots" :key="s.timeHHMM" :value="s.timeHHMM" :disabled="!s.available">
                {{ s.timeHHMM }} {{ s.available ? '' : '(ocupado)' }}
              </option>
            </select>
          </div>
        </div>

        <div class="row" style="margin-top: 10px">
          <div class="field" style="min-width: 180px">
            <label>CEP</label>
            <div style="display: flex; gap: 8px">
              <input
                v-model="cep"
                inputmode="numeric"
                placeholder="00000-000"
                maxlength="9"
                @input="handleCepInput"
                @blur="handleCepLookup"
              />
              <button @click="handleCepLookup">Confirmar CEP</button>
            </div>
          </div>
          <div class="field" style="min-width: 280px">
            <label>Endereço (auto)</label>
            <div class="muted" style="font-size: 14px; line-height: 1.3">
              <div v-if="address">
                {{ address.logradouro }} - {{ address.bairro }}<br />
                {{ address.localidade }} - {{ address.uf }} ({{ address.cep }})
              </div>
              <div v-else>Nenhum endereço carregado ainda.</div>
            </div>
          </div>
        </div>

        <div class="row" style="margin-top: 10px">
          <div class="field" style="min-width: 480px">
            <label>Observações</label>
            <textarea v-model="notes" placeholder="Ex.: preferências, sintomas, etc."></textarea>
          </div>
        </div>

        <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap">
          <button :disabled="previewing" @click="handleWeatherPreview">
            <CloudSun :size="15" style="vertical-align: text-bottom; margin-right: 6px" />
            {{ previewing ? 'Consultando clima...' : 'Previsão do clima' }}
          </button>
          <button class="primary" :disabled="submitting" @click="handleCreate">
            <CalendarCheck2 :size="15" style="vertical-align: text-bottom; margin-right: 6px" />
            {{ submitting ? 'Agendando...' : 'Confirmar agendamento' }}
          </button>
        </div>
        <div v-if="weatherPreview" class="muted" style="margin-top: 8px">
          Clima previsto:
          <strong>
            {{ weatherPreview.status === 'rain' ? 'Chuva' : weatherPreview.status === 'clear' ? 'Limpo' : 'Indisponível' }}
          </strong>
          <span v-if="typeof weatherPreview.precipitationProbabilityMax === 'number'">
            ({{ weatherPreview.precipitationProbabilityMax }}%)
          </span>
        </div>
        <div v-if="error" class="error-box">{{ error }}</div>
      </div>
    </div>

    <div style="flex: 1 1 360px">
      <div class="card">
        <h2 style="margin-top: 0">Lista do dia</h2>

        <div style="margin-bottom: 10px" class="muted">
          Clima é exibido conforme previsão para o dia do agendamento.
        </div>

        <div v-if="loading">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
        <div v-else-if="appointments.length === 0" class="muted">Nenhum agendamento encontrado.</div>

        <div v-for="a in appointments" :key="a.id" style="padding-top: 10px">
          <div style="display: flex; justify-content: space-between; gap: 10px; align-items: flex-start">
            <div>
              <div style="font-weight: 700">
                {{ formatTime(a.startAt) }} - {{ formatTime(a.endAt) }}
              </div>
              <div class="muted" style="font-size: 13px; margin-top: 4px">
                {{ a.address.localidade }} - {{ a.address.uf }} | CEP {{ a.address.cep }}
              </div>
              <div class="muted" style="font-size: 13px; margin-top: 4px">
                Status: {{ translateStatus(a.status) }}
              </div>
              <div v-if="a.notes" class="muted" style="font-size: 13px; margin-top: 4px">
                Obs.: {{ a.notes }}
              </div>
            </div>
            <div>
              <span
                v-if="a.weatherSnapshot?.status === 'rain'"
                class="badge rain"
                title="Previsão indica chuva"
              >
                Chuva
              </span>
              <span
                v-else-if="a.weatherSnapshot?.status === 'clear'"
                class="badge clear"
                title="Previsão indica dia limpo"
              >
                Limpo
              </span>
              <span v-else class="badge" title="Previsão indisponível">Clima?</span>
            </div>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 12px 0" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { CalendarCheck2, CloudSun } from 'lucide-vue-next';
import { api } from '../services/api.js';
import { extractErrorMessage } from '../services/errors.js';
import { formatCepInput, normalizeCep } from '../services/formatters.js';

const dateISO = ref(new Date().toLocaleDateString('sv-SE'));
const timeHHMM = ref('');
const cep = ref('');
const notes = ref('');
const address = ref(null);
const appointments = ref([]);
const slots = ref([]);
const weatherPreview = ref(null);
const previewing = ref(false);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
let autoDateAdjusted = false;

function notify(message) {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message } }));
}

async function loadAppointments() {
  loading.value = true;
  try {
    const { data } = await api.get('/api/appointments', { params: { date: dateISO.value } });
    appointments.value = data?.items || [];
  } catch (e) {
    notify(extractErrorMessage(e, 'Não foi possível carregar os agendamentos.'));
  } finally {
    loading.value = false;
  }
}

async function loadSlots() {
  try {
    const { data } = await api.get('/api/appointments/slots', { params: { date: dateISO.value } });
    slots.value = data?.slots || [];
    const firstAvailable = slots.value.find((s) => s.available);
    if (!firstAvailable && !autoDateAdjusted) {
      const today = new Date().toLocaleDateString('sv-SE');
      if (dateISO.value === today) {
        autoDateAdjusted = true;
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE');
        dateISO.value = tomorrow;
        notify('Não há horários disponíveis hoje. Exibindo o próximo dia.');
        return;
      }
    }
    if (!timeHHMM.value || !slots.value.some((s) => s.timeHHMM === timeHHMM.value && s.available)) {
      timeHHMM.value = firstAvailable ? firstAvailable.timeHHMM : '';
    }
  } catch (e) {
    slots.value = [];
    notify(extractErrorMessage(e, 'Não foi possível carregar os horários disponíveis.'));
  }
}

async function handleCepLookup() {
  const value = normalizeCep(cep.value);
  if (!value) return;
  try {
    const { data } = await api.get(`/api/address/cep/${encodeURIComponent(value)}`);
    if (data?.ok) {
      address.value = data.address;
    }
  } catch (e) {
    address.value = null;
    error.value = extractErrorMessage(e, 'Não foi possível consultar o CEP.');
  }
}

function handleCepInput(e) {
  cep.value = formatCepInput(e?.target?.value || cep.value);
}

async function handleWeatherPreview() {
  if (!dateISO.value || !cep.value) {
    error.value = 'Para ver o clima, preencha data e CEP.';
    return;
  }
  previewing.value = true;
  try {
    const { data } = await api.get('/api/appointments/weather-preview', {
      params: { dateISO: dateISO.value, cep: cep.value },
    });
    weatherPreview.value = data?.weatherSnapshot || null;
    address.value = data?.address || address.value;
  } catch (e) {
    error.value = extractErrorMessage(e, 'Não foi possível consultar a previsão do tempo.');
  } finally {
    previewing.value = false;
  }
}

function translateStatus(status) {
  if (status === 'scheduled') return 'Agendado';
  if (status === 'completed') return 'Concluído';
  if (status === 'cancelled') return 'Cancelado';
  return status || '-';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function handleCreate() {
  error.value = '';
  const cepValue = normalizeCep(cep.value);
  if (!dateISO.value) {
    error.value = 'Selecione uma data para o agendamento.';
    return;
  }
  if (!timeHHMM.value) {
    error.value = 'Selecione um horário disponível.';
    return;
  }
  if (!cepValue || cepValue.length !== 8) {
    error.value = 'Informe um CEP válido com 8 números.';
    return;
  }

  submitting.value = true;
  try {
    const body = {
      dateISO: dateISO.value,
      timeHHMM: timeHHMM.value,
      cep: cepValue,
      notes: notes.value,
    };
    const { data } = await api.post('/api/appointments', body);
    if (!data?.ok) throw new Error(data?.error || 'Falha ao criar agendamento');

    const status = data?.item?.weatherSnapshot?.status;
    if (status === 'rain') notify('A previsão indica chuva no dia do seu agendamento.');
    else if (status === 'clear') notify('Previsão: dia limpo (sem chuva esperada).');
    else notify('Clima: previsão indisponível no momento.');

    notes.value = '';
    await Promise.all([loadAppointments(), loadSlots()]);
  } catch (e) {
    error.value = extractErrorMessage(e, 'Não foi possível criar o agendamento.');
    // Conflitos de horário: aviso mais direto.
    if (e?.response?.status === 409) notify('Horário indisponível: já existe outro agendamento.');
  } finally {
    submitting.value = false;
  }
}

watch(dateISO, async () => {
  error.value = '';
  autoDateAdjusted = false;
  await Promise.all([loadAppointments(), loadSlots()]);
});

onMounted(() => {
  loadAppointments();
  loadSlots();
});
</script>

