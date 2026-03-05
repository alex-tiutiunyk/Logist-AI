<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
  loading?: boolean;
}>();
</script>

<template>
  <div class="card p-5">
    <div class="flex items-center justify-between mb-1">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ label }}</span>
      <slot name="icon" />
    </div>
    <div v-if="loading" class="h-8 w-20 bg-gray-200 animate-pulse rounded" />
    <div
      v-else
      class="text-3xl font-bold"
      :class="{
        'text-brand-600': !color || color === 'blue',
        'text-green-600': color === 'green',
        'text-red-600': color === 'red',
        'text-yellow-600': color === 'yellow',
        'text-gray-700': color === 'gray',
      }"
    >
      {{ value }}
    </div>
    <div v-if="sub" class="text-xs text-gray-500 mt-1">{{ sub }}</div>
  </div>
</template>
