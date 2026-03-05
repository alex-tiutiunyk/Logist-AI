<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { AlertSeverity, AlertType } from '@/types';

defineProps<{ type: AlertType; severity: AlertSeverity }>();

const { t } = useI18n();

const severityColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-700',
};
</script>

<template>
  <span class="badge" :class="severityColors[severity]">
    {{ t(`alertType.${type}`, type) }}
  </span>
</template>
