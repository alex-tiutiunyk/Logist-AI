<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TruckStatus, TripStatus } from '@/types';

const props = defineProps<{
  status: TruckStatus | TripStatus | string;
  type?: 'truck' | 'trip';
}>();

const { t } = useI18n();

const truckColors: Record<string, string> = {
  IDLE: 'bg-gray-100 text-gray-700',
  EN_ROUTE: 'bg-blue-100 text-blue-700',
  LOADING: 'bg-amber-100 text-amber-700',
  UNLOADING: 'bg-orange-100 text-orange-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
};

const tripColors: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-600',
  EN_ROUTE: 'bg-blue-100 text-blue-700',
  ARRIVED_ORIGIN: 'bg-indigo-100 text-indigo-700',
  LOADING: 'bg-amber-100 text-amber-700',
  DEPARTED_ORIGIN: 'bg-cyan-100 text-cyan-700',
  ARRIVED_DEST: 'bg-purple-100 text-purple-700',
  UNLOADING: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELED: 'bg-red-100 text-red-700',
};

const colorMap = props.type === 'truck' ? truckColors : tripColors;
const ns = props.type === 'truck' ? 'status.truck' : 'status.trip';
</script>

<template>
  <span class="badge" :class="colorMap[status] ?? 'bg-gray-100 text-gray-600'">
    {{ t(`${ns}.${status}`, status) }}
  </span>
</template>
