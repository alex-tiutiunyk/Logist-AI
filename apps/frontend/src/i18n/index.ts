import { createI18n } from 'vue-i18n';
import en from './locales/en';
import uk from './locales/uk';

export type Locale = 'en' | 'uk';

const STORAGE_KEY = 'locale';

function getInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored === 'en' || stored === 'uk') return stored;
  // Auto-detect from browser
  const browser = navigator.language.slice(0, 2);
  return browser === 'uk' ? 'uk' : 'en';
}

export const i18n = createI18n({
  legacy: false,          // use Composition API mode
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, uk },
});

export function setLocale(locale: Locale) {
  (i18n.global.locale as { value: Locale }).value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

export function useLocale() {
  return {
    locale: i18n.global.locale,
    setLocale,
    availableLocales: ['en', 'uk'] as Locale[],
  };
}
