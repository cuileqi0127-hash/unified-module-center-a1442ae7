import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

const LANGUAGE_CACHE_KEY = 'app_i18n_language';

const supportedLngs = ['zh', 'en'] as const;
type SupportedLng = (typeof supportedLngs)[number];

function getCachedLanguage(): SupportedLng | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(LANGUAGE_CACHE_KEY);
    if (cached && supportedLngs.includes(cached as SupportedLng)) {
      return cached as SupportedLng;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCachedLanguage(lng: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_CACHE_KEY, lng);
  } catch {
    // ignore
  }
}

const initialLng = getCachedLanguage() ?? 'zh';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: 'zh',
    supportedLngs: [...supportedLngs],
    interpolation: {
      escapeValue: false,
    },
  });

// 语言切换时写入缓存，以便下次初始化使用
i18n.on('languageChanged', (lng) => {
  setCachedLanguage(lng);
});

export default i18n;
