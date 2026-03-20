<template>
  <div class="row" style="align-items: flex-start">
    <div style="flex: 1 1 520px">
      <div class="card">
        <h2 style="margin-top: 0">Painel Administrativo</h2>
        <div class="muted" style="margin-bottom: 12px">
          A secretária pode ver/gerenciar todos os agendamentos.
        </div>

        <div class="row" style="margin-bottom: 10px">
          <div class="field" style="min-width: 180px">
            <label>Filtro status</label>
            <select v-model="filterStatus">
              <option value="all">Todos</option>
              <option value="scheduled">Agendado</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div class="field" style="min-width: 280px">
            <label>Filtro paciente</label>
            <select v-model="filterPatientId">
              <option value="all">Todos</option>
              <option v-for="p in patients" :key="`filter_${p.id}`" :value="p.id">
                {{ p.name }} ({{ p.email }})
              </option>
            </select>
          </div>
        </div>

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
          <div class="field" style="min-width: 260px">
            <label>Paciente</label>
            <select v-model="selectedPatientId">
              <option v-for="p in patients" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.email }})
              </option>
            </select>
          </div>
          <div class="field" style="min-width: 180px">
            <label>CEP</label>
            <input
              v-model="cep"
              placeholder="00000-000"
              maxlength="9"
              inputmode="numeric"
              @input="handleCepInput"
              @blur="handleCepLookup"
            />
          </div>
        </div>

        <div class="row" style="margin-top: 10px">
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
            <textarea v-model="notes" placeholder="Ex.: detalhes do atendimento"></textarea>
          </div>
        </div>

        <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap">
          <button :disabled="previewing" @click="handleWeatherPreview">
            <CloudSun :size="15" style="vertical-align: text-bottom; margin-right: 6px" />
            {{ previewing ? 'Consultando clima...' : 'Previsão do clima' }}
          </button>
          <button class="primary" :disabled="submitting" @click="handleCreate">
            <CalendarPlus2 :size="15" style="vertical-align: text-bottom; margin-right: 6px" />
            {{ submitting ? 'Agendando...' : 'Criar agendamento' }}
          </button>
          <button :disabled="!selectedRescheduleId || submitting" @click="handleRescheduleSelected">
            <CalendarSync :size="15" style="vertical-align: text-bottom; margin-right: 6px" />
            Remarcar selecionado
          </button>
        </div>
        <div v-if="selectedRescheduleId" class="muted" style="margin-top: 8px">
          Remarcação selecionada: {{ selectedRescheduleId }}
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
        <h2 style="margin-top: 0">Agendamentos do dia</h2>

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
                Paciente: {{ a.patient.name }}
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
              <div style="margin-top: 8px" v-if="a.weatherSnapshot">
                <span
                  v-if="a.weatherSnapshot.status === 'rain'"
                  class="badge rain"
                  title="Previsão indica chuva"
                >
                  Chuva
                </span>
                <span
                  v-else-if="a.weatherSnapshot.status === 'clear'"
                  class="badge clear"
                  title="Previsão indica dia limpo"
                >
                  Limpo
                </span>
                <span v-else class="badge" title="Previsão indisponível">Clima?</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end">
              <button class="danger" :disabled="a.status === 'cancelled'" @click="handleCancel(a.id)">
                <XCircle :size="15" style="vertical-align: text-bottom; margin-right: 6px" />
                {{ a.status === 'cancelled' ? 'Cancelado' : 'Cancelar' }}
              </button>
              <button @click="prefillReschedule(a)">Remarcar</button>
              <select :value="a.status" @change="handleStatusChange(a.id, $event.target.value)">
                <option value="scheduled">Agendado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 12px 0" />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px">
          <div class="muted" style="font-size: 13px">
            Página {{ page }} de {{ totalPages }} ({{ total }} itens)
          </div>
          <div style="display: flex; gap: 8px">
            <button :disabled="page <= 1 || loading" @click="changePage(page - 1)">Anterior</button>
            <button :disabled="page >= totalPages || loading" @click="changePage(page + 1)">Próxima</button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="showBackToTop" class="back-to-top" @click="scrollToTop">Voltar ao topo</button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { CalendarPlus2, CalendarSync, CloudSun, XCircle } from 'lucide-vue-next';
import { api } from '../services/api.js';
import { extractErrorMessage } from '../services/errors.js';
import { formatCepInput, normalizeCep } from '../services/formatters.js';

const dateISO = ref(new Date().toLocaleDateString('sv-SE'));
const timeHHMM = ref('');
const cep = ref('');
const notes = ref('');
const address = ref(null);
const slots = ref([]);
const weatherPreview = ref(null);
const previewing = ref(false);

const patients = ref([]);
const selectedPatientId = ref('');

const appointments = ref([]);
const selectedRescheduleId = ref('');
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const filterStatus = ref('all');
const filterPatientId = ref('all');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = ref(1);
const showBackToTop = ref(false);
let autoDateAdjusted = false;

function notify(message) {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message } }));
}

async function loadPatients() {
  const { data } = await api.get('/api/admin/patients');
  patients.value = data?.patients || [];
  if (!selectedPatientId.value && patients.value.length) {
    selectedPatientId.value = patients.value[0].id;
  }
}

async function loadAppointments() {
  loading.value = true;
  try {
    const { data } = await api.get('/api/admin/appointments', {
      params: {
        date: dateISO.value,
        status: filterStatus.value,
        patientId: filterPatientId.value,
        page: page.value,
        limit: limit.value,
      },
    });
    appointments.value = data?.items || [];
    page.value = data?.page || 1;
    limit.value = data?.limit || 10;
    total.value = data?.total || 0;
    totalPages.value = data?.totalPages || 1;
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
    if (data?.ok) address.value = data.address;
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

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function translateStatus(status) {
  if (status === 'scheduled') return 'Agendado';
  if (status === 'completed') return 'Concluído';
  if (status === 'cancelled') return 'Cancelado';
  return status || '-';
}

async function handleCreate() {
  error.value = '';
  const cepValue = normalizeCep(cep.value);
  if (!selectedPatientId.value) {
    error.value = 'Selecione um paciente para criar o agendamento.';
    return;
  }
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
      patientId: selectedPatientId.value,
    };
    const { data } = await api.post('/api/appointments', body);
    if (!data?.ok) throw new Error(data?.error || 'Falha ao criar agendamento');

    const status = data?.item?.weatherSnapshot?.status;
    if (status === 'rain') notify('A previsão indica chuva no dia do atendimento.');
    else if (status === 'clear') notify('Previsão: dia limpo (sem chuva esperada).');
    else notify('Clima: previsão indisponível no momento.');

    notes.value = '';
    await Promise.all([loadAppointments(), loadSlots()]);
  } catch (e) {
    error.value = extractErrorMessage(e, 'Não foi possível criar o agendamento.');
    if (e?.response?.status === 409) notify('Horário indisponível: já existe outro agendamento.');
  } finally {
    submitting.value = false;
  }
}

async function handleCancel(id) {
  try {
    await api.patch(`/api/admin/appointments/${id}/cancel`);
    notify('Agendamento cancelado.');
    await Promise.all([loadAppointments(), loadSlots()]);
  } catch (e) {
    notify(extractErrorMessage(e, 'Não foi possível cancelar o agendamento.'));
  }
}

function prefillReschedule(a) {
  selectedRescheduleId.value = a.id;
  dateISO.value = new Date(a.startAt).toLocaleDateString('sv-SE');
  timeHHMM.value = formatTime(a.startAt);
  cep.value = a.address?.cep || '';
  selectedPatientId.value = a.patient?.id || selectedPatientId.value;
  notify('Dados carregados. Ajuste data/slot e clique em "Remarcar selecionado".');
}

async function handleStatusChange(id, status) {
  try {
    await api.patch(`/api/admin/appointments/${id}/status`, { status });
    notify(`Status atualizado para ${translateStatus(status)}.`);
    await loadAppointments();
  } catch (e) {
    notify(extractErrorMessage(e, 'Não foi possível atualizar o status.'));
  }
}

async function handleRescheduleSelected() {
  if (!selectedRescheduleId.value) return;
  try {
    await api.patch(`/api/admin/appointments/${selectedRescheduleId.value}/reschedule`, {
      dateISO: dateISO.value,
      timeHHMM: timeHHMM.value,
      cep: cep.value || undefined,
    });
    notify('Agendamento remarcado com sucesso.');
    selectedRescheduleId.value = '';
    await Promise.all([loadAppointments(), loadSlots()]);
  } catch (e) {
    notify(extractErrorMessage(e, 'Não foi possível remarcar o agendamento.'));
  }
}

watch(dateISO, async () => {
  page.value = 1;
  error.value = '';
  autoDateAdjusted = false;
  await Promise.all([loadAppointments(), loadSlots()]);
});

watch([filterStatus, filterPatientId], async () => {
  page.value = 1;
  await Promise.all([loadAppointments(), loadSlots()]);
});

function changePage(nextPage) {
  page.value = nextPage;
  loadAppointments();
}

function onScroll() {
  showBackToTop.value = window.scrollY > 300;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll);
  await loadPatients();
  await Promise.all([loadAppointments(), loadSlots()]);
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

