<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();

onMounted(async () => {
  // Rehydrate user from stored token on page load
  if (auth.token) {
    await auth.fetchMe();
  }
});
</script>

<template>
  <RouterView />
</template>
