<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Risk } from '@/types';

defineProps<{ risk: Risk }>();

const { t } = useI18n();
</script>

<template>
  <span v-if="risk === 'NONE'" class="badge bg-gray-100 text-gray-500">{{ t('risk.NONE') }}</span>
  <span v-else-if="risk === 'LATE'" class="badge bg-red-100 text-red-700 font-semibold">{{ t('risk.LATE') }}</span>
  <span v-else-if="risk === 'DWELL'" class="badge bg-orange-100 text-orange-700 font-semibold">{{ t('risk.DWELL') }}</span>
</template>
