<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTerminalsStore } from '@/stores/terminals.store';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import type { TerminalQueueEntry } from '@/types';

const { t } = useI18n();
const store = useTerminalsStore();

// Dwell timer — updated every minute
const now = ref(new Date());
let clockInterval: ReturnType<typeof setInterval>;

function getDwellMinutes(arrivedAt?: string): number {
  if (!arrivedAt) return 0;
  return Math.round((now.value.getTime() - new Date(arrivedAt).getTime()) / 60_000);
}

function formatDwell(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function dwellClass(entry: TerminalQueueEntry, arrivedAt?: string): string {
  if (!arrivedAt) return '';
  const dwell = getDwellMinutes(arrivedAt);
  const sla = entry.terminal.slaMinutes;
  if (dwell > sla) return 'text-red-600 font-semibold';
  if (dwell > sla * 0.75) return 'text-yellow-600 font-semibold';
  return 'text-gray-600';
}

async function handleAction(
  entry: TerminalQueueEntry,
  tripId: string,
  action: string,
) {
  await store.performAction(entry.terminal.id, tripId, action);
}

function getArrivalEvent(trip: TerminalQueueEntry['trips'][0]): string | undefined {
  return trip.terminalEvents?.find((e) => e.type === 'ARRIVED')?.at;
}

function terminalTypeClass(type: string): string {
  return type === 'OWN'
    ? 'bg-brand-100 text-brand-700'
    : 'bg-purple-100 text-purple-700';
}

onMounted(async () => {
  await store.fetchQueue();
  store.subscribeToEvents();
  clockInterval = setInterval(() => {
    now.value = new Date();
  }, 60_000);
});

onUnmounted(() => {
  clearInterval(clockInterval);
});
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-xl font-semibold text-gray-800">{{ t('terminals.title') }}</h2>
      <button class="btn-ghost text-sm" @click="store.fetchQueue()" :disabled="store.loading">
        <svg class="w-4 h-4" :class="{ 'animate-spin': store.loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ t('terminals.refresh') }}
      </button>
    </div>

    <!-- Error -->
    <div v-if="store.error" class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ store.error }}
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading && store.queue.length === 0" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="card p-5 animate-pulse">
        <div class="h-5 bg-gray-200 rounded w-1/2 mb-4" />
        <div class="h-4 bg-gray-100 rounded w-full mb-2" />
        <div class="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    </div>

    <!-- Terminal cards grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      <div v-for="entry in store.queue" :key="entry.terminal.id" class="card">
        <!-- Terminal header -->
        <div class="flex items-start justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <div class="font-semibold text-gray-900">{{ entry.terminal.name }}</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ t('terminals.sla', { min: entry.terminal.slaMinutes }) }}</div>
          </div>
          <span class="badge" :class="terminalTypeClass(entry.terminal.type)">
            {{ t(`terminalType.${entry.terminal.type}`) }}
          </span>
        </div>

        <!-- Truck queue -->
        <div class="divide-y divide-gray-100">
          <div
            v-if="entry.trips.length === 0"
            class="px-4 py-6 text-center text-sm text-gray-400"
          >
            {{ t('terminals.noTrucks') }}
          </div>

          <div
            v-for="trip in entry.trips"
            :key="trip.id"
            class="px-4 py-3"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-semibold text-sm text-gray-800">
                  {{ trip.truck?.code ?? '—' }}
                </span>
                <StatusBadge :status="trip.status" type="trip" />
              </div>
              <!-- Dwell time -->
              <div
                class="text-sm"
                :class="dwellClass(entry, getArrivalEvent(trip))"
                :title="`${getArrivalEvent(trip) ? new Date(getArrivalEvent(trip)!).toLocaleTimeString() : '?'}`"
              >
                {{ getArrivalEvent(trip) ? formatDwell(getDwellMinutes(getArrivalEvent(trip))) : '?' }}
                <span class="text-xs font-normal ml-0.5">{{ t('terminals.dwell') }}</span>
              </div>
            </div>

            <div class="text-xs text-gray-500 mb-3">
              {{ t('terminals.trip') }} <span class="font-mono">{{ trip.code }}</span>
              · {{ t('terminals.driver') }}: {{ trip.driver?.name ?? '—' }}
            </div>

            <!-- Action buttons based on trip status -->
            <div class="flex gap-2 flex-wrap">
              <button
                v-if="trip.status === 'ARRIVED_ORIGIN'"
                class="btn-primary text-xs"
                @click="handleAction(entry, trip.id, 'start_loading')"
              >
                {{ t('terminals.startLoading') }}
              </button>
              <button
                v-if="trip.status === 'LOADING'"
                class="btn-primary text-xs"
                @click="handleAction(entry, trip.id, 'finish_loading')"
              >
                {{ t('terminals.finishLoading') }}
              </button>
              <button
                v-if="trip.status === 'ARRIVED_DEST'"
                class="btn-primary text-xs"
                @click="handleAction(entry, trip.id, 'start_unloading')"
              >
                {{ t('terminals.startUnloading') }}
              </button>
              <button
                v-if="trip.status === 'UNLOADING'"
                class="btn-primary text-xs"
                @click="handleAction(entry, trip.id, 'finish_unloading')"
              >
                {{ t('terminals.finishUnloading') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer: truck count -->
        <div class="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <span class="text-xs text-gray-500">
            {{ t('terminals.countTrucks', { count: entry.trips.length }, entry.trips.length) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
