<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';
import { useAlertsStore } from '@/stores/alerts.store';
import { onMounted } from 'vue';

const alertsStore = useAlertsStore();

onMounted(() => {
  alertsStore.fetchAlerts();
  alertsStore.subscribeToEvents();
});
</script>

<template>
  <div class="flex h-full">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main content area -->
    <div class="flex flex-col flex-1 min-w-0">
      <Topbar />
      <main class="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
