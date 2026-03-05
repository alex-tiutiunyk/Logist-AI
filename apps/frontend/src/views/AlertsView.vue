<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlertsStore } from '@/stores/alerts.store';
import AlertBadge from '@/components/ui/AlertBadge.vue';

const { t } = useI18n();
const store = useAlertsStore();

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function severityRowClass(severity: string): string {
  if (severity === 'CRITICAL') return 'border-l-4 border-red-500';
  if (severity === 'WARNING') return 'border-l-4 border-yellow-400';
  return 'border-l-4 border-blue-300';
}

onMounted(async () => {
  await store.fetchAlerts();
  store.subscribeToEvents();
});
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold text-gray-800">{{ t('alerts.title') }}</h2>
        <span
          v-if="store.unacknowledgedCount > 0"
          class="flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold"
          aria-live="polite"
          :aria-label="`${store.unacknowledgedCount} ${t('alerts.title')}`"
        >
          {{ store.unacknowledgedCount }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            v-model="store.showAll"
            type="checkbox"
            class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            @change="store.fetchAlerts()"
          />
          {{ t('alerts.showAcknowledged') }}
        </label>
        <button class="btn-ghost text-sm" @click="store.fetchAlerts()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ t('alerts.refresh') }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!store.loading && store.alerts.length === 0"
      class="card py-16 text-center"
    >
      <div class="text-4xl mb-3">✅</div>
      <div class="text-gray-500 text-sm">{{ t('alerts.empty') }}</div>
    </div>

    <!-- Alert list -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="table-header">{{ t('alerts.colType') }}</th>
              <th class="table-header">{{ t('alerts.colMessage') }}</th>
              <th class="table-header hidden sm:table-cell">{{ t('alerts.colTruck') }}</th>
              <th class="table-header hidden md:table-cell">{{ t('alerts.colTrip') }}</th>
              <th class="table-header hidden lg:table-cell">{{ t('alerts.colTerminal') }}</th>
              <th class="table-header">{{ t('alerts.colTime') }}</th>
              <th class="table-header">{{ t('alerts.colAction') }}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <!-- Loading -->
            <tr v-if="store.loading" v-for="i in 5" :key="i">
              <td colspan="7" class="table-cell">
                <div class="h-4 bg-gray-100 rounded animate-pulse" />
              </td>
            </tr>

            <tr
              v-else
              v-for="alert in store.alerts"
              :key="alert.id"
              class="hover:bg-gray-50 transition-colors"
              :class="[severityRowClass(alert.severity), alert.acknowledgedAt ? 'opacity-60' : '']"
            >
              <td class="table-cell">
                <AlertBadge :type="alert.type" :severity="alert.severity" />
              </td>
              <td class="table-cell max-w-xs">
                <span class="text-sm text-gray-800">{{ alert.message }}</span>
              </td>
              <td class="table-cell hidden sm:table-cell font-mono text-xs text-gray-600">
                {{ alert.truck?.code ?? '—' }}
              </td>
              <td class="table-cell hidden md:table-cell font-mono text-xs text-gray-600">
                {{ alert.trip?.code ?? '—' }}
              </td>
              <td class="table-cell hidden lg:table-cell text-xs text-gray-600">
                {{ alert.terminal?.name ?? '—' }}
              </td>
              <td class="table-cell text-xs text-gray-500 whitespace-nowrap">
                {{ formatTime(alert.createdAt) }}
              </td>
              <td class="table-cell">
                <span
                  v-if="alert.acknowledgedAt"
                  class="text-xs text-gray-400 italic"
                >
                  {{ t('alerts.acknowledged') }}
                </span>
                <button
                  v-else
                  class="btn-secondary text-xs"
                  @click="store.acknowledge(alert.id)"
                >
                  {{ t('alerts.ack') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
        {{ t('alerts.count', { count: store.alerts.length }, store.alerts.length) }}
        · {{ t('alerts.jobInfo') }}
      </div>
    </div>

    <!-- Info box -->
    <div class="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
      <strong>{{ t('alerts.infoLabel') }}</strong>
      {{ t('alerts.infoBox', {
        types: t('alertType.LATE_RISK'),
        dwell: t('alertType.DWELL_RISK'),
        idle: t('alertType.IDLE_TOO_LONG'),
      }) }}
    </div>
  </div>
</template>
