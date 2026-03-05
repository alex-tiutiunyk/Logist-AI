import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';
import type { DashboardSummary, DashboardTruckRow, TruckStatus } from '@/types';

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary | null>(null);
  const trucks = ref<DashboardTruckRow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Active filter state
  const filters = ref({
    status: '' as TruckStatus | '',
    terminalId: '',
    risk: '',
    search: '',
  });

  async function fetchSummary() {
    const res = await dashboardApi.summary();
    summary.value = res.data as DashboardSummary;
  }

  async function fetchTrucks() {
    loading.value = true;
    error.value = null;
    try {
      const params: Record<string, string> = {};
      if (filters.value.status) params.status = filters.value.status;
      if (filters.value.terminalId) params.terminalId = filters.value.terminalId;
      if (filters.value.risk) params.risk = filters.value.risk;
      if (filters.value.search) params.search = filters.value.search;
      const res = await dashboardApi.trucks(params);
      trucks.value = res.data as DashboardTruckRow[];
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? 'Failed to load trucks';
    } finally {
      loading.value = false;
    }
  }

  async function refresh() {
    await Promise.all([fetchSummary(), fetchTrucks()]);
  }

  /** Subscribe to WebSocket events and trigger refreshes */
  function subscribeToEvents() {
    try {
      const socket = getSocket();
      socket.on('truck.updated', () => {
        fetchTrucks();
        fetchSummary();
      });
      socket.on('trip.updated', () => {
        fetchTrucks();
        fetchSummary();
      });
      socket.on('alert.created', () => {
        fetchSummary();
      });
    } catch {
      // Socket may not be initialized yet — events will be bound on login
    }
  }

  return { summary, trucks, loading, error, filters, fetchSummary, fetchTrucks, refresh, subscribeToEvents };
});
