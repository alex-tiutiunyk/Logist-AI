<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAlertsStore } from '@/stores/alerts.store';

const route = useRoute();
const { t } = useI18n();
const alertsStore = useAlertsStore();

const navItems = computed(() => [
  { key: 'dashboard', path: '/dashboard', icon: 'dashboard' },
  { key: 'trips',     path: '/trips',     icon: 'trips'     },
  { key: 'terminals', path: '/terminals', icon: 'terminal'  },
  { key: 'alerts',    path: '/alerts',    icon: 'alerts'    },
]);

const isActive = (path: string) => route.path === path;
const unreadAlerts = computed(() => alertsStore.unacknowledgedCount);
</script>

<template>
  <aside class="flex flex-col w-56 shrink-0 bg-gray-900 text-gray-100">
    <!-- Brand -->
    <div class="flex items-center gap-2 px-4 py-5 border-b border-gray-700">
      <span class="text-2xl">🚛</span>
      <div>
        <div class="text-sm font-bold tracking-wide text-white">Logistics</div>
        <div class="text-xs text-gray-400">Manager Console</div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-2 py-4 space-y-1" aria-label="Main navigation">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
        :class="isActive(item.path)
          ? 'bg-brand-700 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        :aria-current="isActive(item.path) ? 'page' : undefined"
      >
        <!-- Dashboard icon -->
        <svg v-if="item.icon === 'dashboard'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <!-- Trips icon -->
        <svg v-else-if="item.icon === 'trips'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <!-- Terminal icon -->
        <svg v-else-if="item.icon === 'terminal'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <!-- Alerts icon -->
        <svg v-else-if="item.icon === 'alerts'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        <span class="flex-1">{{ t(`nav.${item.key}`) }}</span>

        <!-- Unread badge -->
        <span
          v-if="item.icon === 'alerts' && unreadAlerts > 0"
          class="flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold"
          aria-live="polite"
          :aria-label="`${unreadAlerts} ${t('alerts.title')}`"
        >
          {{ unreadAlerts > 99 ? '99+' : unreadAlerts }}
        </span>
      </RouterLink>
    </nav>

    <div class="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
      {{ t('nav.version') }}
    </div>
  </aside>
</template>
