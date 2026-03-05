import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/client';
import { initSocket, disconnectSocket } from '@/api/socket';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('access_token'));

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    token.value = res.data.accessToken;
    user.value = res.data.user as User;
    localStorage.setItem('access_token', res.data.accessToken);
    // Initialize WebSocket connection with the JWT token
    initSocket(res.data.accessToken);
    return user.value;
  }

  async function fetchMe() {
    if (!token.value) return;
    try {
      const res = await authApi.me();
      user.value = res.data as User;
      // Re-establish socket if we have a stored token (page reload scenario)
      initSocket(token.value);
    } catch {
      logout();
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('access_token');
    disconnectSocket();
  }

  return { user, token, isAuthenticated, login, logout, fetchMe };
});
