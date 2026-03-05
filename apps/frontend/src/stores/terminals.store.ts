import { defineStore } from 'pinia';
import { ref } from 'vue';
import { terminalsApi } from '@/api/client';
import { getSocket } from '@/api/socket';
import type { TerminalQueueEntry } from '@/types';

export const useTerminalsStore = defineStore('terminals', () => {
  const queue = ref<TerminalQueueEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchQueue() {
    loading.value = true;
    error.value = null;
    try {
      const res = await terminalsApi.queue();
      queue.value = res.data as TerminalQueueEntry[];
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? 'Failed to load terminal queue';
    } finally {
      loading.value = false;
    }
  }

  async function performAction(
    terminalId: string,
    tripId: string,
    action: string,
  ) {
    await terminalsApi.action(terminalId, tripId, action);
    await fetchQueue();
  }

  function subscribeToEvents() {
    try {
      const socket = getSocket();
      socket.on('trip.updated', () => fetchQueue());
      socket.on('truck.updated', () => fetchQueue());
    } catch { /* socket not ready */ }
  }

  return { queue, loading, error, fetchQueue, performAction, subscribeToEvents };
});
