<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const email = ref('manager@demo.com');
const password = ref('manager123');
const error = ref('');
const loading = ref(false);

const demoUsers = [
  { label: 'Admin',    email: 'admin@demo.com',    password: 'admin123'    },
  { label: 'Manager',  email: 'manager@demo.com',  password: 'manager123'  },
  { label: 'Operator', email: 'operator@demo.com', password: 'operator123' },
];

function fillDemo(user: typeof demoUsers[0]) {
  email.value = user.email;
  password.value = user.password;
}

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.push(redirect);
  } catch (e: unknown) {
    const axiosError = e as { response?: { data?: { message?: string } } };
    error.value = axiosError.response?.data?.message ?? t('login.errorFallback');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center text-5xl mb-4">🚛</div>
      <h1 class="text-center text-2xl font-bold text-gray-900">{{ t('login.title') }}</h1>
      <p class="mt-1 text-center text-sm text-gray-500">{{ t('login.subtitle') }}</p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="card p-8">
        <form class="space-y-5" @submit.prevent="handleLogin" novalidate>
          <div>
            <label for="email" class="label">{{ t('login.email') }}</label>
            <input id="email" v-model="email" type="email" autocomplete="email" required class="input" placeholder="you@example.com" />
          </div>

          <div>
            <label for="password" class="label">{{ t('login.password') }}</label>
            <input id="password" v-model="password" type="password" autocomplete="current-password" required class="input" />
          </div>

          <div v-if="error" class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
            {{ error }}
          </div>

          <button type="submit" class="btn-primary w-full justify-center py-2" :disabled="loading">
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ loading ? t('login.submitting') : t('login.submit') }}
          </button>
        </form>

        <!-- Demo quick-fill -->
        <div class="mt-6 pt-5 border-t border-gray-200">
          <p class="text-xs text-center text-gray-500 mb-3 font-medium">{{ t('login.demoFill') }}</p>
          <div class="flex gap-2 justify-center flex-wrap">
            <button v-for="u in demoUsers" :key="u.email" type="button" class="btn-secondary text-xs px-3 py-1" @click="fillDemo(u)">
              {{ u.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
