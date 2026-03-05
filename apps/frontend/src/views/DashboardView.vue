<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDashboardStore } from '@/stores/dashboard.store';
import { terminalsApi, tripsApi } from '@/api/client';
import KpiCard from '@/components/ui/KpiCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import RiskBadge from '@/components/ui/RiskBadge.vue';
import type { Terminal, DashboardTruckRow } from '@/types';

const { t } = useI18n();
const store = useDashboardStore();
const terminals = ref<Terminal[]>([]);

// ── Trip modal ───────────────────────────────────────────────────────────────
interface TripDetail {
  code: string;
  status: string;
  originTerminal: { name: string };
  destinationTerminal: { name: string };
  plannedStartAt: string;
  plannedEtaAt: string;
  distanceKm?: number;
  marginComputed: number;
  rateIncome: number;
  fuelCostEst: number;
}

const showTripModal = ref(false);
const selectedTrip = ref<TripDetail | null>(null);

async function viewTrip(row: DashboardTruckRow) {
  if (!row.activeTrip?.id) return;
  const res = await tripsApi.get(row.activeTrip.id);
  selectedTrip.value = res.data as TripDetail;
  showTripModal.value = true;
}

// ── Quick actions ────────────────────────────────────────────────────────────
async function markArrived(row: DashboardTruckRow) {
  if (!row.activeTrip?.id) return;
  const newStatus = ['DEPARTED_ORIGIN', 'EN_ROUTE'].includes(row.activeTrip.status)
    ? 'ARRIVED_DEST'
    : 'ARRIVED_ORIGIN';
  await tripsApi.updateStatus(row.activeTrip.id, newStatus);
  await store.refresh();
}

async function markDeparted(row: DashboardTruckRow) {
  if (!row.activeTrip?.id) return;
  await tripsApi.updateStatus(row.activeTrip.id, 'DEPARTED_ORIGIN');
  await store.refresh();
}

// ── Formatters ───────────────────────────────────────────────────────────────
function formatEta(iso?: string) {
  if (!iso) return t('common.none');
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso?: string) {
  if (!iso) return t('common.none');
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(v);
}

let refreshInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  const res = await terminalsApi.list();
  terminals.value = res.data as Terminal[];
  await store.refresh();
  store.subscribeToEvents();
  refreshInterval = setInterval(() => store.fetchSummary(), 30_000);
});
onUnmounted(() => clearInterval(refreshInterval));
</script>

<template>
  <div class="space-y-6">
    <!-- KPI Cards -->
    <section :aria-label="t('dashboard.title')">
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard :label="t('dashboard.kpi.activeTrips')" :value="store.summary?.activeTrips ?? '…'" :loading="!store.summary" color="blue" />
        <KpiCard :label="t('dashboard.kpi.idleTrucks')" :value="store.summary?.idleTrucks ?? '…'" :loading="!store.summary" color="gray" />
        <KpiCard :label="t('dashboard.kpi.lateRisk')" :value="store.summary?.lateRisk ?? '…'" :loading="!store.summary" color="red" />
        <KpiCard
          :label="t('dashboard.kpi.avgDwell')"
          :value="store.summary ? `${store.summary.avgDwellMinutes} ${t('dashboard.kpi.avgDwellUnit')}` : '…'"
          :loading="!store.summary"
          color="yellow"
        />
        <KpiCard :label="t('dashboard.kpi.marginToday')" :value="store.summary ? formatCurrency(store.summary.marginToday) : '…'" :loading="!store.summary" color="green" />
      </div>
    </section>

    <!-- Truck Table -->
    <section class="card" :aria-label="t('dashboard.table.heading')">
      <!-- Filters -->
      <div class="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-3 items-center">
        <h2 class="text-sm font-semibold text-gray-700 mr-2 shrink-0">{{ t('dashboard.table.heading') }}</h2>

        <div class="relative flex-1 min-w-40">
          <input v-model="store.filters.search" type="search" :placeholder="t('dashboard.table.search')" class="input pl-8 text-xs" @input="store.fetchTrucks()" />
          <svg class="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select v-model="store.filters.status" class="input text-xs w-36" @change="store.fetchTrucks()">
          <option value="">{{ t('dashboard.table.allStatuses') }}</option>
          <option v-for="s in ['IDLE','EN_ROUTE','LOADING','UNLOADING','MAINTENANCE']" :key="s" :value="s">{{ t(`status.truck.${s}`) }}</option>
        </select>

        <select v-model="store.filters.terminalId" class="input text-xs w-40" @change="store.fetchTrucks()">
          <option value="">{{ t('dashboard.table.allTerminals') }}</option>
          <option v-for="t2 in terminals" :key="t2.id" :value="t2.id">{{ t2.name }}</option>
        </select>

        <select v-model="store.filters.risk" class="input text-xs w-32" @change="store.fetchTrucks()">
          <option value="">{{ t('dashboard.table.allRisks') }}</option>
          <option value="LATE">{{ t('risk.LATE') }}</option>
          <option value="DWELL">{{ t('risk.DWELL') }}</option>
          <option value="NONE">{{ t('common.none') }}</option>
        </select>

        <button class="btn-ghost text-xs ml-auto" @click="store.refresh()" :disabled="store.loading">
          <svg class="w-4 h-4" :class="{ 'animate-spin': store.loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ t('dashboard.table.refresh') }}
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="table-header">{{ t('dashboard.table.colTruck') }}</th>
              <th class="table-header">{{ t('dashboard.table.colDriver') }}</th>
              <th class="table-header">{{ t('dashboard.table.colStatus') }}</th>
              <th class="table-header hidden sm:table-cell">{{ t('dashboard.table.colTrip') }}</th>
              <th class="table-header hidden md:table-cell">{{ t('dashboard.table.colEta') }}</th>
              <th class="table-header hidden lg:table-cell">{{ t('dashboard.table.colTerminal') }}</th>
              <th class="table-header">{{ t('dashboard.table.colRisk') }}</th>
              <th class="table-header">{{ t('dashboard.table.colActions') }}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <template v-if="store.loading && store.trucks.length === 0">
              <tr v-for="i in 8" :key="i">
                <td colspan="8" class="table-cell"><div class="h-4 bg-gray-200 rounded animate-pulse w-full" /></td>
              </tr>
            </template>
            <tr v-else-if="!store.loading && store.trucks.length === 0">
              <td colspan="8" class="table-cell text-center text-gray-400 py-12">{{ t('dashboard.table.noMatch') }}</td>
            </tr>
            <tr
              v-else
              v-for="row in store.trucks"
              :key="row.truckId"
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'bg-red-50': row.risk !== 'NONE' }"
            >
              <td class="table-cell font-mono font-semibold text-gray-800">{{ row.code }}</td>
              <td class="table-cell text-gray-600">{{ row.activeTrip?.driver?.name ?? t('common.none') }}</td>
              <td class="table-cell"><StatusBadge :status="row.status" type="truck" /></td>
              <td class="table-cell hidden sm:table-cell text-gray-600 text-xs">
                <span v-if="row.activeTrip">
                  <span class="font-mono">{{ row.activeTrip.code }}</span>
                  <span class="text-gray-400 mx-1">·</span>
                  {{ row.activeTrip.originTerminal.name }} → {{ row.activeTrip.destinationTerminal.name }}
                </span>
                <span v-else class="text-gray-400">{{ t('common.none') }}</span>
              </td>
              <td class="table-cell hidden md:table-cell text-gray-600">
                <span v-if="row.eta">
                  {{ formatEta(row.eta) }}
                  <span v-if="(row.activeTrip?.etaDriftMinutes ?? 0) > 0" class="ml-1 text-xs text-red-600 font-medium">
                    +{{ row.activeTrip?.etaDriftMinutes }}m
                  </span>
                </span>
                <span v-else class="text-gray-400">{{ t('common.none') }}</span>
              </td>
              <td class="table-cell hidden lg:table-cell text-gray-600 text-xs">{{ row.lastTerminal?.name ?? t('common.none') }}</td>
              <td class="table-cell"><RiskBadge :risk="row.risk" /></td>
              <td class="table-cell">
                <div class="flex items-center gap-1 flex-wrap">
                  <button v-if="row.activeTrip" class="btn-ghost text-xs px-2 py-1" @click="viewTrip(row)">
                    {{ t('dashboard.table.actView') }}
                  </button>
                  <button v-if="row.activeTrip && ['EN_ROUTE','DEPARTED_ORIGIN'].includes(row.activeTrip.status)" class="btn-secondary text-xs px-2 py-1" @click="markArrived(row)">
                    {{ t('dashboard.table.actArrived') }}
                  </button>
                  <button v-if="row.activeTrip && ['ARRIVED_ORIGIN','LOADING'].includes(row.activeTrip.status)" class="btn-secondary text-xs px-2 py-1" @click="markDeparted(row)">
                    {{ t('dashboard.table.actDeparted') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
        {{ t('dashboard.table.showing', { count: store.trucks.length }) }}
      </div>
    </section>
  </div>

  <!-- Trip modal -->
  <Teleport to="body">
    <div v-if="showTripModal" class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showTripModal = false" />
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">{{ t('dashboard.tripModal.title') }}</h3>
            <button class="btn-ghost p-1" @click="showTripModal = false" :aria-label="t('common.close')">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div v-if="selectedTrip" class="grid grid-cols-2 gap-3 text-sm">
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.code') }}</div><div class="font-mono font-semibold">{{ selectedTrip.code }}</div></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.status') }}</div><StatusBadge :status="selectedTrip.status" type="trip" /></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.origin') }}</div><div>{{ selectedTrip.originTerminal?.name }}</div></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.destination') }}</div><div>{{ selectedTrip.destinationTerminal?.name }}</div></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.plannedStart') }}</div><div>{{ formatDate(selectedTrip.plannedStartAt) }}</div></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.plannedEta') }}</div><div>{{ formatDate(selectedTrip.plannedEtaAt) }}</div></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.distance') }}</div><div>{{ selectedTrip.distanceKm ? t('common.km', { v: selectedTrip.distanceKm }) : t('common.none') }}</div></div>
            <div>
              <div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.margin') }}</div>
              <div class="font-semibold" :class="selectedTrip.marginComputed >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(selectedTrip.marginComputed) }}
              </div>
            </div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.rateIncome') }}</div><div>{{ formatCurrency(selectedTrip.rateIncome) }}</div></div>
            <div><div class="text-xs text-gray-500 mb-0.5">{{ t('dashboard.tripModal.fuelCost') }}</div><div>{{ formatCurrency(selectedTrip.fuelCostEst) }}</div></div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
