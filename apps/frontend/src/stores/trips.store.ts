import { defineStore } from 'pinia';
import { ref } from 'vue';
import { tripsApi, terminalsApi, trucksApi, driversApi } from '@/api/client';
import { getSocket } from '@/api/socket';
import type { Trip, Terminal, Truck, Driver, SuggestedTruck } from '@/types';

export const useTripsStore = defineStore('trips', () => {
  const trips = ref<Trip[]>([]);
  const terminals = ref<Terminal[]>([]);
  const trucks = ref<Truck[]>([]);
  const drivers = ref<Driver[]>([]);
  const suggestions = ref<SuggestedTruck[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTrips(params?: Record<string, string>) {
    loading.value = true;
    try {
      const res = await tripsApi.list(params);
      trips.value = res.data as Trip[];
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? 'Failed to load trips';
    } finally {
      loading.value = false;
    }
  }

  async function fetchFormData() {
    const [termRes, truckRes, driverRes] = await Promise.all([
      terminalsApi.list(),
      trucksApi.list(),
      driversApi.list(),
    ]);
    terminals.value = termRes.data as Terminal[];
    trucks.value = truckRes.data as Truck[];
    drivers.value = driverRes.data as Driver[];
  }

  async function createTrip(data: Record<string, unknown>) {
    const res = await tripsApi.create(data);
    trips.value.unshift(res.data as Trip);
    return res.data as Trip;
  }

  async function updateStatus(tripId: string, status: string) {
    await tripsApi.updateStatus(tripId, status);
    await fetchTrips();
  }

  async function suggestTruck(originTerminalId: string, plannedStartAt: string) {
    const res = await tripsApi.suggestTruck({ originTerminalId, plannedStartAt });
    suggestions.value = res.data as SuggestedTruck[];
    return suggestions.value;
  }

  function subscribeToEvents() {
    try {
      const socket = getSocket();
      socket.on('trip.updated', () => fetchTrips());
    } catch { /* socket not ready */ }
  }

  return {
    trips, terminals, trucks, drivers, suggestions,
    loading, error,
    fetchTrips, fetchFormData, createTrip, updateStatus, suggestTruck, subscribeToEvents,
  };
});
