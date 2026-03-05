<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useLocale, type Locale } from '@/i18n';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();
const { locale, setLocale, availableLocales } = useLocale();

async function handleLogout() {
  auth.logout();
  await router.push('/login');
}
</script>

<template>
  <header class="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
    <!-- Page heading -->
    <h1 class="text-lg font-semibold text-gray-800">
      {{ $route.name }}
    </h1>

    <!-- Right side -->
    <div class="flex items-center gap-3">

      <!-- Language switcher -->
      <div class="flex items-center rounded-md overflow-hidden border border-gray-200" role="group" :aria-label="t('lang.en') + ' / ' + t('lang.uk')">
        <button
          v-for="loc in availableLocales"
          :key="loc"
          class="px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          :class="locale === loc
            ? 'bg-brand-600 text-white'
            : 'bg-white text-gray-500 hover:bg-gray-50'"
          :aria-pressed="locale === loc"
          @click="setLocale(loc as Locale)"
        >
          {{ loc.toUpperCase() }}
        </button>
      </div>

      <!-- User info -->
      <div class="text-right hidden sm:block">
        <div class="text-sm font-medium text-gray-900">{{ auth.user?.email }}</div>
        <div class="text-xs text-gray-500">{{ t(`role.${auth.user?.role ?? ''}`, auth.user?.role ?? '') }}</div>
      </div>

      <!-- Logout -->
      <button class="btn-secondary text-xs" :aria-label="t('topbar.logout')" @click="handleLogout">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {{ t('topbar.logout') }}
      </button>
    </div>
  </header>
</template>
