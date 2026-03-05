<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTripsStore } from '@/stores/trips.store';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import type { SuggestedTruck } from '@/types';

const { t } = useI18n();
const store = useTripsStore();

const statusFilter = ref('');
const searchFilter = ref('');

const filteredTrips = computed(() =>
  store.trips.filter((trip) => {
    if (statusFilter.value && trip.status !== statusFilter.value) return false;
    if (searchFilter.value) {
      const q = searchFilter.value.toLowerCase();
      return (
        trip.code.toLowerCase().includes(q) ||
        trip.truck?.code.toLowerCase().includes(q) ||
        trip.driver?.name.toLowerCase().includes(q)
      );
    }
    return true;
  })
);

// ── Form ─────────────────────────────────────────────────────────────────────
const showForm = ref(false);
const formError = ref('');
const formLoading = ref(false);
const suggestions = ref<SuggestedTruck[]>([]);
const suggestLoading = ref(false);

const form = ref({
  originTerminalId: '', destinationTerminalId: '',
  plannedStartAt: '', plannedEtaAt: '',
  truckId: '', driverId: '',
  distanceKm: '', cargoWeightKg: '',
  rateIncome: '', fuelCostEst: '', otherCostEst: '',
});

async function getSuggestions() {
  if (!form.value.originTerminalId || !form.value.plannedStartAt) { suggestions.value = []; return; }
  suggestLoading.value = true;
  try {
    suggestions.value = await store.suggestTruck(form.value.originTerminalId, form.value.plannedStartAt);
  } finally { suggestLoading.value = false; }
}

function applySuggestion(s: SuggestedTruck) {
  form.value.truckId = s.truckId;
}

async function submitForm() {
  formError.value = '';
  formLoading.value = true;
  try {
    await store.createTrip({
      originTerminalId: form.value.originTerminalId,
      destinationTerminalId: form.value.destinationTerminalId,
      plannedStartAt: form.value.plannedStartAt,
      plannedEtaAt: form.value.plannedEtaAt,
      truckId: form.value.truckId || undefined,
      driverId: form.value.driverId || undefined,
      distanceKm: form.value.distanceKm ? Number(form.value.distanceKm) : undefined,
      cargoWeightKg: form.value.cargoWeightKg ? Number(form.value.cargoWeightKg) : undefined,
      rateIncome: Number(form.value.rateIncome),
      fuelCostEst: Number(form.value.fuelCostEst),
      otherCostEst: Number(form.value.otherCostEst) || 0,
    });
    showForm.value = false;
    resetForm();
  } catch (e: unknown) {
    const axiosError = e as { response?: { data?: { message?: string | string[] } } };
    const msg = axiosError.response?.data?.message;
    formError.value = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create trip');
  } finally { formLoading.value = false; }
}

function resetForm() {
  Object.assign(form.value, { originTerminalId:'', destinationTerminalId:'', plannedStartAt:'', plannedEtaAt:'', truckId:'', driverId:'', distanceKm:'', cargoWeightKg:'', rateIncome:'', fuelCostEst:'', otherCostEst:'' });
  suggestions.value = [];
}

const tripStatuses = ['PLANNED','EN_ROUTE','ARRIVED_ORIGIN','LOADING','DEPARTED_ORIGIN','ARRIVED_DEST','UNLOADING','COMPLETED','CANCELED'];

function formatDate(iso: string) { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }); }
function formatCurrency(v: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(v); }

onMounted(async () => {
  await Promise.all([store.fetchTrips(), store.fetchFormData()]);
  store.subscribeToEvents();
});
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-xl font-semibold text-gray-800">{{ t('trips.title') }}</h2>
      <button class="btn-primary" @click="showForm = true">{{ t('trips.newTrip') }}</button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <div class="relative flex-1 min-w-48">
        <input v-model="searchFilter" type="search" :placeholder="t('trips.search')" class="input pl-8 text-sm" />
        <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <select v-model="statusFilter" class="input text-sm w-44">
        <option value="">{{ t('trips.allStatuses') }}</option>
        <option v-for="s in tripStatuses" :key="s" :value="s">{{ t(`status.trip.${s}`) }}</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="table-header">{{ t('trips.colCode') }}</th>
              <th class="table-header">{{ t('trips.colStatus') }}</th>
              <th class="table-header hidden sm:table-cell">{{ t('trips.colRoute') }}</th>
              <th class="table-header hidden md:table-cell">{{ t('trips.colTruck') }}</th>
              <th class="table-header hidden md:table-cell">{{ t('trips.colDriver') }}</th>
              <th class="table-header hidden lg:table-cell">{{ t('trips.colStart') }}</th>
              <th class="table-header hidden lg:table-cell">{{ t('trips.colEta') }}</th>
              <th class="table-header hidden xl:table-cell">{{ t('trips.colMargin') }}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-if="store.loading" v-for="i in 10" :key="i">
              <td colspan="8" class="table-cell"><div class="h-4 bg-gray-100 rounded animate-pulse" /></td>
            </tr>
            <tr v-else-if="filteredTrips.length === 0">
              <td colspan="8" class="table-cell text-center text-gray-400 py-12">{{ t('trips.noTrips') }}</td>
            </tr>
            <tr v-else v-for="trip in filteredTrips" :key="trip.id" class="hover:bg-gray-50">
              <td class="table-cell font-mono font-semibold text-gray-800">{{ trip.code }}</td>
              <td class="table-cell"><StatusBadge :status="trip.status" type="trip" /></td>
              <td class="table-cell hidden sm:table-cell text-xs text-gray-600">{{ trip.originTerminal.name }} → {{ trip.destinationTerminal.name }}</td>
              <td class="table-cell hidden md:table-cell font-mono text-xs text-gray-600">{{ trip.truck?.code ?? '—' }}</td>
              <td class="table-cell hidden md:table-cell text-xs text-gray-600">{{ trip.driver?.name ?? '—' }}</td>
              <td class="table-cell hidden lg:table-cell text-xs text-gray-600">{{ formatDate(trip.plannedStartAt) }}</td>
              <td class="table-cell hidden lg:table-cell text-xs text-gray-600">{{ formatDate(trip.plannedEtaAt) }}</td>
              <td class="table-cell hidden xl:table-cell text-xs font-medium" :class="trip.marginComputed >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(trip.marginComputed) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
        {{ t('trips.showing', { count: filteredTrips.length, total: store.trips.length }) }}
      </div>
    </div>
  </div>

  <!-- Create Trip Modal -->
  <Teleport to="body">
    <div v-if="showForm" class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex min-h-full items-start justify-center p-4 pt-12">
        <div class="fixed inset-0 bg-black/40" @click="showForm = false; resetForm()" />
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-lg font-semibold text-gray-900">{{ t('trips.form.title') }}</h3>
            <button class="btn-ghost p-1" @click="showForm = false; resetForm()" :aria-label="t('common.close')">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="submitForm" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">{{ t('trips.form.origin') }} *</label>
                <select v-model="form.originTerminalId" class="input" required @change="suggestions = []">
                  <option value="">{{ t('trips.form.originPlaceholder') }}</option>
                  <option v-for="term in store.terminals" :key="term.id" :value="term.id">{{ term.name }} ({{ t(`terminalType.${term.type}`) }})</option>
                </select>
              </div>
              <div>
                <label class="label">{{ t('trips.form.dest') }} *</label>
                <select v-model="form.destinationTerminalId" class="input" required>
                  <option value="">{{ t('trips.form.destPlaceholder') }}</option>
                  <option v-for="term in store.terminals" :key="term.id" :value="term.id">{{ term.name }} ({{ t(`terminalType.${term.type}`) }})</option>
                </select>
              </div>
              <div><label class="label">{{ t('trips.form.plannedStart') }} *</label><input v-model="form.plannedStartAt" type="datetime-local" class="input" required /></div>
              <div><label class="label">{{ t('trips.form.plannedEta') }} *</label><input v-model="form.plannedEtaAt" type="datetime-local" class="input" required /></div>
              <div><label class="label">{{ t('trips.form.distance') }}</label><input v-model="form.distanceKm" type="number" min="0" class="input" :placeholder="t('trips.form.distancePlaceholder')" /></div>
              <div><label class="label">{{ t('trips.form.cargo') }}</label><input v-model="form.cargoWeightKg" type="number" min="0" class="input" :placeholder="t('trips.form.cargoPlaceholder')" /></div>
              <div><label class="label">{{ t('trips.form.rate') }} *</label><input v-model="form.rateIncome" type="number" min="0" class="input" required :placeholder="t('trips.form.ratePlaceholder')" /></div>
              <div><label class="label">{{ t('trips.form.fuel') }} *</label><input v-model="form.fuelCostEst" type="number" min="0" class="input" required :placeholder="t('trips.form.fuelPlaceholder')" /></div>
              <div><label class="label">{{ t('trips.form.other') }}</label><input v-model="form.otherCostEst" type="number" min="0" class="input" :placeholder="t('trips.form.otherPlaceholder')" /></div>
            </div>

            <!-- Suggest truck -->
            <div class="pt-2 border-t border-gray-200">
              <div class="flex items-center justify-between mb-3">
                <label class="label mb-0">{{ t('trips.form.assignTruck') }}</label>
                <button type="button" class="btn-secondary text-xs" :disabled="!form.originTerminalId || !form.plannedStartAt || suggestLoading" @click="getSuggestions">
                  {{ suggestLoading ? t('trips.form.suggestLoading') : t('trips.form.suggestBtn') }}
                </button>
              </div>
              <div v-if="suggestions.length" class="mb-3 space-y-2">
                <div class="text-xs text-gray-500 mb-1">{{ t('trips.form.topSuggestions') }}</div>
                <button v-for="s in suggestions" :key="s.truckId" type="button"
                  class="w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 transition-colors"
                  :class="form.truckId === s.truckId ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 bg-white'"
                  @click="applySuggestion(s)"
                >
                  <div class="font-mono font-bold text-gray-800">{{ s.code }}</div>
                  <div class="flex-1 text-xs text-gray-600">{{ s.reason }}</div>
                  <StatusBadge :status="s.status" type="truck" />
                </button>
              </div>
              <select v-model="form.truckId" class="input">
                <option value="">{{ t('trips.form.manualTruck') }}</option>
                <option v-for="truck in store.trucks" :key="truck.id" :value="truck.id" :disabled="truck.status === 'MAINTENANCE'">
                  {{ truck.code }} ({{ t(`status.truck.${truck.status}`) }}){{ truck.status === 'MAINTENANCE' ? ' ' + t('trips.form.unavailable') : '' }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">{{ t('trips.form.assignDriver') }}</label>
              <select v-model="form.driverId" class="input">
                <option value="">{{ t('trips.form.noDriver') }}</option>
                <option v-for="driver in store.drivers" :key="driver.id" :value="driver.id">
                  {{ driver.name }}{{ driver.phone ? ` · ${driver.phone}` : '' }}
                </option>
              </select>
            </div>

            <div v-if="formError" class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">{{ formError }}</div>

            <div class="flex gap-3 justify-end pt-2">
              <button type="button" class="btn-secondary" @click="showForm = false; resetForm()">{{ t('trips.form.cancel') }}</button>
              <button type="submit" class="btn-primary" :disabled="formLoading">{{ formLoading ? t('trips.form.submitting') : t('trips.form.submit') }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
