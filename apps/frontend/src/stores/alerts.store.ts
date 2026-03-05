import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { alertsApi } from '@/api/client';
import { getSocket } from '@/api/socket';
import type { Alert } from '@/types';

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<Alert[]>([]);
  const showAll = ref(false);
  const loading = ref(false);

  const unacknowledgedCount = computed(
    () => alerts.value.filter((a) => !a.acknowledgedAt).length,
  );

  async function fetchAlerts() {
    loading.value = true;
    try {
      const res = await alertsApi.list(showAll.value);
      alerts.value = res.data as Alert[];
    } finally {
      loading.value = false;
    }
  }

  async function acknowledge(id: string) {
    await alertsApi.ack(id);
    // Optimistic update
    const idx = alerts.value.findIndex((a) => a.id === id);
    if (idx !== -1) {
      alerts.value[idx] = { ...alerts.value[idx], acknowledgedAt: new Date().toISOString() };
    }
    if (!showAll.value) {
      alerts.value = alerts.value.filter((a) => a.id !== id);
    }
  }

  function subscribeToEvents() {
    try {
      const socket = getSocket();
      socket.on('alert.created', () => fetchAlerts());
      socket.on('alert.updated', () => fetchAlerts());
    } catch { /* socket not ready */ }
  }

  return { alerts, showAll, loading, unacknowledgedCount, fetchAlerts, acknowledge, subscribeToEvents };
});
